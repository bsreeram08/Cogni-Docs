/**
 * MCP Server for Documentation Querying with Flexible Backend
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getStorageService, getEmbeddingService } from "../services/service-provider.js";
import { ElysiaStreamingHttpTransport } from "../utils/sse-elysia.js";
import Elysia from "elysia";
import staticPlugin from "@elysiajs/static";
import { existsSync } from "fs";
import { logger } from "../utils/logger.js";

// Store active transports by session ID
const transports: Map<string, ElysiaStreamingHttpTransport> = new Map();

export function startMcpServer(app: Elysia) {
  const server = new McpServer({
    name: "documentation-mcp",
    version: "1.0.0",
  });

  // Tool: List documentation sets
  server.registerTool(
    "list_documentation_sets",
    {
      title: "List Documentation Sets",
      description: "List all available documentation sets",
      inputSchema: {},
    },
    async () => {
      const storageService = getStorageService();
      const sets = await storageService.listDocumentSets();

      const setsText = sets
        .map(
          (set) =>
            `• **${set.name}** (ID: ${set.id})\n  ${
              set.description || "No description"
            }\n  Created: ${set.created_at}`,
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text:
              sets.length > 0
                ? `Found ${sets.length} documentation set(s):\n\n${setsText}`
                : "No documentation sets found. Create one using the upload server first.",
          },
        ],
      };
    },
  );

  // Tool: Search documentation
  server.registerTool(
    "search_documentation",
    {
      title: "Search Documentation",
      description: "Search for information within a specific documentation set",
      inputSchema: {
        setId: z.string().describe("The ID of the documentation set to search"),
        query: z.string().describe("The question or query to answer using documentation"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of search results to use as context (default: 10)"),
      },
    },
    async ({ setId, query, limit }) => {
      try {
        // New flow: embed query then search via storage service
        const embeddingService = getEmbeddingService();
        const storageService = getStorageService();
        const { embeddings } = await embeddingService.generateEmbeddings({
          texts: [query],
        });
        const queryEmbedding = embeddings[0];
        const k = typeof limit === "number" ? limit : 10;
        const results = await storageService.searchDocuments(setId, queryEmbedding, k);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No relevant documentation found for query: "${query}" in set ${setId}`,
              },
            ],
          };
        }

        const resultsText = results
          .map(
            (result, index) =>
              `**Result ${index + 1}** (Score: ${result.similarity.toFixed(3)})\n` +
              `Document ID: ${result.metadata.document_id ?? "(unknown)"}\n` +
              `Chunk ID: ${result.id}\n\n` +
              `${result.content}\n\n---`,
          )
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} relevant result(s) for "${query}":\n\n${resultsText}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching documentation: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    },
  );

  // Tool: Get documentation set info
  server.registerTool(
    "get_documentation_set",
    {
      title: "Get Documentation Set Info",
      description: "Get detailed information about a specific documentation set",
      inputSchema: {
        setId: z.string().describe("The ID of the documentation set"),
      },
    },
    async ({ setId }) => {
      try {
        const storageService = getStorageService();
        const docSet = await storageService.getDocumentSet(setId);

        if (!docSet) {
          return {
            content: [
              {
                type: "text",
                text: `Documentation set with ID ${setId} not found.`,
              },
            ],
          };
        }

        const infoText =
          `**${docSet.name}**\n\n` +
          `ID: ${docSet.id}\n` +
          `Description: ${docSet.description || "No description"}\n` +
          `Created: ${docSet.created_at}`;

        return {
          content: [
            {
              type: "text",
              text: infoText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error retrieving documentation set: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    },
  );

  // Tool: Agentic search (extractive, provider-agnostic)
  server.registerTool(
    "agentic_search",
    {
      title: "Agentic Documentation Search (extractive)",
      description:
        "Generate an extractive answer from top documentation search results (no external LLM required)",
      inputSchema: {
        setId: z.string().describe("The ID of the documentation set to search"),
        query: z.string().describe("The question or query to answer using documentation"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of search results to use as context (default: 10)"),
      },
    },
    async ({ setId, query, limit }) => {
      try {
        const embeddingService = getEmbeddingService();
        const storageService = getStorageService();

        // Get documentation set info for context
        const docSet = await storageService.getDocumentSet(setId);
        const setName = docSet?.name || "documentation";

        // Search for relevant documentation
        const { embeddings } = await embeddingService.generateEmbeddings({
          texts: [query],
        });
        const queryEmbedding = embeddings[0];
        const k = typeof limit === "number" ? limit : 10;
        const results = await storageService.searchDocuments(setId, queryEmbedding, k);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No relevant documentation found for query: "${query}" in set ${setName}. Please try a different search term or upload relevant documentation first.`,
              },
            ],
          };
        }

        // Simple extractive answer: take top result snippet
        const top = results[0];
        const snippet = top.content.length > 800 ? `${top.content.slice(0, 800)}...` : top.content;

        const responseText =
          `**Question:** ${query}\n\n` +
          `**Proposed answer (extractive):** ${snippet}\n\n` +
          `---\n\n` +
          `*Based on ${
            results.length
          } documentation source(s) from ${setName}. Top score: ${top.similarity.toFixed(3)}*`;

        return {
          content: [
            {
              type: "text",
              text: responseText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error during agentic search: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    },
  );

  // Only serve static assets if ./public exists
  if (existsSync("./public")) {
    app.use(
      staticPlugin({
        assets: "./public",
        prefix: "/",
      }),
    );
  }

  // List active session IDs (debug)
  app.get("/sessions", () => {
    const sessions = Array.from(transports.keys());
    return new Response(JSON.stringify(sessions), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  // Streamable HTTP MCP endpoint (preferred)
  app
    .get("/mcp", () => {
      return new Response(JSON.stringify({ error: "Method Not Allowed. Use POST /mcp." }), {
        status: 405,
        headers: {
          "content-type": "application/json",
          allow: "POST, DELETE",
        },
      });
    })
    .post("/mcp", async (context) => {
      // Prefer request-scoped reqId if derived earlier, else generate
      const reqId: string = (context as any).reqId ?? crypto.randomUUID();
      const started = Date.now();
      context.set.headers = {
        ...(context.set.headers as Record<string, string> | undefined),
        "X-Request-Id": reqId,
      };
      try {
        const body = context.body as unknown;
        const messages = Array.isArray(body) ? body : [body];
        const isInit = messages.some(
          (m: any) => m && typeof m === "object" && m.method === "initialize",
        );

        if (isInit) {
          // New session: create transport, connect server, store on session init
          const transport = new ElysiaStreamingHttpTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            enableJsonResponse: true,
            onsessioninitialized: (sessionId) => {
              transports.set(sessionId, transport);
              logger.info(
                { reqId, sessionId, activeSessions: transports.size },
                "mcp session initialized",
              );
            },
          });
          await server.connect(transport);
          logger.info({ reqId }, "mcp initialize request");
          return await transport.handleRequest(context as any);
        }

        // Subsequent request: require Mcp-Session-Id header
        const sessionId = context.request.headers.get("mcp-session-id") ?? undefined;
        if (!sessionId) {
          return new Response(JSON.stringify({ error: "Missing Mcp-Session-Id" }), {
            status: 400,
            headers: {
              "content-type": "application/json",
              "X-Request-Id": reqId,
            },
          });
        }
        const transport = transports.get(sessionId);
        if (!transport) {
          return new Response(JSON.stringify({ error: "Session not found" }), {
            status: 404,
            headers: {
              "content-type": "application/json",
              "X-Request-Id": reqId,
            },
          });
        }
        logger.info({ reqId, sessionId }, "mcp request");
        return await transport.handleRequest(context as any);
      } catch (error) {
        logger.error({ reqId, err: error }, "error handling POST /mcp");
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: {
            "content-type": "application/json",
            "X-Request-Id": reqId,
          },
        });
      } finally {
        const ms = Date.now() - started;
        logger.info({ reqId, durationMs: ms }, "mcp request completed");
      }
    })
    .delete("/mcp", async (context) => {
      const reqId: string = (context as any).reqId ?? crypto.randomUUID();
      context.set.headers = {
        ...(context.set.headers as Record<string, string> | undefined),
        "X-Request-Id": reqId,
      };
      try {
        const sessionId = context.request.headers.get("mcp-session-id");
        if (!sessionId) {
          return new Response(JSON.stringify({ error: "Missing Mcp-Session-Id" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        const transport = transports.get(sessionId);
        if (!transport) {
          return new Response(JSON.stringify({ error: "Session not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
        await transport.close();
        transports.delete(sessionId);
        logger.info({ reqId, sessionId }, "mcp session closed");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (error) {
        logger.error({ reqId, err: error }, "error handling DELETE /mcp");
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
    });
}
