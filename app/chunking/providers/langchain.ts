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
import { loadConfig } from "../../config/app-config.js";
import { createEmbeddingService } from "../../embeddings/embedding-factory.js";

const OptionsSchema = z.object({
  strategy: z
    .enum(["recursive", "intelligent", "semantic"])
    .default("recursive"),
  chunkSize: z.number().min(100).max(10000).default(3000),
  chunkOverlap: z.number().min(0).max(1000).default(150),
  separators: z.array(z.string()).default([]),
  contentTypeAware: z.boolean().default(true),
  // Semantic merge options
  semanticSimilarityThreshold: z.number().min(0).max(1).default(0.88),
  semanticMaxMergeChars: z.number().min(0).max(20000).default(6000),
  semanticBatchSize: z.number().min(1).max(256).default(64),
});

type Options = z.infer<typeof OptionsSchema>;

type ContentType = "code" | "markdown" | "html" | "mixed" | "text";

const detectContentType = (content: string): ContentType => {
  const codePatterns = [
    /^import\s+/m,
    /^from\s+\w+\s+import/m,
    /^\s*def\s+\w+/m,
    /^\s*function\s+\w+/m,
    /^\s*class\s+\w+/m,
    /^\s*export\s+(class|function|interface)/m,
    /^\s*if\s*\(/m,
    /^\s*for\s*\(/m,
  ];
  const markdownPatterns = [
    /^#{1,6}\s+/m,
    /^\*\s+/m,
    /^\d+\.\s+/m,
    /```[\s\S]*?```/,
    /\[.*\]\(.*\)/,
  ];
  const htmlPatterns = [
    /<html/i,
    /<body/i,
    /<div/i,
    /<p>/i,
    /<h[1-6]>/i,
    /<script/i,
    /<style/i,
  ];

  const codeScore = codePatterns.reduce(
    (s, r) => s + (r.test(content) ? 1 : 0),
    0
  );
  const mdScore = markdownPatterns.reduce(
    (s, r) => s + (r.test(content) ? 1 : 0),
    0
  );
  const htmlScore = htmlPatterns.reduce(
    (s, r) => s + (r.test(content) ? 1 : 0),
    0
  );

  if (
    (codeScore > 0 && mdScore > 0) ||
    (codeScore > 0 && htmlScore > 0) ||
    (mdScore > 0 && htmlScore > 0)
  ) {
    return "mixed";
  }
  if (htmlScore >= 2) return "html";
  if (mdScore >= 2) return "markdown";
  if (codeScore >= 2) return "code";
  return "text";
};

const detectProgrammingLanguage = (content: string): string => {
  const patterns: Record<string, RegExp[]> = {
    typescript: [
      /^import\s+.*from\s+['"].*['"];?$/m,
      /^export\s+(interface|type|class)/m,
    ],
    javascript: [
      /^const\s+\w+\s*=\s*require\(/m,
      /^module\.exports\s*=/m,
      /^function\s+\w+/m,
    ],
    python: [
      /^def\s+\w+/m,
      /^import\s+\w+/m,
      /^from\s+\w+\s+import/m,
      /^class\s+\w+:/m,
    ],
  };
  for (const [lang, regs] of Object.entries(patterns)) {
    const m = regs.reduce((c, r) => c + (r.test(content) ? 1 : 0), 0);
    if (m >= 2) return lang;
  }
  return "unknown";
};

const getLanguageSpecificSeparators = (language: string): string[] => {
  switch (language) {
    case "typescript":
      return [
        "\ninterface ",
        "\ntype ",
        "\nclass ",
        "\nfunction ",
        "\nexport ",
        "\n\n",
        "\n",
        " ",
        "",
      ];
    case "javascript":
      return ["\nfunction ", "\nclass ", "\nexport ", "\n\n", "\n", " ", ""];
    case "python":
      return ["\nclass ", "\ndef ", "\n\n", "\n", " ", ""];
    default:
      return ["\n\n", "\n", " ", ""];
  }
};

const getTypeAwareDefaults = (
  type: ContentType,
  base: { chunkSize: number; chunkOverlap: number }
): { chunkSize: number; chunkOverlap: number; separators?: string[] } => {
  switch (type) {
    case "code":
      return {
        chunkSize: Math.min(base.chunkSize, 1200),
        chunkOverlap: Math.max(base.chunkOverlap, 120),
      };
    case "markdown": {
      const separators = [
        "\n## ",
        "\n### ",
        "\n#### ",
        "\n\n",
        "\n",
        ". ",
        " ",
        "",
      ];
      return {
        chunkSize: base.chunkSize,
        chunkOverlap: base.chunkOverlap,
        separators,
      };
    }
    case "html": {
      const separators = [
        "</div>",
        "</section>",
        "</article>",
        "</p>",
        "\n\n",
        "\n",
        ". ",
        " ",
        "",
      ];
      return {
        chunkSize: Math.min(base.chunkSize, 2000),
        chunkOverlap: base.chunkOverlap,
        separators,
      };
    }
    case "mixed":
      return {
        chunkSize: Math.min(base.chunkSize, 2000),
        chunkOverlap: Math.max(base.chunkOverlap, 180),
      };
    default: {
      const separators = ["\n\n", "\n", ". ", " ", ""];
      return {
        chunkSize: base.chunkSize,
        chunkOverlap: base.chunkOverlap,
        separators,
      };
    }
  }
};

// --- Semantic utilities ---
const cosineSimilarity = (
  a: readonly number[],
  b: readonly number[]
): number => {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const va = a[i] as number;
    const vb = b[i] as number;
    dot += va * vb;
    na += va * va;
    nb += vb * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

const mergeAdjacentBySimilarity = async (
  parts: readonly string[],
  threshold: number,
  maxMergedChars: number,
  batchSize: number
): Promise<string[]> => {
  if (parts.length <= 1) return parts.slice();
  const config = loadConfig();
  const embedder = createEmbeddingService(config);

  // Embed in batches
  const embeddings: number[][] = [];
  for (let i = 0; i < parts.length; i += batchSize) {
    const batch = parts.slice(i, i + batchSize);
    const resp = await embedder.generateEmbeddings({ texts: batch });
    embeddings.push(...(resp.embeddings as number[][]));
  }

  const merged: string[] = [];
  let i = 0;
  while (i < parts.length) {
    let current = parts[i] as string;
    let j = i + 1;
    while (j < parts.length) {
      const sim = cosineSimilarity(embeddings[j - 1]!, embeddings[j]!);
      const candidate = current + "\n\n" + parts[j];
      if (sim >= threshold && candidate.length <= maxMergedChars) {
        current = candidate;
        j += 1;
      } else {
        break;
      }
    }
    merged.push(current);
    i = j;
  }
  return merged;
};

const createLangchain = (options: Options): Chunker => {
  return {
    name: "langchain",
    strategy: options.strategy,

    async chunk(input: ChunkerInput, overrides): Promise<ChunkingResult> {
      const strategy =
        (overrides?.strategy as Options["strategy"]) ?? options.strategy;

      // Compute effective split configuration once
      const base = {
        chunkSize: overrides?.chunkSize ?? options.chunkSize,
        chunkOverlap: overrides?.chunkOverlap ?? options.chunkOverlap,
      };
      let chunkSize = base.chunkSize;
      let chunkOverlap = base.chunkOverlap;
      let separators: string[] | undefined = options.separators;

      if (
        (strategy === "intelligent" || strategy === "semantic") &&
        options.contentTypeAware
      ) {
        const contentType = detectContentType(input.text);
        const typeCfg = getTypeAwareDefaults(contentType, base);
        chunkSize = typeCfg.chunkSize;
        chunkOverlap = typeCfg.chunkOverlap;
        separators = typeCfg.separators;
        if (contentType === "code") {
          const lang = detectProgrammingLanguage(input.text);
          separators = getLanguageSpecificSeparators(lang);
        }
      }

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap,
        ...(separators && { separators }),
      });

      const parts = await splitter.splitText(input.text);

      // Apply semantic adjacent-merge only when requested
      const finalParts =
        strategy === "semantic"
          ? await mergeAdjacentBySimilarity(
              parts,
              options.semanticSimilarityThreshold,
              options.semanticMaxMergeChars,
              options.semanticBatchSize
            )
          : parts;

      const chunks: Chunk[] = finalParts.map((text, index) => ({
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
          strategy,
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
