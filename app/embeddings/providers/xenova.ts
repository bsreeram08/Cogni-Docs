import { z } from "zod";
import { registerEmbeddingProvider } from "./registry.js";
import { createXenovaEmbeddingService } from "../xenova-embeddings.js";
import type { EmbeddingProviderFactory } from "./registry.js";

const XenovaOptionsSchema = z.object({
  model: z.string().default("Xenova/all-MiniLM-L6-v2"),
  maxBatchSize: z.number().int().positive().default(50),
});

export type XenovaOptions = z.infer<typeof XenovaOptionsSchema>;

const xenovaFactory: EmbeddingProviderFactory<XenovaOptions> = {
  id: "xenova",
  schema: XenovaOptionsSchema,
  create: (options: XenovaOptions) =>
    createXenovaEmbeddingService({
      model: options.model,
      maxBatchSize: options.maxBatchSize,
    }),
};

registerEmbeddingProvider("xenova", xenovaFactory);
