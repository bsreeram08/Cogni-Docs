/**
 * Storage service factory (registry-based, auto-registered providers)
 */

import type { StorageService } from "./storage-interface.js";
import type { AppConfig } from "../config/app-config.js";
import { getStorageProvider } from "./providers/registry.js";
// Auto-register built-in providers via side-effect imports
import "./providers/index.js";

export const createStorageService = (config: AppConfig): StorageService => {
  const { name, options } = config.storage;
  const factory = getStorageProvider(name);
  const parsed = factory.schema.parse(options);
  return factory.create(parsed);
};
