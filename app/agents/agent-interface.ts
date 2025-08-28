/**
 * Agent service interfaces and provider factory contracts
 */

import type { UUID, Chunk } from "../types.js";
import { z } from "zod";

export interface AgentPreChunkInput {
  readonly setId: UUID;
  readonly documentId: UUID;
  readonly filename: string;
  readonly mimeType: string;
  readonly text: string;
}

export interface AgentPreChunkDecision {
  readonly strategy?: string;
  readonly chunkSize?: number;
  readonly chunkOverlap?: number;
}

export interface AgentChunkAnnotationInput {
  readonly setId: UUID;
  readonly documentId: UUID;
  readonly chunk: Chunk;
  readonly filename: string;
  readonly mimeType: string;
}

export interface AgentChunkAnnotation {
  readonly section_heading?: string;
  readonly topic_tags?: string[];
  readonly code_languages?: string[];
  readonly entities?: string[];
  readonly summary?: string;
  readonly quality_score?: number; // 0..1
}

export interface AgentService {
  readonly name: string;
  readonly analyzePreChunk: (
    input: AgentPreChunkInput,
  ) => Promise<AgentPreChunkDecision> | AgentPreChunkDecision;
  readonly annotateChunk: (
    input: AgentChunkAnnotationInput,
  ) => Promise<AgentChunkAnnotation> | AgentChunkAnnotation;
  readonly cleanup?: () => Promise<void>;
}

export interface AgentProviderFactory<
  Options extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly schema: z.ZodType<Options>;
  readonly create: (options: Options) => Promise<AgentService> | AgentService;
}
