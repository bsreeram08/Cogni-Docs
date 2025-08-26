import { randomUUID } from "crypto";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  JSONRPCMessageSchema,
  type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";
import type { Context } from "elysia";

export class SSEElysiaTransport implements Transport {
  private _sessionId: string;
  private _isConnected = false;
  private _encoder = new TextEncoder();
  private _stream: ReadableStream<Uint8Array>;
  private _controller!: ReadableStreamDefaultController<Uint8Array>;
  private _heartbeatTimer: number | undefined;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(private _endpoint: string, private _ctx: Context) {
    this._sessionId = randomUUID();

    this._stream = new ReadableStream({
      start: (controller) => {
        this._controller = controller;
      },
      cancel: () => {
        this._isConnected = false;
        // Stop heartbeat when stream is cancelled by client
        if (this._heartbeatTimer !== undefined) {
          clearInterval(this._heartbeatTimer);
          this._heartbeatTimer = undefined;
        }
        this.onclose?.();
      },
    });
  }

  async start(): Promise<void> {
    console.log(`[Transport:${this._sessionId}] Starting transport`);

    // If already started, don't do anything
    if (this._isConnected) {
      console.log(`[Transport:${this._sessionId}] Already started`);
      return;
    }

    try {
      // Set up the response with the stream (Context doesn't type 'response', cast to any)
      // Ensure proper SSE headers are present on the Response itself
      (this._ctx as any).response = new Response(this._stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
          // Prevent proxy buffering (e.g., nginx) which can break SSE
          "x-accel-buffering": "no",
        },
      });

      // Mark as connected
      this._isConnected = true;
      console.log(`[Transport:${this._sessionId}] Transport connected`);

      // Send endpoint event
      this._sendEvent(
        "endpoint",
        `${encodeURI(this._endpoint)}?sessionId=${this._sessionId}`
      );
      console.log(`[Transport:${this._sessionId}] Endpoint event sent`);

      // Start periodic heartbeat to keep the SSE connection alive
      // Sends an SSE comment line ": keep-alive" every 30 seconds
      this._heartbeatTimer = setInterval(() => {
        if (!this._isConnected) return;
        try {
          this._controller.enqueue(this._encoder.encode(`: keep-alive\n\n`));
        } catch (error) {
          console.error(
            `[Transport:${this._sessionId}] Error sending heartbeat:`,
            error
          );
          if (this._heartbeatTimer !== undefined) {
            clearInterval(this._heartbeatTimer as number);
            this._heartbeatTimer = undefined;
          }
          const wasConnected = this._isConnected;
          this._isConnected = false;
          if (wasConnected) this.onclose?.();
        }
      }, 30_000) as unknown as number;

      // Listen for client disconnect via request abort signal
      (this._ctx.request.signal as AbortSignal).addEventListener(
        "abort",
        () => {
          console.log(
            `[Transport:${this._sessionId}] Request aborted by client (disconnect)`
          );
          if (!this._isConnected) return;
          this._isConnected = false;
          if (this._heartbeatTimer !== undefined) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = undefined;
          }
          try {
            this._controller.close();
          } catch {}
          this.onclose?.();
        }
      );
    } catch (error) {
      console.error(
        `[Transport:${this._sessionId}] Error starting transport:`,
        error
      );
      this._isConnected = false;
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private _sendEvent(event: string, data: string): void {
    if (!this._isConnected) {
      console.error(
        `[Transport:${this._sessionId}] Cannot send event, not connected`
      );
      return;
    }

    try {
      this._controller.enqueue(
        this._encoder.encode(`event: ${event}\ndata: ${data}\n\n`)
      );
    } catch (error) {
      console.error(
        `[Transport:${this._sessionId}] Error sending event:`,
        error
      );
      if (this._heartbeatTimer !== undefined) {
        clearInterval(this._heartbeatTimer);
        this._heartbeatTimer = undefined;
      }
      const wasConnected = this._isConnected;
      this._isConnected = false;
      if (wasConnected) this.onclose?.();
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async handlePostMessage(ctx: Context): Promise<Response> {
    console.log(`[Transport:${this._sessionId}] Received message`);

    if (!this._isConnected) {
      console.error(`[Transport:${this._sessionId}] Not connected`);
      return new Response(
        JSON.stringify({ error: "SSE connection not established" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    try {
      // Handle the message
      await this.handleMessage(ctx.body);

      // Return success
      return new Response(JSON.stringify({ success: true }), {
        status: 202,
        headers: { "content-type": "application/json" },
      });
    } catch (error) {
      console.error(
        `[Transport:${this._sessionId}] Error handling message:`,
        error
      );
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  async handleMessage(message: unknown): Promise<void> {
    console.log(`[Transport:${this._sessionId}] Parsing message`);

    let parsedMessage: JSONRPCMessage;
    try {
      parsedMessage = JSONRPCMessageSchema.parse(message);
    } catch (error) {
      console.error(
        `[Transport:${this._sessionId}] Invalid message format:`,
        error
      );
      this.onerror?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    console.log(`[Transport:${this._sessionId}] Forwarding message to handler`);
    this.onmessage?.(parsedMessage);
  }

  async close(): Promise<void> {
    console.log(`[Transport:${this._sessionId}] Closing transport`);

    this._isConnected = false;
    // Stop heartbeat on close
    if (this._heartbeatTimer !== undefined) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = undefined;
    }
    this.onclose?.();
  }

  async send(message: JSONRPCMessage): Promise<void> {
    console.log(`[Transport:${this._sessionId}] Sending message`);

    if (!this._isConnected) {
      console.error(`[Transport:${this._sessionId}] Not connected`);
      throw new Error("Not connected");
    }

    this._sendEvent("message", JSON.stringify(message));
  }

  get sessionId(): string {
    return this._sessionId;
  }
}
