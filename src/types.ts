/*
 * Types for Documentation MCP Server
 */

export type UUID = string;

export type MimeType =
  | "text/plain"
  | "text/html"
  | "application/pdf"
  | string;

export interface DocumentSet {
  readonly id: UUID;
  readonly name: string;
  readonly description: string;
  readonly createdAt: string;
}

export interface DocumentMeta {
  readonly id: UUID;
  readonly setId: UUID;
  readonly filename: string;
  readonly mime: MimeType;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export interface Chunk {
  readonly id: UUID;
  readonly setId: UUID;
  readonly documentId: UUID;
  readonly ordinal: number;
  readonly text: string;
}

export interface EmbeddingRecord {
  readonly chunkId: UUID;
  readonly setId: UUID;
  readonly dimension: number;
  readonly vector: readonly number[];
}

export interface SearchResultItem {
  readonly chunkId: UUID;
  readonly documentId: UUID;
  readonly text: string;
  readonly score: number;
}

export interface SearchResults {
  readonly results: readonly SearchResultItem[];
}

export interface CreateSetInput {
  readonly name: string;
  readonly description?: string;
}

export interface CreateSetOutput {
  readonly id: UUID;
}

export interface UploadSummary {
  readonly documents: number;
  readonly chunks: number;
}

export interface QueryInput {
  readonly id: UUID;
  readonly query: string;
  readonly topK?: number;
}

export interface QueryOutput extends SearchResults {}
