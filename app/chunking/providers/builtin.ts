/**
 * Builtin chunker provider that wraps existing naive windowed chunking
 */

import { z } from "zod";
import ids from "../../utils/ids.js";
import type { Chunk } from "../../types.js";
import type {
  Chunker,
  ChunkerInput,
  ChunkerProviderFactory,
  ChunkingResult,
} from "../chunker-interface.js";
import { registerChunkerProvider } from "./registry.js";

const OptionsSchema = z.object({
  defaultSize: z.number().default(1000),
  overlap: z.number().default(200),
  maxSize: z.number().default(2000),
});

const normalize = (s: string): string => s.replace(/\s+/g, " ").trim();

const makeChunks = (input: ChunkerInput, chunkSize: number, overlap: number): readonly Chunk[] => {
  const content = normalize(input.text);
  const size = Math.max(1, chunkSize);
  const ov = Math.max(0, Math.min(overlap, Math.floor(size / 2)));
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
    start = end - ov;
    ordinal += 1;
  }
  return chunks;
};

const createBuiltin = (options: z.infer<typeof OptionsSchema>): Chunker => {
  return {
    name: "builtin",
    strategy: "fixed-window",
    async chunk(input, overrides): Promise<ChunkingResult> {
      const large = input.text.length > 100000;
      const baseSize = large ? options.maxSize : options.defaultSize;
      const chunkSize = overrides?.chunkSize ?? baseSize;
      const chunkOverlap = overrides?.chunkOverlap ?? options.overlap;
      const chunks = makeChunks(input, chunkSize, chunkOverlap);
      return {
        chunks,
        info: {
          provider: "builtin",
          strategy: overrides?.strategy ?? "fixed-window",
          chunkSize,
          chunkOverlap,
        },
      };
    },
  } satisfies Chunker;
};

registerChunkerProvider("builtin", {
  schema: OptionsSchema,
  create: createBuiltin,
} satisfies ChunkerProviderFactory<z.infer<typeof OptionsSchema>>);
