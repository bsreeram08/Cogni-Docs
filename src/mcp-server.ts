/**
 * MCP Server for Documentation Querying with Flexible Backend
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getStorageService,
  getEmbeddingService,
  getConfig,
  healthCheck,
} from "./services/service-provider.js";
import { getQueryService } from "./services/query-service.js";
import { getGeminiService } from "./services/gemini-service.js";
import { SSEElysiaTransport } from "./utils/sse-elysia.js";
import Elysia from "elysia";
import staticPlugin from "@elysiajs/static";

const server = new McpServer({
  name: "documentation-mcp",
  version: "1.0.0",
});

// Store active transports by session ID
const transports = new Map();

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
      const queryService = getQueryService();
      const response = await queryService.searchDocumentation({
        setId,
        query,
        limit,
      });

      if (response.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No relevant documentation found for query: "${query}" in set ${setId}`,
            },
          ],
        };
      }

      const resultsText = response.results
        .map(
          (result, index) =>
            `**Result ${index + 1}** (Score: ${result.score.toFixed(3)})\n` +
            `Document ID: ${result.documentId}\n` +
            `Chunk ID: ${result.chunkId}\n\n` +
            `${result.text}\n\n---`
        )
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${response.results.length} relevant result(s) for "${query}":\n\n${resultsText}`,
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
  }
);

// Tool: Agentic search with Gemini
server.registerTool(
  "agentic_search",
  {
    title: "Agentic Documentation Search",
    description:
      "Use Gemini AI to provide intelligent answers based on documentation search results",
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
      const queryService = getQueryService();
      const geminiService = getGeminiService();
      const storageService = getStorageService();

      // Get documentation set info for context
      const docSet = await storageService.getDocumentSet(setId);
      const setName = docSet?.name || "documentation";

      // First, search for relevant documentation
      const searchResponse = await queryService.searchDocumentation({
        setId,
        query,
        limit,
      });

      if (searchResponse.results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No relevant documentation found for query: "${query}" in set ${setName}. Please try a different search term or upload relevant documentation first.`,
            },
          ],
        };
      }

      // Use Gemini to generate an intelligent response
      const agenticResponse = await geminiService.agenticSearch({
        query,
        context: searchResponse.results,
        setName,
      });

      const responseText =
        `**Question:** ${query}\n\n` +
        `**Answer:** ${agenticResponse.answer}\n\n` +
        `**Analysis:** ${agenticResponse.reasoning}\n\n` +
        `---\n\n` +
        `*Based on ${searchResponse.results.length} documentation source(s) from ${setName}*`;

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

// Create Elysia app with the Bun platform
const app = new Elysia()
  .use(
    staticPlugin({
      assets: "./public",
      prefix: "/",
    })
  )

  // Basic info route
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
        console.log(`Transport created with sessionId: ${transport.sessionId}`);

        // Store the transport
        console.log("Storing transport in map");
        transports.set(transport.sessionId, transport);
        console.log(`Transports map size: ${transports.size}`);

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
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  });

// Start the server with Bun
const port = process.env.PORT || 3001;

app.listen(Number(port), () => {
  console.log(`MCP server running at http://localhost:${port}`);
  console.log("📖 Documentation MCP Server started");
  console.log("Available tools:");
  console.log("  - list_documentation_sets: List all documentation sets");
  console.log("  - search_documentation: Search within a documentation set");
  console.log("  - get_documentation_set: Get documentation set details");
  console.log(
    "  - agentic_search: AI-powered intelligent documentation search with Gemini"
  );
});
