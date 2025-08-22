import { z } from "zod";
import type { StorageService } from "../storage-interface.js";

export interface StorageProviderFactory<TOptions extends object = Record<string, unknown>> {
  readonly id: string;
  readonly schema: z.ZodType<TOptions>;
  readonly create: (options: TOptions) => StorageService;
}

const providers = new Map<string, StorageProviderFactory<any>>();

export const registerStorageProvider = <TOptions extends object>(
  id: string,
  factory: StorageProviderFactory<TOptions>
): void => {
  if (providers.has(id)) return;
  providers.set(id, factory);
};

export const getStorageProvider = (id: string): StorageProviderFactory<any> => {
  const provider = providers.get(id);
  if (!provider) {
    throw new Error(`Storage provider not found: ${id}`);
  }
  return provider;
};
