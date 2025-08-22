/**
 * MCP Server for Documentation Querying with Flexible Backend
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getStorageService,
  getEmbeddingService,
} from "../services/service-provider.js";
import { SSEElysiaTransport } from "../utils/sse-elysia.js";
import Elysia from "elysia";
import staticPlugin from "@elysiajs/static";
import { existsSync } from "fs";

// Store active transports by session ID
const transports: Map<string, SSEElysiaTransport> = new Map();

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
            }\n  Created: ${set.created_at}`
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
    }
  );

  // Tool: Search documentation
  server.registerTool(
    "search_documentation",
    {
      title: "Search Documentation",
      description: "Search for information within a specific documentation set",
      inputSchema: {
        setId: z.string().describe("The ID of the documentation set to search"),
        query: z
          .string()
          .describe("The question or query to answer using documentation"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe(
            "Maximum number of search results to use as context (default: 10)"
          ),
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
        const results = await storageService.searchDocuments(
          setId,
          queryEmbedding,
          k
        );

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
              `**Result ${index + 1}** (Score: ${result.similarity.toFixed(
                3
              )})\n` +
              `Document ID: ${result.metadata.document_id ?? "(unknown)"}\n` +
              `Chunk ID: ${result.id}\n\n` +
              `${result.content}\n\n---`
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
    }
  );

  // Tool: Get documentation set info
  server.registerTool(
    "get_documentation_set",
    {
      title: "Get Documentation Set Info",
      description:
        "Get detailed information about a specific documentation set",
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
    }
  );

  // Tool: Agentic search with Gemini
  server.registerTool(
    "agentic_search",
    {
      title: "Agentic Documentation Search (extractive)",
      description:
        "Generate an extractive answer from top documentation search results (no external LLM required)",
      inputSchema: {
        setId: z.string().describe("The ID of the documentation set to search"),
        query: z
          .string()
          .describe("The question or query to answer using documentation"),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe(
            "Maximum number of search results to use as context (default: 10)"
          ),
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
        const results = await storageService.searchDocuments(
          setId,
          queryEmbedding,
          k
        );

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
        const snippet =
          top.content.length > 800
            ? `${top.content.slice(0, 800)}...`
            : top.content;

        const responseText =
          `**Question:** ${query}\n\n` +
          `**Proposed answer (extractive):** ${snippet}\n\n` +
          `---\n\n` +
          `*Based on ${
            results.length
          } documentation source(s) from ${setName}. Top score: ${top.similarity.toFixed(
            3
          )}*`;

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
    }
  );

  // Only serve static assets if ./public exists
  if (existsSync("./public")) {
    app.use(
      staticPlugin({
        assets: "./public",
        prefix: "/",
      })
    );
  }

  // Basic info route
  app
    .get("/", () => ({
      name: "Bun Elysia MCP Server",
      version: "1.0.0",
      description: "Model Context Protocol server using Bun and Elysia",
      endpoints: {
        "/": "This info",
        "/sse": "SSE endpoint for MCP connections",
        "/messages": "Message endpoint for MCP clients",
      },
    }))
    .get("/sse", async (context) => {
      console.log("SSE connection requested");

      try {
        context.set.headers["content-type"] = "text/event-stream";
        context.set.headers["cache-control"] = "no-cache";
        context.set.headers["connection"] = "keep-alive";

        console.log("Headers set for SSE connection");

        try {
          // Create the transport
          console.log("Creating transport");
          const { set, request } = context;
          const transport = new SSEElysiaTransport("/messages", context);
          console.log(
            `Transport created with sessionId: ${transport.sessionId}`
          );

          // Store the transport
          console.log("Storing transport in map");
          transports.set(transport.sessionId, transport);
          console.log(`Transports map size: ${transports.size}`);

          // Ensure SSE stream is started and headers are set before connecting server
          console.log("Starting transport (SSE stream)");
          await transport.start();

          // Connect to MCP server
          console.log("Connecting to MCP server");
          await server.connect(transport);
          console.log("Connected to MCP server");

          console.log("SSE connection successful");
          // Return the response set by the transport
          // @ts-ignore
          return context.response;
        } catch (error) {
          const transportError = error as Error;
          console.error("Transport/connection error:", transportError);
          console.error(transportError.stack);

          // Try to send a proper error response
          return new Response(
            JSON.stringify({
              error: "Transport error",
              message: transportError.message,
              stack: transportError.stack,
            }),
            {
              status: 500,
              headers: { "content-type": "application/json" },
            }
          );
        }
      } catch (error) {
        const outerError = error as Error;
        console.error("Outer error in SSE handler:", outerError);
        console.error(outerError.stack);

        // Last resort error handler
        return new Response(
          JSON.stringify({
            error: "Server error",
            message: outerError.message,
            stack: outerError.stack,
          }),
          {
            status: 500,
            headers: { "content-type": "application/json" },
          }
        );
      }
    })
    // Handle messages
    .post("/messages", async (context) => {
      try {
        // Get session ID
        const url = new URL(context.request.url);
        const sessionId = url.searchParams.get("sessionId");

        if (!sessionId || !transports.has(sessionId)) {
          return new Response(
            JSON.stringify({ error: "Invalid or missing session ID" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Get transport and handle message
        const transport = transports.get(sessionId);
        return transport.handlePostMessage(context);
      } catch (error) {
        console.error("Error handling message:", error);
        return new Response(
          JSON.stringify({ error: "Internal server error" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    });
}
