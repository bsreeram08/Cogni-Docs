/**
 * Document processing pipeline with flexible backend support
 */

import { parseText } from "../parsers/text.js";
import { parseHtml } from "../parsers/html.js";
import { parsePdf } from "../parsers/pdf.js";
import {
  getStorageService,
  getEmbeddingService,
  getConfig,
  getChunkerService,
} from "../services/service-provider.js";
import { getAgentService } from "../services/service-provider.js";
import { withRetry } from "../utils/retry.js";
import type { UUID, DocumentMeta, MimeType } from "../types.js";
import ids from "../utils/ids.js";
import { logger } from "../utils/logger.js";

export interface ProcessDocumentInput {
  readonly setId: UUID;
  readonly filename: string;
  readonly data: Uint8Array;
  readonly mimeType: MimeType;
}

export interface ProcessDocumentOutput {
  readonly documentId: UUID;
  readonly chunksCreated: number;
}

export interface DocumentProcessor {
  readonly processDocument: (input: ProcessDocumentInput) => Promise<ProcessDocumentOutput>;
}

const parseDocumentContent = async (data: Uint8Array, mimeType: MimeType): Promise<string> => {
  switch (mimeType) {
    case "text/plain":
      return parseText({ data }).text;

    case "text/html":
      return parseHtml({ data }).text;

    case "application/pdf":
      return (await parsePdf({ data })).text;

    default:
      throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
};

export const createDocumentProcessor = (): DocumentProcessor => {
  const processDocument = async (input: ProcessDocumentInput): Promise<ProcessDocumentOutput> => {
    const embeddingService = getEmbeddingService();
    const storageService = getStorageService();
    const config = getConfig();

    logger.info(`Processing document: ${input.filename} (${input.mimeType})`);

    // Step 1: Parse document content
    const text = await parseDocumentContent(input.data, input.mimeType);
    logger.info(`Extracted ${text.length} characters from document`);

    // Step 2: Create document metadata
    const documentId = ids.newId();
    const documentMeta: DocumentMeta = {
      id: documentId,
      setId: input.setId,
      filename: input.filename,
      mime: input.mimeType,
      sizeBytes: input.data.length,
      createdAt: new Date().toISOString(),
    };

    // Step 3: Optional agent pre-chunk analysis to override chunking params
    type ChunkingOptions = {
      readonly defaultSize?: number;
      readonly maxSize?: number;
      readonly overlap?: number;
      readonly chunkSize?: number;
      readonly chunkOverlap?: number;
      readonly strategy?: string;
    };
    const opts = (config.chunking.options || {}) as Partial<ChunkingOptions>;
    let effectiveStrategy: string | undefined = opts.strategy;
    let computedSize =
      text.length > 100000
        ? (opts.maxSize ?? opts.chunkSize ?? 2000)
        : (opts.defaultSize ?? opts.chunkSize ?? 1000);
    let computedOverlap = opts.overlap ?? opts.chunkOverlap ?? 200;

    if (config.agent?.enabled) {
      const agent = getAgentService();
      const decision = await agent.analyzePreChunk({
        setId: input.setId,
        documentId,
        filename: input.filename,
        mimeType: input.mimeType,
        text,
      });
      if (typeof decision.chunkSize === "number") computedSize = decision.chunkSize;
      if (typeof decision.chunkOverlap === "number") computedOverlap = decision.chunkOverlap;
      if (typeof decision.strategy === "string") effectiveStrategy = decision.strategy;
    }

    const chunker = getChunkerService();
    const chunkResult = await chunker.chunk(
      { setId: input.setId, documentId, text },
      {
        chunkSize: computedSize,
        chunkOverlap: computedOverlap,
        strategy: effectiveStrategy,
      },
    );
    logger.info(
      `Created ${chunkResult.chunks.length} chunks (${
        chunkResult.info.chunkSize ?? computedSize
      } chars per chunk) using ${chunkResult.info.provider}/${chunkResult.info.strategy}`,
    );

    // Step 4: Generate embeddings with retry and batching, then store documents with embeddings
    const chunks = [...chunkResult.chunks];
    const storedCount: number[] = [];

    interface EmbeddingBatchOption {
      readonly maxBatchSize?: number;
    }
    const embeddingOpts = config.embeddings.options as Partial<EmbeddingBatchOption>;
    const providerMaxBatch =
      typeof embeddingOpts.maxBatchSize === "number" ? embeddingOpts.maxBatchSize : 50;
    const batchSize = Math.min(providerMaxBatch, chunks.length > 100 ? 20 : 50);
    logger.info(`Processing embeddings in batches of ${batchSize}`);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const chunkTexts = batch.map((chunk) => chunk.text);

      logger.info(
        `Processing embedding batch ${
          Math.floor(i / batchSize) + 1
        }/${Math.ceil(chunks.length / batchSize)}`,
      );

      const embeddingResponse = await withRetry(
        () => embeddingService.generateEmbeddings({ texts: chunkTexts }),
        { maxAttempts: 5, baseDelayMs: 2000, maxDelayMs: 60000 },
      );

      const providerTag = `provider:${chunkResult.info.provider}`;
      const strategyTag = `strategy:${chunkResult.info.strategy}`;
      const sizeTag = `chunk_size:${chunkResult.info.chunkSize ?? computedSize}`;
      const overlapTag = `chunk_overlap:${chunkResult.info.chunkOverlap ?? computedOverlap}`;
      const documents = await Promise.all(
        batch.map(async (chunk, index) => {
          let agentMeta: Record<string, unknown> = {};
          if (config.agent?.enabled) {
            const agent = getAgentService();
            const ann = await agent.annotateChunk({
              setId: input.setId,
              documentId,
              chunk,
              filename: input.filename,
              mimeType: input.mimeType,
            });
            agentMeta = {
              section_heading: ann.section_heading,
              topic_tags: ann.topic_tags,
              code_languages: ann.code_languages,
              entities: ann.entities,
              summary: ann.summary,
              quality_score: ann.quality_score,
            };
          }

          return {
            id: chunk.id,
            content: chunk.text,
            embedding: embeddingResponse.embeddings[index] || [],
            metadata: {
              // document-level fields (identical across chunks of the same file)
              document_id: documentId,
              source_file: input.filename,
              mime_type: input.mimeType,
              size_bytes: input.data.length,
              created_at: documentMeta.createdAt,
              // chunk-level fields
              document_type: "unknown",
              keywords: [providerTag, strategyTag, sizeTag, overlapTag],
              chunk_index: chunk.ordinal,
              // agentic fields (optional)
              ...agentMeta,
            },
          };
        }),
      );

      // Store documents + embeddings together
      await withRetry(() => storageService.addDocuments(input.setId, documents), {
        maxAttempts: 3,
        baseDelayMs: 1000,
      });
      storedCount.push(documents.length);

      // Brief pause between batches to be respectful to APIs
      if (i + batchSize < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const totalStored = storedCount.reduce((a, b) => a + b, 0);
    logger.info(`Generated and stored ${totalStored} embedded chunks`);

    logger.info(`Successfully processed document ${input.filename}`);

    return {
      documentId,
      chunksCreated: chunkResult.chunks.length,
    };
  };

  return { processDocument };
};

let documentProcessor: DocumentProcessor | null = null;

export const getDocumentProcessor = (): DocumentProcessor => {
  if (!documentProcessor) {
    documentProcessor = createDocumentProcessor();
  }
  return documentProcessor;
};
