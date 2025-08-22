import { z } from "zod";
import { registerStorageProvider } from "./registry.js";
import { ChromaStorage } from "../chroma-storage.js";
import type { StorageProviderFactory } from "./registry.js";

const ChromaOptionsSchema = z.object({
  url: z.string().url().optional(),
});

export type ChromaOptions = z.infer<typeof ChromaOptionsSchema>;

const chromaFactory: StorageProviderFactory<ChromaOptions> = {
  id: "chroma",
  schema: ChromaOptionsSchema,
  create: (options: ChromaOptions) => new ChromaStorage(options),
};

registerStorageProvider("chroma", chromaFactory);
