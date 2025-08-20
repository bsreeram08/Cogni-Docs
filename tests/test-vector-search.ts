#!/usr/bin/env bun

/**
 * Simple test to verify vector search functionality
 */

import { getDatabaseService } from "../src/db/firestore.js";
import { getEmbeddingService } from "../src/services/embeddings.js";
import { initializeGoogleCloud } from "../src/services/google-cloud.js";

async function testVectorSearch() {
  console.log("🔍 Testing vector search functionality...\n");

  try {
    // Initialize services
    await initializeGoogleCloud();
    const databaseService = getDatabaseService();
    const embeddingService = getEmbeddingService();

    // Create document set
    const docSetResult = await databaseService.createDocumentSet({
      name: "Vector Test",
      description: "Test for vector search",
    });
    console.log(`Created test document set: ${docSetResult.id}`);

    // Add test document with simple content
    const testText = "Machine learning uses neural networks and algorithms.";

    // Add document metadata
    await databaseService.addDocument({
      id: "test-doc",
      setId: docSetResult.id,
      filename: "test.txt",
      mime: "text/plain",
      sizeBytes: testText.length,
      createdAt: new Date().toISOString(),
    });

    // Add chunk
    await databaseService.addChunks([
      {
        id: "test-chunk",
        setId: docSetResult.id,
        documentId: "test-doc",
        ordinal: 0,
        text: testText,
      },
    ]);

    // Generate and store embedding
    const embeddingResponse = await embeddingService.generateEmbeddings({
      texts: [testText],
    });
    await databaseService.addEmbeddings([
      {
        chunkId: "test-chunk",
        setId: docSetResult.id,
        dimension: embeddingResponse.dimensions,
        vector: embeddingResponse.embeddings[0] || [],
      },
    ]);

    console.log("✅ Test data stored successfully");

    // Wait a bit for Firestore indexing
    console.log("⏳ Waiting 10 seconds for Firestore indexing...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Test search
    console.log("🔎 Testing vector search...");
    const searchQuery = "What is machine learning?";
    const queryEmbedding = await embeddingService.generateEmbeddings({
      texts: [searchQuery],
    });

    const results = await databaseService.searchSimilar(
      docSetResult.id,
      queryEmbedding.embeddings[0] || [],
      5
    );

    console.log(`Found ${results.length} results:`);
    results.forEach((result, index) => {
      console.log(
        `  ${index + 1}. Score: ${result.score.toFixed(3)} - "${
          result.chunk.text
        }"`
      );
    });

    if (results.length > 0) {
      console.log("\n✅ Vector search working correctly!");
    } else {
      console.log("\n❌ Vector search returned no results");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testVectorSearch();
