import Elysia from "elysia";
import { registerRoutes } from "./server/upload-server.js";
import { startMcpServer } from "./server/mcp-server.js";
import { loadConfig } from "./config/app-config.js";
import { logger } from "./utils/logger.js";

/**
 * Bootstrap the application
 * Start the backend
 * Start the MCP server
 */
function bootstrap() {
  const elysia = new Elysia();

  registerRoutes(elysia);
  startMcpServer(elysia);

  logger.info("Available endpoints:");
  logger.info("  GET    /health");
  logger.info("  GET    /sets");
  logger.info("  POST   /sets");
  logger.info("  GET    /sets/:setId");
  logger.info("  GET    /sets/:setId/documents");
  logger.info("  DELETE /sets/:setId/documents/:documentId");
  logger.info("  POST   /sets/:setId/upload");

  logger.info("📖 Documentation MCP Server started");
  logger.info("Available tools:");
  logger.info("  - list_documentation_sets: List all documentation sets");
  logger.info("  - search_documentation: Search within a documentation set");
  logger.info("  - get_documentation_set: Get documentation set details");
  logger.info(
    "  - agentic_search: Extractive answer from top documentation results"
  );
  const { httpPort } = loadConfig();
  elysia.listen(httpPort, () => {
    logger.info(`Server running at http://localhost:${elysia.server?.port}`);
  });
}

bootstrap();
