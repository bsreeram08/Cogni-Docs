/**
 * Embedding service abstraction interface
 */

export interface EmbeddingRequest {
  readonly texts: readonly string[];
}

export interface EmbeddingResponse {
  readonly embeddings: readonly number[][];
  readonly dimensions: number;
}

export interface EmbeddingService {
  readonly generateEmbeddings: (request: EmbeddingRequest) => Promise<EmbeddingResponse>;
  readonly getDimensions: () => number;
  readonly getModelName: () => string;
  readonly healthCheck: () => Promise<boolean>;
  readonly cleanup?: () => Promise<void>;
}
