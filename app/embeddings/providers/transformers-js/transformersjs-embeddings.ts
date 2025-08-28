/**
 * Transformers.js embeddings implementation (@huggingface/transformers)
 */

import { pipeline } from "@huggingface/transformers";
import type {
  EmbeddingService,
  EmbeddingRequest,
  EmbeddingResponse,
} from "../../embedding-interface.js";
import { logger } from "../../../utils/logger.js";

export type TransformersDevice = "auto" | "wasm" | "webgpu";
export type PoolingStrategy = "mean" | "cls" | "max";

export interface TransformersJsConfig {
  readonly model: string;
  readonly device: TransformersDevice;
  readonly pooling: PoolingStrategy;
  readonly normalize: boolean;
  readonly maxBatchSize: number;
}

type Vector1D = number[];
type Matrix2D = number[][];

interface TensorWithToList {
  readonly tolist: () => Vector1D | Matrix2D;
}

interface TensorWithData {
  readonly data: Float32Array | number[];
}

type FeatureOutput = Vector1D | Matrix2D | TensorWithToList | TensorWithData;

type FeatureExtraction = (
  inputs: string | string[],
  options: { pooling: PoolingStrategy; normalize: boolean }
) => Promise<FeatureOutput>;

export const createTransformersJsEmbeddingService = (
  config: TransformersJsConfig
): EmbeddingService => {
  let embeddingPipeline: FeatureExtraction | null = null;
  let modelDimensions = 384; // default to MiniLM dims for compatibility

  const resolveDevice = (
    device: TransformersDevice
  ): { readonly device: TransformersDevice } => {
    // Server runtime has no WebGPU; prefer WASM when auto
    const dev: TransformersDevice = device === "auto" ? "wasm" : device;
    return { device: dev };
  };

  const initializePipeline = async (): Promise<FeatureExtraction> => {
    if (!embeddingPipeline) {
      const deviceCfg = resolveDevice(config.device);
      logger.info(
        `Initializing Transformers.js embedding pipeline with model: ${
          config.model
        } (${String(deviceCfg.device)})`
      );
      embeddingPipeline = (await pipeline(
        "feature-extraction",
        config.model,
        deviceCfg
      )) as FeatureExtraction;

      // Probe dimensions once
      try {
        const result = await embeddingPipeline("test", {
          pooling: config.pooling,
          normalize: config.normalize,
        });
        const dims = extractLength(result);
        if (typeof dims === "number" && Number.isFinite(dims)) {
          modelDimensions = dims;
        }
      } catch (err) {
        logger.warn(
          err,
          "Transformers.js: could not determine model dimensions; using default"
        );
      }
    }
    return embeddingPipeline;
  };

  const hasToList = (x: unknown): x is TensorWithToList => {
    return typeof (x as { tolist?: unknown }).tolist === "function";
  };

  const hasDataArray = (x: unknown): x is { readonly data: number[] } => {
    return Array.isArray((x as { data?: unknown }).data);
  };

  const hasDataFloat = (x: unknown): x is { readonly data: Float32Array } => {
    const d = (x as { data?: unknown }).data;
    return typeof d === "object" && d instanceof Float32Array;
  };

  const is2D = (a: Vector1D | Matrix2D): a is Matrix2D => {
    const first = (a as unknown[])[0];
    return Array.isArray(first);
  };

  const to1D = (a: Vector1D | Matrix2D): Vector1D => (is2D(a) ? a[0] ?? [] : a);

  const extractArray = (out: unknown): Vector1D | Matrix2D => {
    // Try tensor-like with tolist()
    if (hasToList(out)) return out.tolist();
    // Try { data: number[] }
    if (hasDataArray(out)) return out.data;
    // Try { data: Float32Array }
    if (hasDataFloat(out)) return Array.from(out.data);
    // Already array
    if (Array.isArray(out)) return out as Vector1D | Matrix2D;
    return [];
  };

  const extractLength = (out: unknown): number | null => {
    const arr = extractArray(out);
    if (arr.length === 0) return null;
    if (is2D(arr)) return (arr[0] ?? []).length;
    return arr.length;
  };

  const generateEmbeddings = async (
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> => {
    if (request.texts.length === 0) {
      return { embeddings: [], dimensions: modelDimensions };
    }

    const fe = await initializePipeline();
    const embeddings: number[][] = [];
    const batchSize = Math.min(config.maxBatchSize, request.texts.length);

    for (let i = 0; i < request.texts.length; i += batchSize) {
      const batch = request.texts.slice(i, i + batchSize);
      try {
        // Prefer single call per batch if supported
        const result = await fe(batch, {
          pooling: config.pooling,
          normalize: config.normalize,
        });
        const arr = extractArray(result);
        if (is2D(arr)) {
          // 2D array
          embeddings.push(...arr);
        } else {
          // Got a 1D array
          if (batch.length === 1) {
            embeddings.push(arr);
          } else {
            // Fallback: per-text loop
            for (const text of batch) {
              const r = await fe(text, {
                pooling: config.pooling,
                normalize: config.normalize,
              });
              const v = to1D(extractArray(r));
              embeddings.push(
                v.length ? v : new Array(modelDimensions).fill(0)
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "Transformers.js embedding batch failed, falling back:",
          error
        );
        for (const text of batch) {
          try {
            const r = await fe(text, {
              pooling: config.pooling,
              normalize: config.normalize,
            });
            const v = to1D(extractArray(r));
            embeddings.push(v.length ? v : new Array(modelDimensions).fill(0));
          } catch (err) {
            console.error("Transformers.js per-text embedding failed:", err);
            embeddings.push(new Array(modelDimensions).fill(0));
          }
        }
      }
      if (i + batchSize < request.texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return { embeddings, dimensions: modelDimensions };
  };

  const getDimensions = (): number => modelDimensions;
  const getModelName = (): string => config.model;
  const healthCheck = async (): Promise<boolean> => {
    try {
      const test = await generateEmbeddings({ texts: ["test"] });
      return (
        test.embeddings.length > 0 && test.embeddings[0].some((v) => v !== 0)
      );
    } catch (e) {
      console.error("Transformers.js health check failed:", e);
      return false;
    }
  };

  return {
    generateEmbeddings,
    getDimensions,
    getModelName,
    healthCheck,
  };
};
