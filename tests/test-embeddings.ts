#!/usr/bin/env bun

/**
 * Test script for Vertex AI embeddings API
 */

import { getEmbeddingService } from "../src/services/embeddings.js";

async function testEmbeddings() {
  console.log("Testing Vertex AI embeddings API...");

  try {
    const embeddingService = getEmbeddingService();

    const testTexts = [
      "This is a test document about machine learning.",
      "Vector embeddings are numerical representations of text.",
      "Semantic search uses vector similarity to find relevant content.",
    ];

    console.log(`Generating embeddings for ${testTexts.length} texts...`);

    const result = await embeddingService.generateEmbeddings({
      texts: testTexts,
    });

    console.log(`✅ Success! Generated ${result.embeddings.length} embeddings`);
    console.log(`📏 Embedding dimensions: ${result.dimensions}`);

    // Check first embedding
    if (result.embeddings[0]) {
      console.log(
        `📊 First embedding sample (first 5 values): ${result.embeddings[0]
          .slice(0, 5)
          .map((v) => v.toFixed(4))
          .join(", ")}`
      );
    }

    // Verify all embeddings have correct dimensions
    const allSameDimension = result.embeddings.every(
      (emb) => emb.length === result.dimensions
    );
    console.log(
      `✅ All embeddings have consistent dimensions: ${allSameDimension}`
    );
  } catch (error) {
    console.error("❌ Error testing embeddings:", error);
    process.exit(1);
  }
}

testEmbeddings();
