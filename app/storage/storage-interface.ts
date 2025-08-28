/**
 * Storage abstraction interface
 */

export interface DocumentSet {
  id: string;
  name: string;
  description: string;
  created_at: Date;
  document_count: number;
}

/**
 * A single uploaded document (file) included in a documentation set.
 * This represents the original file, not individual chunks.
 */
export interface ListedDocument {
  /** Stable document identifier (same across its chunks) */
  id: string;
  /** Original filename captured at upload time */
  source_file: string;
  /** MIME type of the uploaded file */
  mime_type: string;
  /** File size in bytes */
  size_bytes: number;
  /** ISO timestamp string of when document was added */
  created_at: string;
}

export interface DocumentMetadata {
  source_file: string;
  /** stable document id shared by all chunks of the same file */
  document_id?: string;
  /** MIME type of the original file */
  mime_type?: string;
  /** original file size in bytes */
  size_bytes?: number;
  /** upload/create timestamp (ISO string) */
  created_at?: string;
  page_number?: number;
  document_type: string; // "gicc" | "qa" | "onboarding" | "testcases"
  category?: string; // "troubleshooting" | "examples" | "api_reference" | "instructions"
  keywords: string[];
  chunk_index: number;
  // Agentic annotations (flat, vector-store friendly)
  section_heading?: string;
  topic_tags?: string[];
  code_languages?: string[];
  entities?: string[];
  summary?: string;
  quality_score?: number; // 0..1
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  similarity: number;
}

export interface StorageService {
  createDocumentSet(name: string, description?: string): Promise<DocumentSet>;
  getDocumentSet(setId: string): Promise<DocumentSet | null>;
  listDocumentSets(): Promise<DocumentSet[]>;

  /**
   * Return the list of distinct uploaded documents (files) for a set.
   * Implementations should aggregate across chunks and return one entry per file.
   */
  listDocuments(setId: string): Promise<ListedDocument[]>;

  addDocuments(
    setId: string,
    documents: Array<{
      id: string;
      content: string;
      embedding: number[];
      metadata: DocumentMetadata;
    }>
  ): Promise<void>;

  searchDocuments(
    setId: string,
    queryEmbedding: number[],
    limit?: number,
    filters?: Record<string, any>
  ): Promise<SearchResult[]>;

  deleteDocument(setId: string, documentId: string): Promise<void>;
  deleteDocumentSet(setId: string): Promise<void>;

  healthCheck(): Promise<boolean>;
  cleanup(): Promise<void>;
}
