/**
 * HTTP Upload Server for Document Ingestion
 */

import { Elysia, t } from "elysia";
import { initializeGoogleCloud } from "./services/google-cloud.js";
import { getDatabaseService } from "./db/firestore.js";
import { getDocumentProcessor } from "./processing/document-processor.js";
import type { MimeType } from "./types.js";
import cors from "@elysiajs/cors";

// Initialize Google Cloud services
await initializeGoogleCloud();

const app = new Elysia()
  .use(cors({ origin: "*" }))
  .onError(({ code, error, request, set, path }) => {
    console.error(`[${code}] Server error:`, error);
    console.log(`Path: ${request.method} ${path}`);
    set.status = 500;
    return {
      error: error instanceof Error ? error.message : "Internal server error",
    };
  })

  // Health check endpoint
  .get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }))

  // List all documentation sets
  .get("/sets", async () => {
    const databaseService = getDatabaseService();
    const sets = await databaseService.listDocumentSets();
    return { sets };
  })

  // Create a new documentation set
  .post(
    "/sets",
    async ({ body }) => {
      const databaseService = getDatabaseService();
      const result = await databaseService.createDocumentSet(body);
      return result;
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
      }),
    }
  )

  // Get documentation set by ID
  .get(
    "/sets/:setId",
    async ({ params, set }) => {
      const databaseService = getDatabaseService();
      const docSet = await databaseService.getDocumentSet(params.setId);

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
    }
  )

  // List documents in a documentation set
  .get(
    "/sets/:setId/documents",
    async ({ params, set }) => {
      const databaseService = getDatabaseService();

      // Verify the documentation set exists
      const docSet = await databaseService.getDocumentSet(params.setId);
      if (!docSet) {
        set.status = 404;
        return { error: "Documentation set not found" };
      }

      const documents = await databaseService.getDocumentsBySetId(params.setId);
      return { documents };
    },
    {
      params: t.Object({
        setId: t.String({ minLength: 1 }),
      }),
    }
  )

  // Delete a specific document
  .delete(
    "/sets/:setId/documents/:documentId",
    async ({ params, set }) => {
      const databaseService = getDatabaseService();

      // Verify the documentation set exists
      const docSet = await databaseService.getDocumentSet(params.setId);
      if (!docSet) {
        set.status = 404;
        return { error: "Documentation set not found" };
      }

      try {
        await databaseService.deleteDocument(params.documentId);
        return { message: "Document deleted successfully" };
      } catch (error) {
        console.error("Error deleting document:", error);
        set.status = 500;
        return { error: "Failed to delete document" };
      }
    },
    {
      params: t.Object({
        setId: t.String({ minLength: 1 }),
        documentId: t.String({ minLength: 1 }),
      }),
    }
  )

  // Upload documents to a documentation set
  .post(
    "/sets/:setId/upload",
    async ({ params, body, set }) => {
      try {
        const { setId } = params;
        const { files } = body;
        const documentProcessor = getDocumentProcessor();
        const databaseService = getDatabaseService();

        // Verify the documentation set exists
        const docSet = await databaseService.getDocumentSet(setId);
        if (!docSet) {
          set.status = 404;
          return { error: "Documentation set not found" };
        }

        // Normalize files to array
        const fileArray = Array.isArray(files) ? files : [files];
        const results = [];

        for (const file of fileArray) {
          console.log(
            `Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`
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
                console.warn(
                  `Unknown file type for ${file.name}, treating as text/plain`
                );
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
        console.error("Upload processing error:", error);
        set.status = 500;
        return {
          error:
            error instanceof Error ? error.message : "Failed to process upload",
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
    }
  )

  .listen({
    port: process.env.UPLOAD_SERVER_PORT
      ? parseInt(process.env.UPLOAD_SERVER_PORT)
      : 3001,
    hostname: process.env.UPLOAD_SERVER_HOST || "localhost",
  });

console.log(
  `📤 Upload Server running at http://${app.server?.hostname}:${app.server?.port}`
);
console.log("Available endpoints:");
console.log("  GET    /health");
console.log("  GET    /sets");
console.log("  POST   /sets");
console.log("  GET    /sets/:setId");
console.log("  GET    /sets/:setId/documents");
console.log("  DELETE /sets/:setId/documents/:documentId");
console.log("  POST   /sets/:setId/upload");
