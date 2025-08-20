/**
 * Document processing pipeline
 */

import { parseText } from "../parsers/text.js";
import { parseHtml } from "../parsers/html.js";
import { parsePdf } from "../parsers/pdf.js";
import { chunkText } from "../ingest/chunker.js";
import { getEmbeddingService } from "../services/embeddings.js";
import { getDatabaseService } from "../db/firestore.js";
import { withRetry, withBatchRetry } from "../utils/retry.js";
import type {
  UUID,
  DocumentMeta,
  Chunk,
  EmbeddingRecord,
  MimeType,
} from "../types.js";
import ids from "../utils/ids.js";

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
  readonly processDocument: (
    input: ProcessDocumentInput
  ) => Promise<ProcessDocumentOutput>;
}

const parseDocumentContent = async (
  data: Uint8Array,
  mimeType: MimeType
): Promise<string> => {
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
  const processDocument = async (
    input: ProcessDocumentInput
  ): Promise<ProcessDocumentOutput> => {
    const embeddingService = getEmbeddingService();
    const databaseService = getDatabaseService();

    console.log(`Processing document: ${input.filename} (${input.mimeType})`);

    // Step 1: Parse document content
    const text = await parseDocumentContent(input.data, input.mimeType);
    console.log(`Extracted ${text.length} characters from document`);

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

    // Step 3: Chunk the text (optimize for large documents)
    const chunkSize = text.length > 100000 ? 1500 : 1000; // Larger chunks for very large documents
    const overlap = Math.floor(chunkSize * 0.1); // 10% overlap
    
    const chunkResult = chunkText(
      { chunkSize, overlap },
      { setId: input.setId, documentId, text }
    );
    console.log(`Created ${chunkResult.chunks.length} chunks (${chunkSize} chars per chunk)`);

    // Step 4: Store document and chunks first
    await databaseService.addDocument(documentMeta);
    await databaseService.addChunks([...chunkResult.chunks]);

    // Step 5: Generate embeddings with retry and batching for large documents
    const chunks = [...chunkResult.chunks];
    const embeddingRecords: EmbeddingRecord[] = [];
    
    const batchSize = chunks.length > 100 ? 20 : 50; // Smaller batches for very large documents
    console.log(`Processing embeddings in batches of ${batchSize}`);

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const chunkTexts = batch.map((chunk) => chunk.text);
      
      console.log(`Processing embedding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      
      const embeddingResponse = await withRetry(
        () => embeddingService.generateEmbeddings({ texts: chunkTexts }),
        { maxAttempts: 5, baseDelayMs: 2000, maxDelayMs: 60000 }
      );

      const batchRecords: EmbeddingRecord[] = batch.map((chunk, index) => ({
        chunkId: chunk.id,
        setId: input.setId,
        dimension: embeddingResponse.dimensions,
        vector: embeddingResponse.embeddings[index] || [],
      }));

      embeddingRecords.push(...batchRecords);

      // Store embeddings in smaller batches to avoid timeouts
      await withRetry(
        () => databaseService.addEmbeddings(batchRecords),
        { maxAttempts: 3, baseDelayMs: 1000 }
      );

      // Brief pause between batches to be respectful to APIs
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Generated and stored ${embeddingRecords.length} embeddings`);

    console.log(`Successfully processed document ${input.filename}`);

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
