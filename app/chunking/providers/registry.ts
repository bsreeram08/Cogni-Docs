/**
 * Registry for chunker providers
 */

import type { ChunkerProviderFactory } from "../chunker-interface.js";

const providers = new Map<string, ChunkerProviderFactory>();

export const registerChunkerProvider = (name: string, factory: ChunkerProviderFactory): void => {
  const key = name.toLowerCase();
  if (providers.has(key)) return;
  providers.set(key, factory);
};

export const getChunkerProvider = (name: string): ChunkerProviderFactory => {
  const key = name.toLowerCase();
  const provider = providers.get(key);
  if (!provider) {
    const available = Array.from(providers.keys()).join(", ");
    throw new Error(`Unknown chunker provider: ${name}. Available: ${available || "<none>"}`);
  }
  return provider;
};
