/**
 * Chunking interfaces and provider factory contracts
 */

import type { UUID, Chunk } from "../types.js";
import { z } from "zod";

export interface ChunkerInput {
  readonly setId: UUID;
  readonly documentId: UUID;
  readonly text: string;
}

export interface ChunkingInfo {
  readonly provider: string;
  readonly strategy: string;
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
}

export interface ChunkingResult {
  readonly chunks: readonly Chunk[];
  readonly info: ChunkingInfo;
}

export interface ChunkOverrides {
  readonly strategy?: string;
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
}

export interface Chunker {
  readonly name: string;
  readonly strategy: string;
  readonly chunk: (input: ChunkerInput, overrides?: ChunkOverrides) => Promise<ChunkingResult>;
}

export interface ChunkerProviderFactory<
  Options extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly schema: z.ZodType<Options>;
  readonly create: (options: Options) => Promise<Chunker> | Chunker;
}
