/**
 * Enhanced configuration system supporting plugin-style providers
 */

import { z } from "zod";

const ProviderConfigSchema = z.object({
  name: z.string().default("unknown"),
  // Provider-specific options are free-form; individual providers validate
  // their own options using their schemas at creation time.
  options: z.record(z.unknown()).default({}),
});

const AppConfigSchema = z.object({
  // Server configuration
  httpPort: z.number().min(1).max(65535).default(8787),

  // Storage configuration (provider-agnostic)
  storage: ProviderConfigSchema,

  // Embedding configuration (provider-agnostic)
  embeddings: ProviderConfigSchema,

  // Document processing
  chunking: ProviderConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const parseJSON = (value: string | undefined): Record<string, unknown> => {
  if (!value) return {};
  try {
    const obj = JSON.parse(value);
    if (obj && typeof obj === "object" && !Array.isArray(obj))
      return obj as Record<string, unknown>;
  } catch {}
  return {};
};

export const loadConfig = (): AppConfig => {
  const storageName =
    process.env.STORAGE_NAME || process.env.STORAGE_PROVIDER || "chroma";
  const storageOptions = {
    ...parseJSON(process.env.STORAGE_OPTIONS),
    // Back-compat fallback
    url: process.env.CHROMA_URL || undefined,
  };

  const embeddingsName =
    process.env.EMBEDDINGS_NAME || process.env.EMBEDDING_PROVIDER || "xenova";
  const embeddingsOptions = {
    ...parseJSON(process.env.EMBEDDINGS_OPTIONS),
    // Back-compat fallbacks
    model: process.env.XENOVA_MODEL || undefined,
    maxBatchSize: parseNumber(process.env.MAX_BATCH_SIZE, 0) || undefined,
  };

  const chunkingName =
    process.env.CHUNKING_NAME || process.env.CHUNKING_PROVIDER || "langchain";
  const chunkingOptions = {
    ...parseJSON(process.env.CHUNKING_OPTIONS),
    // Back-compat fallbacks for prior numeric settings
    chunkSize: parseNumber(process.env.CHUNK_SIZE, 3000),
    chunkOverlap: parseNumber(process.env.CHUNK_OVERLAP, 150),
    maxSize: parseNumber(process.env.MAX_CHUNK_SIZE, 5000),
  };

  const rawConfig = {
    httpPort: parseNumber(process.env.HTTP_PORT, 8787),
    storage: { name: storageName, options: storageOptions },
    embeddings: { name: embeddingsName, options: embeddingsOptions },
    chunking: { name: chunkingName, options: chunkingOptions },
  } satisfies AppConfig;

  // Validate configuration using Zod
  const result = AppConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error("Configuration validation failed:", result.error.format());
    throw new Error(
      "Invalid configuration. Please check your environment variables."
    );
  }

  return result.data;
};

export const validateConfig = (config: unknown): config is AppConfig => {
  return AppConfigSchema.safeParse(config).success;
};
