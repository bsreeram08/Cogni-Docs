import { z } from "zod";
import { registerEmbeddingProvider } from "../registry.js";
import type { EmbeddingProviderFactory } from "../registry.js";
import { createTransformersJsEmbeddingService } from "./transformersjs-embeddings.js";

const TransformersJsOptionsSchema = z.object({
  model: z.string().default("Xenova/all-MiniLM-L6-v2"),
  device: z.enum(["auto", "wasm", "webgpu"]).default("wasm"),
  pooling: z.enum(["mean", "cls", "max"]).default("mean"),
  normalize: z.boolean().default(true),
  maxBatchSize: z.number().int().positive().default(50),
});

export type TransformersJsOptions = z.infer<typeof TransformersJsOptionsSchema>;

const transformersJsFactory: EmbeddingProviderFactory<TransformersJsOptions> = {
  id: "transformersjs",
  schema: TransformersJsOptionsSchema,
  create: (options: TransformersJsOptions) =>
    createTransformersJsEmbeddingService({
      model: options.model,
      device: options.device,
      pooling: options.pooling,
      normalize: options.normalize,
      maxBatchSize: options.maxBatchSize,
    }),
};

registerEmbeddingProvider("transformersjs", transformersJsFactory);
