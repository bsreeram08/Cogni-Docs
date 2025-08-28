/**
 * HTTP Upload Server for Document Ingestion with Flexible Backend
 */

import { Elysia, t } from "elysia";
import { getStorageService, getConfig, healthCheck } from "../services/service-provider.js";
import { getDocumentProcessor } from "../processing/document-processor.js";
import type { MimeType } from "../types.js";
import cors from "@elysiajs/cors";
import { serverTiming } from "@elysiajs/server-timing";
import { swagger } from "@elysiajs/swagger";
import { logger } from "../utils/logger.js";

export function registerRoutes(app: Elysia) {
  app
    .use(
      cors({
        origin: "*",
        allowedHeaders: ["Content-Type", "Accept", "X-Request-Id", "Mcp-Session-Id"],
        exposeHeaders: ["X-Request-Id", "Mcp-Session-Id"],
      }),
    )
    .use(serverTiming())
    .use(swagger())
    // Per-request tracing context
    .derive(({ request, set }) => {
      const headerId = request.headers.get("x-request-id");
      const reqId = headerId && headerId.length > 0 ? headerId : crypto.randomUUID();
      const startTime = Date.now();
      // Propagate X-Request-Id on every response
      set.headers["X-Request-Id"] = reqId;
      // Ensure CORS allows and exposes tracing/session headers
      const prevAllow = String(set.headers["Access-Control-Allow-Headers"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const allowSet = new Set([
        ...prevAllow,
        "X-Request-Id",
        "Mcp-Session-Id",
        "Content-Type",
        "Accept",
      ]);
      set.headers["Access-Control-Allow-Headers"] = Array.from(allowSet).join(", ");
      const prevExpose = String(set.headers["Access-Control-Expose-Headers"] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const exposeSet = new Set([
        ...prevExpose,
        "X-Request-Id",
        "Mcp-Session-Id",
        "Content-Type",
        "Accept",
      ]);
      set.headers["Access-Control-Expose-Headers"] = Array.from(exposeSet).join(", ");
      return { reqId, startTime } as const;
    })
    // Inbound request log
    .onBeforeHandle(({ request, path, reqId }) => {
      logger.info({ reqId, method: request.method, path }, "inbound");
    })
    // Outbound response log
    .onAfterHandle(({ request, path, set, reqId, startTime }) => {
      const durationMs = Date.now() - startTime;
      const status = typeof set.status === "number" ? set.status : 200;
      logger.info({ reqId, method: request.method, path, status, durationMs }, "outbound");
    })
    // Standardized error logging
    .onError(({ code, error, request, set, path, reqId, startTime }) => {
      const durationMs = typeof startTime === "number" ? Date.now() - startTime : 0;
      const message = error instanceof Error ? error.message : "Internal server error";
      logger.error({ reqId, code, method: request.method, path, durationMs, err: error }, message);
      set.status = 500;
      return { error: message };
    })
    // Basic info route
    .get("/", () => ({
      name: "Bun Elysia MCP Server",
      version: "1.0.0",
      description: "Model Context Protocol server using Bun and Elysia",
      endpoints: {
        "/": "This info",
        "/mcp": "POST: MCP JSON-RPC; GET: 405; DELETE: end session",
        "/sets": "List or create documentation sets",
        "/sets/:setId/upload": "Upload documents to a set",
      },
    }))
    // Health check endpoint with service status
    .get(
      "/health",
      async () => {
        const config = getConfig();
        const health = await healthCheck();
        const uptime = process.uptime();

        return {
          status: health.overall ? "healthy" : "degraded",
          storage: {
            provider: config.storage.name,
            status: health.storage,
          },
          embeddings: {
            provider: config.embeddings.name,
            status: health.embeddings,
          },
          uptime,
          timestamp: new Date().toISOString(),
        };
      },
      {
        response: t.Object({
          status: t.Union([t.Literal("healthy"), t.Literal("degraded")]),
          storage: t.Object({ provider: t.String(), status: t.Boolean() }),
          embeddings: t.Object({ provider: t.String(), status: t.Boolean() }),
          uptime: t.Number(),
          timestamp: t.String(),
        }),
      },
    )

    // List all documentation sets
    .get(
      "/sets",
      async () => {
        const storageService = getStorageService();
        const sets = await storageService.listDocumentSets();
        return { sets };
      },
      {
        response: t.Object({
          sets: t.Array(
            t.Object({
              id: t.String(),
              name: t.String(),
              description: t.String(),
              created_at: t.Any(),
              document_count: t.Number(),
            }),
          ),
        }),
      },
    )

    // Create a new documentation set
    .post(
      "/sets",
      async ({ body, set, reqId }) => {
        try {
          const storageService = getStorageService();
          const result = await storageService.createDocumentSet(body.name, body.description);
          return result;
        } catch (error) {
          logger.error(error, `[${reqId}] Error creating document set:`);
          set.status = 500;
          return { error: "Failed to create document set" };
        }
      },
      {
        body: t.Object({
          name: t.String({ minLength: 1 }),
          description: t.Optional(t.String()),
        }),
        response: t.Object({
          id: t.String(),
          name: t.String(),
          description: t.String(),
          created_at: t.Any(),
          document_count: t.Number(),
        }),
      },
    )

    // Get documentation set by ID
    .get(
      "/sets/:setId",
      async ({ params, set }) => {
        const storageService = getStorageService();
        const docSet = await storageService.getDocumentSet(params.setId);

        if (!docSet) {
          set.status = 404;
          return { error: "Documentation set not found" };
        }

        return docSet;
      },
      {
        params: t.Object({
          setId: t.String({ minLength: 1 }),
        }),
        response: t.Union([
          t.Object({
            id: t.String(),
            name: t.String(),
            description: t.String(),
            created_at: t.Any(),
            document_count: t.Number(),
          }),
          t.Object({ error: t.String() }),
        ]),
      },
    )

    // List documents in a documentation set
    .get(
      "/sets/:setId/documents",
      async ({ params, set }) => {
        const storageService = getStorageService();

        // Verify the documentation set exists
        const docSet = await storageService.getDocumentSet(params.setId);
        if (!docSet) {
          set.status = 404;
          return { error: "Documentation set not found" };
        }

        const documents = await storageService.listDocuments(params.setId);
        return { documents };
      },
      {
        params: t.Object({
          setId: t.String({ minLength: 1 }),
        }),
        response: t.Union([
          t.Object({
            documents: t.Array(
              t.Object({
                id: t.String(),
                source_file: t.String(),
                mime_type: t.String(),
                size_bytes: t.Number(),
                created_at: t.String(),
              }),
            ),
          }),
          t.Object({ error: t.String() }),
        ]),
      },
    )

    // Delete a specific document
    .delete(
      "/sets/:setId/documents/:documentId",
      async ({ params, set, reqId }) => {
        const storageService = getStorageService();

        // Verify the documentation set exists
        const docSet = await storageService.getDocumentSet(params.setId);
        if (!docSet) {
          set.status = 404;
          return { error: "Documentation set not found" };
        }

        try {
          await storageService.deleteDocument(params.setId, params.documentId);
          return { message: "Document deleted successfully" };
        } catch (error) {
          logger.error(error, `[${reqId}] Error deleting document:`);
          set.status = 500;
          return { error: "Failed to delete document" };
        }
      },
      {
        params: t.Object({
          setId: t.String({ minLength: 1 }),
          documentId: t.String({ minLength: 1 }),
        }),
        response: t.Union([t.Object({ message: t.String() }), t.Object({ error: t.String() })]),
      },
    )

    // Upload documents to a documentation set
    .post(
      "/sets/:setId/upload",
      async ({ params, body, set, reqId }) => {
        try {
          const { setId } = params;
          // Narrow the body type to include files in environments without DOM lib
          type UploadedFile = {
            readonly name: string;
            readonly type: string;
            readonly size: number;
            arrayBuffer: () => Promise<ArrayBuffer>;
          };
          type UploadBody = { files: UploadedFile | UploadedFile[] };
          const { files } = body as unknown as UploadBody;
          const documentProcessor = getDocumentProcessor();
          const storageService = getStorageService();

          // Verify the documentation set exists
          const docSet = await storageService.getDocumentSet(setId);
          if (!docSet) {
            set.status = 404;
            return { error: "Documentation set not found" };
          }

          // Normalize files to array
          const fileArray = Array.isArray(files) ? files : [files];
          const results = [];

          for (const file of fileArray) {
            logger.info(
              `[${reqId}] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`,
            );

            // Determine MIME type
            let mimeType: MimeType = "text/plain";
            if (file.type === "application/pdf") {
              mimeType = "application/pdf";
            } else if (file.type === "text/html") {
              mimeType = "text/html";
            } else if (file.type === "text/plain") {
              mimeType = "text/plain";
            } else {
              // Try to infer from file extension
              const ext = file.name.split(".").pop()?.toLowerCase();
              switch (ext) {
                case "pdf":
                  mimeType = "application/pdf";
                  break;
                case "html":
                case "htm":
                  mimeType = "text/html";
                  break;
                case "txt":
                  mimeType = "text/plain";
                  break;
                default:
                  logger.warn(`Unknown file type for ${file.name}, treating as text/plain`);
              }
            }

            // Convert file to Uint8Array
            const data = new Uint8Array(await file.arrayBuffer());

            // Process the document
            const result = await documentProcessor.processDocument({
              setId,
              filename: file.name,
              data,
              mimeType,
            });

            results.push({
              filename: file.name,
              documentId: result.documentId,
              chunksCreated: result.chunksCreated,
            });
          }

          set.status = 202; // Accepted
          return {
            message: `Successfully processed ${fileArray.length} file(s)`,
            results,
          };
        } catch (error) {
          logger.error(error, `[${reqId}] Upload processing error:`);
          set.status = 500;
          return {
            error: error instanceof Error ? error.message : "Failed to process upload",
          };
        }
      },
      {
        params: t.Object({
          setId: t.String({ minLength: 1 }),
        }),
        body: t.Object({
          files: t.Files(),
        }),
        response: t.Union([
          t.Object({
            message: t.String(),
            results: t.Array(
              t.Object({
                filename: t.String(),
                documentId: t.String(),
                chunksCreated: t.Number(),
              }),
            ),
          }),
          t.Object({ error: t.String() }),
        ]),
      },
    );
}
