/**
 * API validation schemas using Zod
 */

import { z } from "zod";

// Base types
export const UUIDSchema = z.string().uuid();
export const MimeTypeSchema = z.enum([
  "text/plain",
  "text/html",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

// Document Set schemas
export const CreateDocumentSetSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const DocumentSetResponseSchema = z.object({
  id: UUIDSchema,
  name: z.string(),
  description: z.string(),
  createdAt: z.string().datetime(),
});

// Document schemas
export const UploadDocumentSchema = z.object({
  setId: UUIDSchema,
  filename: z.string().min(1).max(255),
  // File data will be handled separately as multipart/form-data
});

export const DocumentResponseSchema = z.object({
  id: UUIDSchema,
  setId: UUIDSchema,
  filename: z.string(),
  mime: MimeTypeSchema,
  sizeBytes: z.number().int().positive(),
  createdAt: z.string().datetime(),
});

// Query schemas
export const SearchQuerySchema = z.object({
  setId: UUIDSchema,
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(100).default(10),
});

export const SearchResultSchema = z.object({
  chunk: z.object({
    id: UUIDSchema,
    setId: UUIDSchema,
    documentId: UUIDSchema,
    ordinal: z.number().int(),
    text: z.string(),
  }),
  score: z.number().min(0).max(1),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  query: z.string(),
  totalResults: z.number().int(),
});

// Health check schema
export const HealthCheckResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  storage: z.object({
    provider: z.string(),
    status: z.boolean(),
  }),
  embeddings: z.object({
    provider: z.string(),
    status: z.boolean(),
  }),
  uptime: z.number(),
  timestamp: z.string().datetime(),
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  timestamp: z.string().datetime(),
});

// Type exports
export type CreateDocumentSetRequest = z.infer<typeof CreateDocumentSetSchema>;
export type DocumentSetResponse = z.infer<typeof DocumentSetResponseSchema>;
export type UploadDocumentRequest = z.infer<typeof UploadDocumentSchema>;
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Validation helpers
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
};

export const createErrorResponse = (
  code: string,
  message: string,
  details?: unknown,
): ErrorResponse => {
  return {
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
};
