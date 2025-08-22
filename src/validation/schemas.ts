/**
 * TypeBox validation schemas for API endpoints
 */

import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

export const CreateDocumentSetSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String({ maxLength: 500 }))
});

export const UploadDocumentsSchema = Type.Object({
  files: Type.Array(Type.Any()) // File objects
});

export const SearchSchema = Type.Object({
  query: Type.String({ minLength: 1 }),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  filters: Type.Optional(Type.Record(Type.String(), Type.Any()))
});

export const DocumentSetParamsSchema = Type.Object({
  setId: Type.String({ minLength: 1 })
});

export const DocumentParamsSchema = Type.Object({
  setId: Type.String({ minLength: 1 }),
  documentId: Type.String({ minLength: 1 })
});

export const HealthResponseSchema = Type.Object({
  status: Type.String(),
  timestamp: Type.String(),
  services: Type.Object({
    storage: Type.Object({
      status: Type.String(),
      provider: Type.String()
    }),
    embeddings: Type.Object({
      status: Type.String(),
      provider: Type.String()
    })
  })
});

// Type exports for use in handlers
export type CreateDocumentSetRequest = Static<typeof CreateDocumentSetSchema>;
export type UploadDocumentsRequest = Static<typeof UploadDocumentsSchema>;
export type SearchRequest = Static<typeof SearchSchema>;
export type DocumentSetParams = Static<typeof DocumentSetParamsSchema>;
export type DocumentParams = Static<typeof DocumentParamsSchema>;
export type HealthResponse = Static<typeof HealthResponseSchema>;
