#!/usr/bin/env bun

/**
 * Test script for the complete document processing pipeline
 * Tests: document set creation, document upload, processing, and search
 */

import { getDatabaseService } from "../src/db/firestore.js";
import { getDocumentProcessor } from "../src/processing/document-processor.js";
import { getQueryService } from "../src/services/query-service.js";
import { initializeGoogleCloud } from "../src/services/google-cloud.js";

async function testPipeline() {
  console.log("🧪 Testing complete document processing pipeline...\n");

  try {
    // Initialize Google Cloud services
    await initializeGoogleCloud();

    // Initialize services
    const databaseService = getDatabaseService();
    const documentProcessor = getDocumentProcessor();
    const queryService = getQueryService();

    // Step 1: Create a document set
    console.log("📁 Step 1: Creating document set...");
    const docSetResult = await databaseService.createDocumentSet({
      name: "Test Documentation",
      description: "Test document set for pipeline testing",
    });
    console.log(`✅ Created document set: ${docSetResult.id}\n`);

    // Step 2: Create test document content
    console.log("📄 Step 2: Processing test document...");
    const testContent = `
# Getting Started with AI

Artificial Intelligence (AI) is transforming how we build applications.
This guide covers the fundamentals of AI development.

## What is AI?

AI refers to machine learning algorithms that can learn from data.
Popular AI frameworks include TensorFlow and PyTorch.

## Vector Embeddings

Vector embeddings convert text into numerical representations.
These vectors capture semantic meaning and enable similarity search.

## Best Practices

1. Start with clean, well-structured data
2. Choose appropriate embedding models
3. Implement proper vector storage
4. Test your search functionality thoroughly

Vector databases like Pinecone, Weaviate, and Chroma are popular choices.
`.trim();

    const testDocumentData = Buffer.from(testContent, "utf-8");

    const processResult = await documentProcessor.processDocument({
      setId: docSetResult.id,
      filename: "getting-started-ai.txt",
      mimeType: "text/plain",
      data: testDocumentData,
    });

    console.log(`✅ Processed document: ${processResult.documentId}`);
    console.log(`📊 Created ${processResult.chunksCreated} chunks\n`);

    // Step 3: Test search functionality
    console.log("🔍 Step 3: Testing search functionality...");

    const searchQueries = [
      "What are vector embeddings?",
      "AI frameworks and libraries",
      "best practices for vector databases",
    ];

    for (const query of searchQueries) {
      console.log(`\n🔎 Searching: "${query}"`);

      const searchResults = await queryService.searchDocumentation({
        setId: docSetResult.id,
        query: query,
        limit: 3,
      });

      if (searchResults.results.length > 0) {
        console.log(`✅ Found ${searchResults.results.length} results:`);

        searchResults.results.forEach((result, index) => {
          console.log(
            `   ${index + 1}. Score: ${result.score.toFixed(
              3
            )} - "${result.text.substring(0, 80)}..."`
          );
        });
      } else {
        console.log("❌ No results found");
      }
    }

    // Step 4: Test document set retrieval
    console.log("\n📋 Step 4: Testing document set operations...");

    const retrievedSet = await databaseService.getDocumentSet(docSetResult.id);
    if (retrievedSet) {
      console.log(`✅ Retrieved document set: "${retrievedSet.name}"`);
    } else {
      console.log("❌ Failed to retrieve document set");
    }

    const allSets = await databaseService.listDocumentSets();
    console.log(`✅ Total document sets in database: ${allSets.length}`);

    console.log("\n🎉 Pipeline test completed successfully!");
  } catch (error) {
    console.error("❌ Pipeline test failed:", error);
    process.exit(1);
  }
}

testPipeline();
