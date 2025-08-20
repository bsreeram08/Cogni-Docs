/**
 * Google Gemini AI service for agentic search
 */

import type { VertexAI } from '@google-cloud/vertexai';
import { getGoogleCloudServices } from './google-cloud.js';
import type { SearchResultItem } from '../types.js';

export interface AgenticSearchRequest {
  readonly query: string;
  readonly context: readonly SearchResultItem[];
  readonly setName?: string;
}

export interface AgenticSearchResponse {
  readonly answer: string;
  readonly reasoning: string;
}

export interface GeminiService {
  readonly agenticSearch: (request: AgenticSearchRequest) => Promise<AgenticSearchResponse>;
}

const createGeminiService = (vertexAI: VertexAI): GeminiService => {
  const agenticSearch = async (request: AgenticSearchRequest): Promise<AgenticSearchResponse> => {
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    // Create context from search results
    const contextText = request.context.map((result, index) => 
      `[Source ${index + 1}] (Score: ${result.score.toFixed(3)})\n${result.text}`
    ).join('\n\n---\n\n');

    const systemPrompt = `You are an expert documentation assistant. Your task is to provide accurate, helpful answers based ONLY on the provided documentation context.

Guidelines:
1. Use ONLY the information from the provided documentation sources
2. If the answer isn't in the documentation, clearly state that
3. Cite specific sources when referencing information (e.g., "According to Source 1...")
4. Provide reasoning for how you arrived at your answer
5. Be concise but comprehensive
6. If multiple sources provide conflicting information, note the conflicts

Context from ${request.setName || 'documentation'}:
${contextText}

User Question: ${request.query}

Please provide:
1. A direct answer to the question
2. Your reasoning process for arriving at this answer`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      });

      const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      const response = responseText || 'No response generated from Gemini';

      // Try to split answer and reasoning (basic parsing)
      const sections = response.split('\n\n');
      let answer = response;
      let reasoning = 'Based on the provided documentation context.';

      // Look for common patterns to separate answer from reasoning
      if (sections.length > 1) {
        // Simple heuristic: first paragraph is usually the answer
        answer = sections[0] || response;
        reasoning = sections.slice(1).join('\n\n') || 'Based on the provided documentation context.';
      }

      return {
        answer: answer.trim(),
        reasoning: reasoning.trim(),
      };

    } catch (error) {
      console.error('Error with Gemini API:', error);
      throw new Error(`Failed to generate agentic response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return { agenticSearch };
};

let geminiService: GeminiService | null = null;

export const getGeminiService = (): GeminiService => {
  if (!geminiService) {
    const { vertexAI } = getGoogleCloudServices();
    geminiService = createGeminiService(vertexAI);
  }
  return geminiService;
};
