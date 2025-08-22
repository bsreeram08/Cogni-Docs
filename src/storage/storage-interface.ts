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

export interface DocumentMetadata {
  source_file: string;
  page_number?: number;
  document_type: string; // "gicc" | "qa" | "onboarding" | "testcases"
  category?: string; // "troubleshooting" | "examples" | "api_reference" | "instructions"
  keywords: string[];
  chunk_index: number;
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
