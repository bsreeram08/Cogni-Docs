/**
 * Chunking service factory (registry-based, auto-registered providers)
 */

import type { Chunker } from "./chunker-interface.js";
import type { AppConfig } from "../config/app-config.js";
import { getChunkerProvider } from "./providers/registry.js";
// Auto-register built-in providers via side-effect imports
import "./providers/index.js";

export const createChunkerService = (config: AppConfig): Chunker => {
  const { name, options } = config.chunking;
  const factory = getChunkerProvider(name);
  const parsed = factory.schema.parse(options);
  const instance = factory.create(parsed);
  if (instance instanceof Promise) {
    // Note: keep sync create to simplify service-provider usage.
    // If a provider becomes async, wrap a lazy async initializer pattern.
    throw new Error("Chunker provider returned a Promise. Providers must create synchronously.");
  }
  return instance;
};
