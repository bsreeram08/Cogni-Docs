/**
 * Text chunking utilities.
 */

import ids from "../utils/ids.ts";
import type { Chunk, UUID } from "../types.ts";

export interface ChunkerConfig {
  readonly chunkSize: number;
  readonly overlap: number;
}

export interface ChunkerInput {
  readonly setId: UUID;
  readonly documentId: UUID;
  readonly text: string;
}

export interface ChunkerOutput {
  readonly chunks: readonly Chunk[];
}

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

export const chunkText = (cfg: ChunkerConfig, input: ChunkerInput): ChunkerOutput => {
  const content = normalize(input.text);
  const size = Math.max(1, cfg.chunkSize);
  const overlap = Math.max(0, Math.min(cfg.overlap, Math.floor(size / 2)));
  const chunks: Chunk[] = [];
  let start = 0;
  let ordinal = 0;
  while (start < content.length) {
    const end = Math.min(content.length, start + size);
    const window = content.slice(start, end);
    chunks.push({
      id: ids.newId(),
      setId: input.setId,
      documentId: input.documentId,
      ordinal,
      text: window,
    });
    if (end === content.length) break;
    start = end - overlap;
    ordinal += 1;
  }
  return { chunks };
};
