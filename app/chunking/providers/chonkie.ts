/**
 * Chonkie-TS chunker provider
 */

import { z } from "zod";
import ids from "../../utils/ids.js";
import type { Chunk } from "../../types.js";
import type {
  Chunker,
  ChunkerInput,
  ChunkingResult,
} from "../chunker-interface.js";
import { registerChunkerProvider } from "./registry.js";
import { RecursiveChunker, SentenceChunker, TokenChunker } from "chonkie";

const OptionsSchema = z.object({
  strategy: z.enum(["token", "sentence", "recursive"]).default("recursive"),
  chunkSize: z.number().default(1000),
  chunkOverlap: z.number().default(200),
});

type Options = z.infer<typeof OptionsSchema>;

// Simple helper to extract text from chonkie results
const extractText = (item: unknown): string | null => {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && "text" in item) {
    const text = item.text;
    return typeof text === "string" ? text : null;
  }
  return null;
};

const createChonkie = (options: Options): Chunker => {
  return {
    name: "chonkie",
    strategy: options.strategy,

    async chunk(input: ChunkerInput, overrides): Promise<ChunkingResult> {
      const chunkSize = overrides?.chunkSize ?? options.chunkSize;
      const chunkOverlap = overrides?.chunkOverlap ?? options.chunkOverlap;
      const strategy = overrides?.strategy ?? options.strategy;

      // Create the appropriate chunker instance
      let chunker: RecursiveChunker | SentenceChunker | TokenChunker;
      switch (strategy) {
        case "token":
          chunker = await TokenChunker.create({ chunkSize, chunkOverlap });
          break;
        case "sentence":
          chunker = await SentenceChunker.create({ chunkSize, chunkOverlap });
          break;
        case "recursive":
          chunker = await RecursiveChunker.create({
            chunkSize: chunkSize,
          });
          break;
        default:
          throw new Error(`Unknown chunking strategy: ${strategy}`);
      }

      // Process the text
      const rawChunks = await chunker.chunk(input.text);
      const textChunks = rawChunks
        .map(extractText)
        .filter(
          (text): text is string => text !== null && text.trim().length > 0
        )
        .map((text) => text.trim());

      // Create chunk objects
      const chunks: Chunk[] = textChunks.map((text, index) => ({
        id: ids.newId(),
        setId: input.setId,
        documentId: input.documentId,
        ordinal: index,
        text,
      }));

      return {
        chunks,
        info: {
          provider: "chonkie",
          strategy: strategy as string,
          chunkSize,
          chunkOverlap,
        },
      };
    },
  };
};

registerChunkerProvider("chonkie", {
  schema: OptionsSchema,
  create: createChonkie,
});
