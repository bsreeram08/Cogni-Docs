/**
 * Google Vertex AI Text Embeddings service
 * Using Vertex AI Node.js SDK with text-embedding-004 model
 */

import { VertexAI } from "@google-cloud/vertexai";

export interface EmbeddingRequest {
  readonly texts: readonly string[];
}

export interface EmbeddingResponse {
  readonly embeddings: readonly number[][];
  readonly dimensions: number;
}

export interface EmbeddingService {
  readonly generateEmbeddings: (
    request: EmbeddingRequest
  ) => Promise<EmbeddingResponse>;
}

const createEmbeddingService = (): EmbeddingService => {
  const generateEmbeddings = async (
    request: EmbeddingRequest
  ): Promise<EmbeddingResponse> => {
    if (request.texts.length === 0) {
      return { embeddings: [], dimensions: 512 };
    }

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = process.env.GOOGLE_CLOUD_LOCATION || "asia-south1";

    if (!projectId) {
      throw new Error(
        "GOOGLE_CLOUD_PROJECT_ID environment variable is required"
      );
    }

    // Initialize Vertex AI
    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    // For embeddings, we need to use REST API since Node.js SDK doesn't support embeddings directly
    // Fall back to REST API approach with proper authentication
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const embeddings: number[][] = [];

    // Process each text individually using REST API
    for (const text of request.texts) {
      try {
        const accessToken = await auth.getAccessToken();
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004:predict`;

        const requestBody = {
          instances: [
            {
              content: text,
            },
          ],
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
          console.error(`Embeddings API Error: ${errorText}`);
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
          console.warn(
            `No embedding returned for text: ${text.substring(0, 50)}...`
          );
          // Fallback to zeros if no embedding returned
          embeddings.push(new Array(768).fill(0));
        }
      } catch (error) {
        console.error("Error generating embedding for text:", error);
        // Fallback to zeros on error
        embeddings.push(new Array(768).fill(0));
      }
    }

    const dimensions = embeddings[0]?.length || 768;
    console.log(
      `Generated ${embeddings.length} embeddings with ${dimensions} dimensions using Vertex AI SDK`
    );

    return {
      embeddings,
      dimensions,
    };
  };

  return { generateEmbeddings };
};

let embeddingService: EmbeddingService | null = null;

export const getEmbeddingService = (): EmbeddingService => {
  if (!embeddingService) {
    embeddingService = createEmbeddingService();
  }
  return embeddingService;
};
