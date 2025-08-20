/**
 * MCP Server for Documentation Querying
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { initializeGoogleCloud } from './services/google-cloud.js';
import { getDatabaseService } from './db/firestore.js';
import { getQueryService } from './services/query-service.js';
import { getGeminiService } from './services/gemini-service.js';

// Initialize Google Cloud services
await initializeGoogleCloud();

const server = new McpServer({
  name: 'documentation-mcp',
  version: '1.0.0',
});

// Tool: List documentation sets
server.registerTool(
  'list_documentation_sets',
  {
    title: 'List Documentation Sets',
    description: 'List all available documentation sets',
    inputSchema: {},
  },
  async () => {
    const databaseService = getDatabaseService();
    const sets = await databaseService.listDocumentSets();
    
    const setsText = sets.map(set => 
      `• **${set.name}** (ID: ${set.id})\n  ${set.description || 'No description'}\n  Created: ${set.createdAt}`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: sets.length > 0 
          ? `Found ${sets.length} documentation set(s):\n\n${setsText}`
          : 'No documentation sets found. Create one using the upload server first.'
      }]
    };
  }
);

// Tool: Search documentation
server.registerTool(
  'search_documentation',
  {
    title: 'Search Documentation',
    description: 'Search for information within a specific documentation set',
    inputSchema: {
      setId: z.string().describe('The ID of the documentation set to search'),
      query: z.string().describe('The search query or question'),
      limit: z.number().optional().default(5).describe('Maximum number of results to return (default: 5)'),
    },
  },
  async ({ setId, query, limit }) => {
    try {
      const queryService = getQueryService();
      const response = await queryService.searchDocumentation({ setId, query, limit });
      
      if (response.results.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No relevant documentation found for query: "${query}" in set ${setId}`
          }]
        };
      }
      
      const resultsText = response.results.map((result, index) => 
        `**Result ${index + 1}** (Score: ${result.score.toFixed(3)})\n` +
        `Document ID: ${result.documentId}\n` +
        `Chunk ID: ${result.chunkId}\n\n` +
        `${result.text}\n\n---`
      ).join('\n\n');
      
      return {
        content: [{
          type: 'text',
          text: `Found ${response.results.length} relevant result(s) for "${query}":\n\n${resultsText}`
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error searching documentation: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
);

// Tool: Get documentation set info
server.registerTool(
  'get_documentation_set',
  {
    title: 'Get Documentation Set Info',
    description: 'Get detailed information about a specific documentation set',
    inputSchema: {
      setId: z.string().describe('The ID of the documentation set'),
    },
  },
  async ({ setId }) => {
    try {
      const databaseService = getDatabaseService();
      const docSet = await databaseService.getDocumentSet(setId);
      
      if (!docSet) {
        return {
          content: [{
            type: 'text',
            text: `Documentation set with ID ${setId} not found.`
          }]
        };
      }
      
      const infoText = `**${docSet.name}**\n\n` +
        `ID: ${docSet.id}\n` +
        `Description: ${docSet.description || 'No description'}\n` +
        `Created: ${docSet.createdAt}`;
      
      return {
        content: [{
          type: 'text',
          text: infoText
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error retrieving documentation set: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
);

// Tool: Agentic search with Gemini
server.registerTool(
  'agentic_search',
  {
    title: 'Agentic Documentation Search',
    description: 'Use Gemini AI to provide intelligent answers based on documentation search results',
    inputSchema: {
      setId: z.string().describe('The ID of the documentation set to search'),
      query: z.string().describe('The question or query to answer using documentation'),
      limit: z.number().optional().default(10).describe('Maximum number of search results to use as context (default: 10)'),
    },
  },
  async ({ setId, query, limit }) => {
    try {
      const queryService = getQueryService();
      const geminiService = getGeminiService();
      const databaseService = getDatabaseService();
      
      // Get documentation set info for context
      const docSet = await databaseService.getDocumentSet(setId);
      const setName = docSet?.name || 'documentation';
      
      // First, search for relevant documentation
      const searchResponse = await queryService.searchDocumentation({ setId, query, limit });
      
      if (searchResponse.results.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No relevant documentation found for query: "${query}" in set ${setName}. Please try a different search term or upload relevant documentation first.`
          }]
        };
      }
      
      // Use Gemini to generate an intelligent response
      const agenticResponse = await geminiService.agenticSearch({
        query,
        context: searchResponse.results,
        setName,
      });
      
      const responseText = `**Question:** ${query}\n\n` +
        `**Answer:** ${agenticResponse.answer}\n\n` +
        `**Analysis:** ${agenticResponse.reasoning}\n\n` +
        `---\n\n` +
        `*Based on ${searchResponse.results.length} documentation source(s) from ${setName}*`;
      
      return {
        content: [{
          type: 'text',
          text: responseText
        }]
      };
      
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error during agentic search: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
);

// Start the server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

console.log('📖 Documentation MCP Server started');
console.log('Available tools:');
console.log('  - list_documentation_sets: List all documentation sets');
console.log('  - search_documentation: Search within a documentation set');
console.log('  - get_documentation_set: Get documentation set details');
console.log('  - agentic_search: AI-powered intelligent documentation search with Gemini');
