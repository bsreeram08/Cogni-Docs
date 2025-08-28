import { z } from "zod";
import type { EmbeddingService } from "../embedding-interface.js";

export interface EmbeddingProviderFactory<TOptions extends object = Record<string, unknown>> {
  readonly id: string;
  readonly schema: z.ZodType<TOptions>;
  readonly create: (options: TOptions) => EmbeddingService;
}

const providers = new Map<string, EmbeddingProviderFactory<any>>();

export const registerEmbeddingProvider = <TOptions extends object>(
  id: string,
  factory: EmbeddingProviderFactory<TOptions>,
): void => {
  if (providers.has(id)) return;
  providers.set(id, factory);
};

export const getEmbeddingProvider = (id: string): EmbeddingProviderFactory<any> => {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Embedding provider not found: ${id}`);
  }
  return provider;
};
