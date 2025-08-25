/**
 * LangChain text splitters provider
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
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const OptionsSchema = z.object({
  strategy: z.literal("recursive").default("recursive"),
  chunkSize: z.number().default(2000), // Larger chunks for code
  chunkOverlap: z.number().default(100), // Smaller overlap for code
  separators: z.array(z.string()).default([]),
});

type Options = z.infer<typeof OptionsSchema>;

const createLangchain = (options: Options): Chunker => {
  return {
    name: "langchain",
    strategy: options.strategy,

    async chunk(input: ChunkerInput, overrides): Promise<ChunkingResult> {
      const chunkSize = overrides?.chunkSize ?? options.chunkSize;
      const chunkOverlap = overrides?.chunkOverlap ?? options.chunkOverlap;
      const separators = options.separators;

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        ...(separators && { separators }),
      });

      const parts = await splitter.splitText(input.text);

      const chunks: Chunk[] = parts.map((text, index) => ({
        id: ids.newId(),
        setId: input.setId,
        documentId: input.documentId,
        ordinal: index,
        text,
      }));

      return {
        chunks,
        info: {
          provider: "langchain",
          strategy: options.strategy,
          chunkSize,
          chunkOverlap,
        },
      };
    },
  };
};

registerChunkerProvider("langchain", {
  schema: OptionsSchema,
  create: createLangchain,
});
