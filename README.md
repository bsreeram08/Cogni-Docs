# Documentation MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with the ability to search and query documentation using Google Cloud's Firestore Vector Search and Vertex AI embeddings.

## Architecture

This project implements a **dual-server architecture**:

1. **HTTP Upload Server** - For document ingestion and management
2. **MCP Server** - For AI assistants to query documentation

### Key Features

- **Multi-format parsing**: PDF, HTML, and plain text documents
- **Google Cloud integration**: Firestore Vector Search + Vertex AI embeddings
- **Agentic search**: Gemini AI provides intelligent answers based on documentation
- **Multi-tenant**: Multiple documentation sets with isolated search
- **Modern stack**: Bun runtime, TypeScript, Elysia framework

## Quick Start

### Prerequisites

- Bun runtime installed
- Google Cloud project with Firestore and Vertex AI enabled
- Service account with appropriate permissions

### Setup

1. **Clone and install dependencies:**
```bash
bun install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Google Cloud settings
```

3. **Start the upload server:**
```bash
bun run upload-server
```

4. **In another terminal, start the MCP server:**
```bash
bun run mcp-server
```

## Usage

### 1. Upload Documentation

Create a documentation set and upload files:

```bash
# Create a documentation set
curl -X POST http://localhost:3001/sets \
  -H "Content-Type: application/json" \
  -d '{"name": "My API Docs", "description": "REST API documentation"}'

# Upload documents (PDF, HTML, TXT)
curl -X POST http://localhost:3001/sets/{SET_ID}/upload \
  -F "files=@documentation.pdf" \
  -F "files=@api-guide.html"
```

### 2. Query via MCP

The MCP server exposes four tools:

- `list_documentation_sets` - List all available documentation sets
- `get_documentation_set` - Get details about a specific set
- `search_documentation` - Basic vector search within a set
- `agentic_search` - AI-powered search with Gemini integration

### 3. Agentic Search Example

```typescript
// In Claude or another MCP-compatible AI assistant
await mcp.callTool('agentic_search', {
  setId: 'your-set-id',
  query: 'How do I authenticate API requests?',
  limit: 10
});
```

## Configuration

### Environment Variables

```bash
# Required
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Optional
GOOGLE_CLOUD_LOCATION=us-central1
UPLOAD_SERVER_PORT=3001
UPLOAD_SERVER_HOST=localhost
```

### Google Cloud Setup

1. Enable APIs:
   - Firestore API
   - Vertex AI API

2. Create service account with roles:
   - Firestore Service Agent
   - Vertex AI User

3. Authentication options:
   - Use `gcloud auth application-default login`
   - Or set `GOOGLE_APPLICATION_CREDENTIALS` to service account key path

## Project Structure

```
src/
├── db/
│   └── firestore.ts          # Firestore operations
├── ingest/
│   └── chunker.ts            # Text chunking logic
├── parsers/
│   ├── text.ts              # Plain text parser
│   ├── html.ts              # HTML parser
│   └── pdf.ts               # PDF parser
├── processing/
│   └── document-processor.ts # Document processing pipeline
├── services/
│   ├── google-cloud.ts      # Google Cloud initialization
│   ├── embeddings.ts        # Vertex AI embeddings
│   ├── query-service.ts     # Documentation search
│   └── gemini-service.ts    # Gemini AI integration
├── utils/
│   └── ids.ts               # ID generation
├── types.ts                 # TypeScript types
├── upload-server.ts         # HTTP upload server
└── mcp-server.ts           # MCP server
```

## Development

### Scripts

```bash
bun run dev              # Hot reload main server
bun run upload-server    # Start upload server
bun run mcp-server       # Start MCP server
bun run typecheck        # Type checking
```

### Adding New Document Types

1. Create parser in `src/parsers/`
2. Add MIME type to `src/types.ts`
3. Update `parseDocumentContent` in `document-processor.ts`

## Architecture Decisions

### Why Google Cloud?

- **Firestore Vector Search**: Native vector similarity search (2024 feature)
- **Vertex AI**: High-quality text embeddings with `text-embedding-004`
- **Integrated ecosystem**: Single cloud provider for consistency
- **Cost-effective**: Pay-per-use pricing model

### Why Dual Servers?

- **Separation of concerns**: Document management vs. AI querying
- **Security**: Upload server can be internal, MCP server exposed to AI
- **Scalability**: Each can scale independently

### Why Bun?

- **Performance**: Fast startup and runtime
- **TypeScript native**: No compilation step needed
- **Modern toolchain**: Built-in testing, bundling, package management

## Troubleshooting

### Vector Search Not Working?

Currently using mock embeddings for development. To enable real Vertex AI:

1. Implement actual embedding API calls in `src/services/embeddings.ts`
2. Set up Firestore vector index configuration
3. Update vector search implementation in `src/db/firestore.ts`

### Authentication Issues?

```bash
# Check authentication
gcloud auth list
gcloud config list project

# Re-authenticate if needed
gcloud auth application-default login
```

### Common Errors

- **"Project not found"**: Check `GOOGLE_CLOUD_PROJECT_ID`
- **"API not enabled"**: Enable Firestore and Vertex AI APIs
- **"Permission denied"**: Verify service account permissions

## Future Enhancements

- [ ] Implement real Vertex AI embeddings API
- [ ] Add Firestore vector search index setup
- [ ] Support for more document formats (DOCX, Markdown)
- [ ] Document metadata search and filtering
- [ ] Batch upload improvements
- [ ] Vector search optimization
- [ ] Authentication for upload server
- [ ] Metrics and monitoring

## Contributing

This project follows the user's coding guidelines:
- TypeScript with proper typing
- Functional programming patterns
- Modular architecture
- Comprehensive error handling

## License

MIT

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
