import Elysia from "elysia";
import { registerRoutes } from "./server/upload-server.js";
import { startMcpServer } from "./server/mcp-server.js";
import { loadConfig } from "./config/app-config.js";

/**
 * Bootstrap the application
 * Start the backend
 * Start the MCP server
 */
function bootstrap() {
  const elysia = new Elysia();

  registerRoutes(elysia);
  startMcpServer(elysia);

  console.log("Available endpoints:");
  console.log("  GET    /health");
  console.log("  GET    /sets");
  console.log("  POST   /sets");
  console.log("  GET    /sets/:setId");
  console.log("  GET    /sets/:setId/documents");
  console.log("  DELETE /sets/:setId/documents/:documentId");
  console.log("  POST   /sets/:setId/upload");

  console.log("📖 Documentation MCP Server started");
  console.log("Available tools:");
  console.log("  - list_documentation_sets: List all documentation sets");
  console.log("  - search_documentation: Search within a documentation set");
  console.log("  - get_documentation_set: Get documentation set details");
  console.log(
    "  - agentic_search: Extractive answer from top documentation results"
  );
  const { httpPort } = loadConfig();
  elysia.listen(httpPort, () => {
    console.log(`Server running at http://localhost:${elysia.server?.port}`);
  });
}

bootstrap();
