/**
 * Embedding service factory (registry-based, auto-registered providers)
 */

import type { EmbeddingService } from "./embedding-interface.js";
import type { AppConfig } from "../config/app-config.js";
import { getEmbeddingProvider } from "./providers/registry.js";
// Auto-register built-in providers via side-effect imports
import "./providers/index.js";

export const createEmbeddingService = (config: AppConfig): EmbeddingService => {
  const { name, options } = config.embeddings;
  const factory = getEmbeddingProvider(name);
  const parsed = factory.schema.parse(options);
  return factory.create(parsed);
};
