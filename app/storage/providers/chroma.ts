import { z } from "zod";
import { registerStorageProvider } from "./registry.js";
import { ChromaStorage } from "../chroma-storage.js";
import type { StorageProviderFactory } from "./registry.js";

const ChromaOptionsSchema = z.object({
  host: z.string().optional(),
  port: z.number().optional(),
  ssl: z.boolean().optional(),
  tenant: z.string().optional(),
  database: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  fetchOptions: z.any().optional(),
  path: z.string().optional(),
  auth: z.record(z.string(), z.string()).optional(),
});

export type ChromaOptions = z.infer<typeof ChromaOptionsSchema>;

const chromaFactory: StorageProviderFactory<ChromaOptions> = {
  id: "chroma",
  schema: ChromaOptionsSchema,
  create: (options: ChromaOptions) =>
    new ChromaStorage({
      path: options.path,
      host: options.host,
      port: options.port,
      ssl: options.ssl,
      tenant: options.tenant,
      database: options.database,
      headers: options.headers,
      fetchOptions: options.fetchOptions,
      auth: options.auth,
    }),
};

registerStorageProvider("chroma", chromaFactory);
