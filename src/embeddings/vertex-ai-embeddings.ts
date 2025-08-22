/**
 * Vertex AI embeddings implementation
 */

import { GoogleAuth } from "google-auth-library";
import type { EmbeddingService, EmbeddingRequest, EmbeddingResponse } from "./embedding-interface.js";

export interface VertexAIConfig {
  readonly projectId: string;
  readonly location: string;
  readonly model: string;
}

export const createVertexAIEmbeddingService = (config: VertexAIConfig): EmbeddingService => {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const generateEmbeddings = async (request: EmbeddingRequest): Promise<EmbeddingResponse> => {
    if (request.texts.length === 0) {
      return { embeddings: [], dimensions: 768 };
    }

    const embeddings: number[][] = [];

    for (const text of request.texts) {
      try {
        const accessToken = await auth.getAccessToken();
        const url = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.projectId}/locations/${config.location}/publishers/google/models/${config.model}:predict`;

        const requestBody = {
          instances: [{ content: text }],
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Vertex AI API Error: ${errorText}`);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as {
          predictions?: Array<{
            embeddings?: {
              values?: number[];
            };
          }>;
        };

        if (result.predictions?.[0]?.embeddings?.values) {
          embeddings.push(result.predictions[0].embeddings.values);
        } else {
          console.warn(`No embedding returned for text: ${text.substring(0, 50)}...`);
          embeddings.push(new Array(768).fill(0));
        }
      } catch (error) {
        console.error("Error generating Vertex AI embedding:", error);
        embeddings.push(new Array(768).fill(0));
      }
    }

    const dimensions = embeddings[0]?.length || 768;
    return { embeddings, dimensions };
  };

  const getDimensions = (): number => 768;

  const getModelName = (): string => config.model;

  const healthCheck = async (): Promise<boolean> => {
    try {
      const testResponse = await generateEmbeddings({ texts: ["test"] });
      return testResponse.embeddings.length > 0;
    } catch (error) {
      console.error("Vertex AI health check failed:", error);
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
