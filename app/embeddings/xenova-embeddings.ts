/**
 * Xenova transformers embeddings implementation (local/privacy-focused)
 */

import { pipeline } from "@xenova/transformers";
import type {
  EmbeddingService,
  EmbeddingRequest,
  EmbeddingResponse,
} from "./embedding-interface.js";
import { logger } from "../utils/logger.js";

type FeatureExtraction = (
  text: string,
  options: { pooling: "mean" | "cls" | "max"; normalize: boolean },
) => Promise<{ data: Float32Array }>;

export interface XenovaConfig {
  readonly model: string;
  readonly maxBatchSize: number;
}

export const createXenovaEmbeddingService = (config: XenovaConfig): EmbeddingService => {
  let embeddingPipeline: FeatureExtraction | null = null;
  let modelDimensions: number = 384; // Default for all-MiniLM-L6-v2

  const initializePipeline = async (): Promise<FeatureExtraction> => {
    if (!embeddingPipeline) {
      logger.info(`Initializing Xenova embedding pipeline with model: ${config.model}`);
      embeddingPipeline = (await pipeline(
        "feature-extraction",
        config.model,
      )) as unknown as FeatureExtraction;

      // Test to get actual dimensions
      try {
        const testResult = await embeddingPipeline("test", {
          pooling: "mean",
          normalize: true,
        });
        if (testResult && testResult.data) {
          modelDimensions = testResult.data.length;
        }
      } catch (error) {
        logger.warn(error, "Could not determine model dimensions, using default:");
      }
    }
    return embeddingPipeline;
  };

  const generateEmbeddings = async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
    if (request.texts.length === 0) {
      return { embeddings: [], dimensions: modelDimensions };
    }

    try {
      const fe = await initializePipeline();
      const embeddings: number[][] = [];

      // Process in batches to avoid memory issues
      const batchSize = Math.min(config.maxBatchSize, request.texts.length);

      for (let i = 0; i < request.texts.length; i += batchSize) {
        const batch = request.texts.slice(i, i + batchSize);

        logger.info(
          `Processing Xenova embedding batch ${
            Math.floor(i / batchSize) + 1
          }/${Math.ceil(request.texts.length / batchSize)}`,
        );

        for (const text of batch) {
          try {
            const result = await fe(text, {
              pooling: "mean",
              normalize: true,
            });

            if (result && result.data) {
              embeddings.push(Array.from(result.data));
            } else {
              logger.warn(`No embedding returned for text: ${text.substring(0, 50)}...`);
              embeddings.push(new Array(modelDimensions).fill(0));
            }
          } catch (error) {
            logger.error(error, "Error generating Xenova embedding for text:");
            embeddings.push(new Array(modelDimensions).fill(0));
          }
        }

        // Brief pause between batches to prevent overwhelming the system
        if (i + batchSize < request.texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      logger.info(
        `Generated ${embeddings.length} embeddings with ${modelDimensions} dimensions using Xenova`,
      );

      return {
        embeddings,
        dimensions: modelDimensions,
      };
    } catch (error) {
      console.error("Error in Xenova embedding generation:", error);
      // Return zero embeddings as fallback
      const fallbackEmbeddings = request.texts.map(() => new Array(modelDimensions).fill(0));
      return {
        embeddings: fallbackEmbeddings,
        dimensions: modelDimensions,
      };
    }
  };

  const getDimensions = (): number => modelDimensions;

  const getModelName = (): string => config.model;

  const healthCheck = async (): Promise<boolean> => {
    try {
      const testResponse = await generateEmbeddings({ texts: ["test"] });
      return (
        testResponse.embeddings.length > 0 && testResponse.embeddings[0].some((val) => val !== 0)
      );
    } catch (error) {
      console.error("Xenova health check failed:", error);
      return false;
    }
  };

  const cleanup = async (): Promise<void> => {
    // Xenova doesn't require explicit cleanup, but we can clear the pipeline reference
    embeddingPipeline = null;
  };

  return {
    generateEmbeddings,
    getDimensions,
    getModelName,
    healthCheck,
    cleanup,
  };
};
