import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  isJSONRPCError,
  isJSONRPCRequest,
  isJSONRPCResponse,
  type JSONRPCError as JSONRPCErrorRaw,
  JSONRPCMessageSchema,
  SUPPORTED_PROTOCOL_VERSIONS,
  type JSONRPCMessage,
  type RequestId,
} from "@modelcontextprotocol/sdk/types.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.d.ts";
import type { Context } from "elysia";
import { logger } from "../utils/logger.js";

interface StreamableHTTPServerTransportOptions {
  /**
   * Function that generates a session ID for the transport.
   * The session ID SHOULD be globally unique and cryptographically secure (e.g., a securely generated UUID, a JWT, or a cryptographic hash)
   *
   * Return undefined to disable session management.
   */
  sessionIdGenerator: (() => string) | undefined;

  /**
   * A callback for session initialization events
   * This is called when the server initializes a new session.
   * Useful in cases when you need to register multiple mcp sessions
   * and need to keep track of them.
   * @param sessionId The generated session ID
   */
  onsessioninitialized?: (sessionId: string) => void;

  /**
   * If true, the server will return JSON responses instead of starting an SSE stream.
   * This can be useful for simple request/response scenarios without streaming.
   * Default is false (SSE streams are preferred).
   */
  enableJsonResponse?: boolean;

  /**
   * Event store for resumability support
   * If provided, resumability will be enabled, allowing clients to reconnect and resume messages
   */
  eventStore?: EventStore;

  enableLogging?: boolean;
}
type McpContext = Context & { store?: { authInfo?: AuthInfo } };
type StreamId = string;
type EventId = string;
type JSONRPCError = Omit<JSONRPCErrorRaw, "id"> & { id: null };
interface EventStore {
  /**
   * Stores an event for later retrieval
   * @param streamId ID of the stream the event belongs to
   * @param message The JSON-RPC message to store
   * @returns The generated event ID for the stored event
   */
  storeEvent(streamId: StreamId, message: JSONRPCMessage): Promise<EventId>;

  replayEventsAfter(
    lastEventId: EventId,
    {
      send,
    }: {
      send: (eventId: EventId, message: JSONRPCMessage) => Promise<void>;
    }
  ): Promise<StreamId>;
}

/**
 * Configuration options for StreamableHTTPServerTransport
 */
export class ElysiaStreamingHttpTransport implements Transport {
  private _started = false;
  private _initialized = false;
  private _streamMapping = new Map<
    string,
    {
      ctx: McpContext;
      stream?: AsyncGenerator<string | string[]>;
      resolve?: (data: JSONRPCMessage | JSONRPCMessage[] | null) => void;
    }
  >();
  private _requestToStreamMapping = new Map<RequestId, string>();
  private _requestResponseMap = new Map<RequestId, JSONRPCMessage>();
  private _standaloneSseStreamId = "_GET_stream";

  sessionId?: string;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: unknown }) => void;
  sessionIdGenerator: (() => string) | undefined;
  _enableJsonResponse: boolean;
  _eventStore: EventStore | undefined;
  _onsessioninitialized: ((sessionId: string) => void) | undefined;

  private _messageQueue: string[] = [];
  private _eventIdToMessageMap: Map<string, JSONRPCMessage> = new Map();
  private _streamIdToEventIdsMap: Map<string, string[]> = new Map();

  constructor(options: StreamableHTTPServerTransportOptions) {
    this.sessionIdGenerator = options.sessionIdGenerator;
    this._enableJsonResponse = options.enableJsonResponse ?? false;
    this._eventStore = options.eventStore;
    this._onsessioninitialized = options.onsessioninitialized;
  }

  async start(): Promise<void> {
    if (this._started) {
      throw new Error("Transport already started");
    }
    this._started = true;
    logger.info(`[Transport] Starting transport`);
  }

  private writeSSEEvent(
    stream: AsyncGenerator<string | string[]>,
    message: JSONRPCMessage,
    eventId?: string
  ): boolean {
    try {
      let eventData = `event: message\n`;
      if (eventId) {
        eventData += `id: ${eventId}\n`;
      }
      eventData += `data: ${JSON.stringify(message)}\n\n`;

      // Queue the event for streaming
      this._messageQueue.push(eventData);
      return true;
    } catch (error) {
      console.error(`[Transport] Error writing SSE event:`, error);
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  // Generator function for Elysia streaming
  async *stream(): AsyncGenerator<string | string[], void, unknown> {
    try {
      while (this._started) {
        if (this._messageQueue.length > 0) {
          const messagesToSend: string[] = [];
          do {
            const message = this._messageQueue.shift();
            if (message) {
              messagesToSend.push(message);
            }
          } while (this._messageQueue.length > 0);
          if (messagesToSend.length === 1) {
            yield messagesToSend[0];
          } else {
            yield messagesToSend;
          }
        }
        // Small delay to prevent tight loop
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } finally {
      // generator cancelled
    }
  }

  async handleRequest(context: McpContext) {
    const { request } = context;
    const method = request.method;
    //stateless mode only accepts POST requests
    if (this.sessionIdGenerator === undefined && method !== "POST") {
      return this.handleUnsupportedRequest(context);
    }
    switch (method) {
      case "GET":
        return this.handleGetRequest(context);
      case "POST":
        return this.handlePostRequest(context);
      case "DELETE":
        return this.handleDeleteRequest(context);
      default:
        return this.handleUnsupportedRequest(context);
    }
  }

  protected async handleGetRequest(context: McpContext) {
    const { set } = context;
    const acceptHeader = context.request.headers.get("accept") || "";
    if (!acceptHeader?.includes("text/event-stream")) {
      set.status = 406;
      return {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Not Acceptable: Client must accept text/event-stream",
        },
        id: null,
      };
    }

    // Do not require prior initialization for GET /sse.
    // If sessions are enabled and no session exists yet, generate one now.
    if (this.sessionId === undefined && this.sessionIdGenerator) {
      this.sessionId = this.sessionIdGenerator();
      if (this.sessionId) {
        this._onsessioninitialized?.(this.sessionId);
      }
    }

    // Handle resumability: check for Last-Event-ID header
    if (this._eventStore) {
      const lastEventId =
        context.request.headers.get("last-event-id") || undefined;
      if (lastEventId) {
        return await this.replayEvents(lastEventId, context);
      }
    }

    const path = context.request.url;
    const url = new URL(path);

    if (path.includes("/resources")) {
      const resourcePath = url.searchParams.get("uri");
      if (resourcePath) {
        logger.info(`Direct resource access: ${resourcePath}`);
      }
    } else if (path.includes("/prompts")) {
      const promptName = url.searchParams.get("name");
      if (promptName) {
        logger.info(`Direct prompt access: ${promptName}`);
      } else {
        logger.info(`Direct prompts listing`);
      }
    }

    set.headers = {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    };

    if (this.sessionId !== undefined) {
      set.headers["Mcp-Session-Id"] = this.sessionId;
    }

    if (this._streamMapping.get(this._standaloneSseStreamId) !== undefined) {
      set.status = 409;
      return {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Conflict: Only one SSE stream is allowed per session",
        },
        id: null,
      };
    }

    set.status = 200;

    const streamGen = this.stream();
    this._streamMapping.set(this._standaloneSseStreamId, {
      ctx: context,
      stream: streamGen,
    });
    // Send an initial event so clients see data immediately and keep the
    // connection open. Also advertise the POST endpoint.
    if (this.sessionId) {
      const messagesUrl = `${
        url.origin
      }/messages?sessionId=${encodeURIComponent(this.sessionId)}`;
      this._messageQueue.push(`event: endpoint\ndata: ${messagesUrl}\n\n`);
    } else {
      this._messageQueue.push(`: open\n\n`);
    }
    const self = this;
    const streamId = this._standaloneSseStreamId;
    // Heartbeat to keep SSE connection alive (every 15s)
    const heartbeat = setInterval(() => {
      if (self._started) {
        self._messageQueue.push(`: heartbeat ${Date.now()}\n\n`);
      }
    }, 15000);
    return (async function* () {
      try {
        for await (const chunk of streamGen) {
          yield chunk as string | string[];
        }
      } finally {
        clearInterval(heartbeat);
        // cleanup mapping when client disconnects
        self._streamMapping.delete(streamId);
      }
    })();
  }

  async handlePostRequest(context: McpContext) {
    const { request, set, body } = context;

    try {
      const acceptHeader = request.headers.get("accept") || "";
      // For POST, allow */* or application/json; do not require text/event-stream
      if (
        acceptHeader &&
        acceptHeader !== "*/*" &&
        !acceptHeader.includes("application/json")
      ) {
        set.status = 406;
        return {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Not Acceptable: Client must accept application/json",
          },
          id: null,
        };
      }

      const ct = request.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) {
        set.status = 415;
        return {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message:
              "Unsupported Media Type: Content-Type must be application/json",
          },
          id: null,
        };
      }

      const rawMessage = body;

      const messages: JSONRPCMessage[] = Array.isArray(rawMessage)
        ? rawMessage.map((msg) => JSONRPCMessageSchema.parse(msg))
        : [JSONRPCMessageSchema.parse(rawMessage)];

      // Robustly detect initialize request without relying on SDK helper
      const isInitializationRequest = messages.some(
        (m) => isJSONRPCRequest(m) && m.method === "initialize"
      );
      if (isInitializationRequest) {
        if (this._initialized && this.sessionId !== undefined) {
          set.status = 400;
          return {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid Request: Server already initialized",
            },
            id: null,
          };
        }
        if (messages.length > 1) {
          set.status = 400;
          return {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message:
                "Invalid Request: Only one initialization request is allowed",
            },
            id: null,
          };
        }
        // If sessionId already exists (from GET /sse), keep it.
        if (!this.sessionId) {
          this.sessionId = this.sessionIdGenerator?.();
          if (this.sessionId) {
            this._onsessioninitialized?.(this.sessionId);
          }
        }
        this._initialized = true;
      }

      const { valid, status, response } = this.validateSession(context);
      if (!isInitializationRequest && !valid) {
        set.status = status;
        return response;
      }

      const hasRequests = messages.some(isJSONRPCRequest);
      if (!hasRequests) {
        // if it only contains notifications or responses, return 202
        set.status = 202;
        for (const message of messages) {
          this.logMessage(message);
          this.onmessage?.(message, { authInfo: context.store?.authInfo });
        }
        return;
      }

      const streamId = Bun.randomUUIDv7();

      if (this._enableJsonResponse) {
        // Set headers for JSON response
        set.headers = {
          ...(set.headers as Record<string, string> | undefined),
          "content-type": "application/json",
        };
        if (this.sessionId !== undefined) {
          set.headers["Mcp-Session-Id"] = this.sessionId;
        }
        set.status = 200;

        const resultPromise = new Promise<
          JSONRPCMessage | JSONRPCMessage[] | null
        >((resolve) => {
          this._streamMapping.set(streamId, {
            ctx: context,
            resolve: resolve,
          });
        });

        for (const message of messages) {
          if (isJSONRPCRequest(message)) {
            this._requestToStreamMapping.set(message.id, streamId);
          }
          this.logMessage(message);
          this.onmessage?.(message, { authInfo: context.store?.authInfo });
        }
        return resultPromise;
      }

      // Else (if _enableJsonResponse is false), handle as SSE stream
      set.headers = {
        ...(set.headers as Record<string, string> | undefined),
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      };
      if (this.sessionId !== undefined) {
        set.headers["Mcp-Session-Id"] = this.sessionId;
      }
      set.status = 200;

      const streamGen = this.stream();
      this._streamMapping.set(streamId, { ctx: context, stream: streamGen });

      for (const message of messages) {
        if (isJSONRPCRequest(message)) {
          this._requestToStreamMapping.set(message.id, streamId);
        }
        this.logMessage(message);
        this.onmessage?.(message, { authInfo: context.store?.authInfo });
      }

      const keepAlive = setInterval(() => {
        const currentStream = this._streamMapping.get(streamId)?.stream;
        if (this._started && currentStream) {
          this.writeSSEEvent(currentStream, {
            jsonrpc: "2.0",
            method: "ping",
            params: {},
            id: "ping",
          });
        }
      }, 30000);
      const self = this;
      return (async function* () {
        try {
          for await (const chunk of streamGen) {
            yield chunk as string | string[];
          }
        } finally {
          clearInterval(keepAlive);
          self._streamMapping.delete(streamId);
        }
      })();
    } catch (error) {
      set.status = 400;
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      console.error("Error handling MCP request", JSON.stringify(error));
      return {
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error",
          data: String(error),
        },
        id: null,
      };
    }
  }

  protected async handleDeleteRequest(context: McpContext) {
    const { request, set } = context;
    const { valid, status, response } = this.validateSession(context);
    if (!valid) {
      set.status = status;
      return response;
    }
    await this.close();
    set.status = 200;
  }

  protected async handleUnsupportedRequest({
    set,
  }: Context): Promise<JSONRPCError> {
    set.status = 405;
    set.headers = {
      Allow: "GET, POST, DELETE",
    };
    return {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    };
  }

  private validateSession({ request }: Context): {
    valid: boolean;
    status?: number;
    response?: JSONRPCError;
  } {
    if (this.sessionIdGenerator === undefined) {
      return { valid: true, status: 200 };
    }
    if (!this._initialized) {
      return {
        valid: false,
        status: 400,
        response: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: Server not initialized",
          },
          id: null,
        },
      };
    }

    // Support session ID via header or query parameter (?sessionId=...)
    const headerSessionId = request.headers.get("mcp-session-id");
    const url = new URL(request.url);
    const querySessionId = url.searchParams.get("sessionId");
    const sessionId = headerSessionId ?? querySessionId ?? undefined;

    if (!sessionId) {
      return {
        valid: false,
        status: 400,
        response: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message:
              "Bad Request: Mcp-Session-Id header or sessionId query parameter is required",
          },
          id: null,
        },
      };
    }

    if (Array.isArray(sessionId)) {
      return {
        valid: false,
        status: 400,
        response: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message:
              "Bad Request: Mcp-Session-Id header must be a single value",
          },
          id: null,
        },
      };
    }

    if (sessionId !== this.sessionId) {
      return {
        valid: false,
        status: 404,
        response: {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Session not found",
          },
          id: null,
        },
      };
    }

    const protocolVersion = request.headers.get("mcp-protocol-version");

    if (
      protocolVersion &&
      !SUPPORTED_PROTOCOL_VERSIONS.includes(protocolVersion)
    ) {
      return {
        valid: false,
        status: 400,
        response: {
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: Unsupported protocol version",
          },
          id: null,
        },
      };
    }

    return { valid: true, status: 200 };
  }

  async close(): Promise<void> {
    this._streamMapping.clear();
    this._requestResponseMap.clear();
    this._requestToStreamMapping.clear();
    this._eventIdToMessageMap.clear();
    this._streamIdToEventIdsMap.clear();
    this._started = false;
    this.onclose?.();
  }

  async send(
    message: JSONRPCMessage,
    options?: { relatedRequestId?: RequestId }
  ): Promise<void> {
    const requestId =
      options?.relatedRequestId ??
      (isJSONRPCResponse(message) || isJSONRPCError(message)
        ? (message as { id?: RequestId }).id
        : undefined);

    if (requestId === undefined) {
      if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
        throw new Error("Cannot send a response on a standalone SSE stream");
      }
      const standaloneSse = this._streamMapping.get(
        this._standaloneSseStreamId
      );
      if (standaloneSse === undefined) {
        return;
      }

      // Generate and store event ID if event store is provided
      const eventId = await this.storeEvent(
        this._standaloneSseStreamId,
        message
      );
      console.debug(
        `sending message RequestId: ${requestId} EventId: ${eventId} Message: ${JSON.stringify(
          message
        )}`
      );
      if (standaloneSse.stream) {
        this.writeSSEEvent(standaloneSse.stream, message, eventId);
      }
      return;
    }

    const streamId = this._requestToStreamMapping.get(requestId);
    if (!streamId) {
      throw new Error(
        `No connection established for request ID: ${String(requestId)}`
      );
    }

    const stream = this._streamMapping.get(streamId);
    if (!stream) {
      throw new Error(`No stream found for stream ID: ${streamId}`);
    }

    if (!this._enableJsonResponse) {
      // Generate and store event ID if event store is provided
      const eventId = await this.storeEvent(streamId, message);
      if (stream.stream) {
        this.writeSSEEvent(stream.stream, message, eventId);
      }
    }

    if (isJSONRPCResponse(message) || isJSONRPCError(message)) {
      this._requestResponseMap.set(requestId, message);
      const relatedIds = Array.from(this._requestToStreamMapping.entries())
        .filter(([_, sid]) => this._streamMapping.get(sid) === stream)
        .map(([id]) => id);

      const allResponsesReady = relatedIds.every((id) =>
        this._requestResponseMap.has(id)
      );

      if (allResponsesReady) {
        if (this._enableJsonResponse) {
          // All responses ready, send as JSON
          const headers: Record<string, string> = {
            "content-type": "application/json",
          };
          if (this.sessionId !== undefined) {
            headers["mcp-session-id"] = this.sessionId;
          }

          const responses = relatedIds
            .map((id) => this._requestResponseMap.get(id))
            .filter((response) => response !== undefined);

          if (responses.length === 0) {
            stream.resolve?.(null);
          } else if (responses.length === 1) {
            stream.resolve?.(responses[0]);
          } else {
            stream.resolve?.(responses);
          }
        } else {
          if (stream.stream) {
            stream.stream.return(null);
          }
        }
        for (const id of relatedIds) {
          this._requestResponseMap.delete(id);
          this._requestToStreamMapping.delete(id);
        }
      }
    }
  }

  private async storeEvent(
    streamId: string,
    message: JSONRPCMessage
  ): Promise<string | undefined> {
    if (!this._eventStore) {
      return undefined;
    }

    try {
      const eventId = await this._eventStore.storeEvent(streamId, message);
      this._eventIdToMessageMap.set(eventId, message);

      // Track event IDs per stream for replay
      const eventIds = this._streamIdToEventIdsMap.get(streamId) || [];
      eventIds.push(eventId);
      this._streamIdToEventIdsMap.set(streamId, eventIds);

      return eventId;
    } catch (error) {
      console.error(`[Transport] Error storing event:`, error);
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      return undefined;
    }
  }

  private async replayEvents(
    lastEventId: string,
    context: McpContext
  ): Promise<AsyncGenerator<string | string[]> | void> {
    if (!this._eventStore) {
      return;
    }

    try {
      const setHeaders: Record<string, string> = {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
      };
      if (this.sessionId !== undefined) {
        setHeaders["mcp-session-id"] = this.sessionId;
      }
      context.set.headers = setHeaders;
      context.set.status = 200;

      const streamGen = this.stream();
      const streamId = await this._eventStore.replayEventsAfter(lastEventId, {
        send: async (eventId: string, message: JSONRPCMessage) => {
          //this.logger.debug('send replay event', eventId, JSON.stringify(message));
          if (!this.writeSSEEvent(streamGen, message, eventId)) {
            this.onerror?.(new Error("Failed to replay events"));
            return;
          }
        },
      });

      this._streamMapping.set(streamId, { ctx: context, stream: streamGen });
      const self = this;
      return (async function* () {
        try {
          for await (const chunk of streamGen) {
            yield chunk as string | string[];
          }
        } finally {
          self._streamMapping.delete(streamId);
        }
      })();
    } catch (error) {
      console.error(`[Transport] Error replaying events:`, error);
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private logMessage(message: JSONRPCMessage) {
    if ("method" in message) {
      logger.info(
        `method: ${message.method} ${
          message.params ? "params: " + JSON.stringify(message.params) : ""
        }`
      );
    }
  }
}
