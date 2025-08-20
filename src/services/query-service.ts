/**
 * Documentation query service
 */

import { getDatabaseService } from '../db/firestore.js';
import { getEmbeddingService } from './embeddings.js';
import type { UUID, SearchResultItem } from '../types.js';

export interface QueryRequest {
  readonly setId: UUID;
  readonly query: string;
  readonly limit?: number;
}

export interface QueryResponse {
  readonly results: readonly SearchResultItem[];
  readonly totalResults: number;
}

export interface QueryService {
  readonly searchDocumentation: (request: QueryRequest) => Promise<QueryResponse>;
}

const createQueryService = (): QueryService => {
  const searchDocumentation = async (request: QueryRequest): Promise<QueryResponse> => {
    const { setId, query, limit = 5 } = request;
    const databaseService = getDatabaseService();
    const embeddingService = getEmbeddingService();
    
    console.log(`Searching documentation set ${setId} for: "${query}"`);
    
    // Verify the documentation set exists
    const docSet = await databaseService.getDocumentSet(setId);
    if (!docSet) {
      throw new Error(`Documentation set ${setId} not found`);
    }
    
    // Generate embedding for the query
    const embeddingResponse = await embeddingService.generateEmbeddings({ texts: [query] });
    const queryEmbedding = embeddingResponse.embeddings[0];
    
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for query');
    }
    
    // Search for similar chunks
    const searchResults = await databaseService.searchSimilar(setId, queryEmbedding, limit);
    
    // Convert to search result items
    const results: SearchResultItem[] = searchResults.map(({ chunk, score }) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      text: chunk.text,
      score,
    }));
    
    console.log(`Found ${results.length} results for query`);
    
    return {
      results,
      totalResults: results.length,
    };
  };
  
  return { searchDocumentation };
};

let queryService: QueryService | null = null;

export const getQueryService = (): QueryService => {
  if (!queryService) {
    queryService = createQueryService();
  }
  return queryService;
};
