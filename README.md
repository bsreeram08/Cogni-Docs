# Documentation MCP Server - Flexible Backend

A Model Context Protocol (MCP) server that provides AI assistants with the ability to search and query documentation. Now supports **flexible backend configurations** to meet different privacy and infrastructure requirements.

## 🆕 What's New - Flexible Backend Architecture

This version introduces a complete backend abstraction layer that allows you to choose your preferred technology stack:

### **Storage Options**

- **Firestore** - Cloud-native, managed by Google
- **ChromaDB** - Open-source vector database

### **Embedding Options**

- **Vertex AI** - Google's cloud embedding service
- **Xenova/Transformers** - Local, privacy-focused embeddings

### Provider registry and provider-agnostic configuration (New)

We now use a plugin-style provider registry with auto-registration. Configuration no longer references specific providers in the schema; instead you specify:

```bash
# Storage
STORAGE_NAME=chroma
STORAGE_OPTIONS={"url":"http://localhost:8000"}

# Embeddings
EMBEDDINGS_NAME=xenova
EMBEDDINGS_OPTIONS={"model":"Xenova/all-MiniLM-L6-v2","maxBatchSize":50}
```

Notes:

- Providers self-register via `src/*/providers/index.ts` side-effect imports.
- Adding a provider is as simple as adding a new file that calls `register*Provider()`.
- Old variables like `STORAGE_PROVIDER`, `EMBEDDING_PROVIDER`, `CHROMA_URL`, `XENOVA_MODEL` are supported for backward-compat in parsing, but are deprecated.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Client    │    │   HTTP Upload    │    │   Web UI        │
│   (Claude)      │    │   Server         │    │   (Optional)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                     ┌─────────────────────┐
                     │  Service Provider   │
                     │  (Abstraction)      │
                     └─────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
        ┌────────────────┐        ┌───────────────┐
        │  Storage Layer │        │ Embedding     │
        │                │        │ Layer         │
        ├────────────────┤        ├───────────────┤
        │ • Firestore    │        │ • Vertex AI   │
        │ • ChromaDB     │        │ • Xenova      │
        │                │        │               │
        └────────────────┘        └───────────────┘
```

## 🚀 Quick Start

[Installation & Setup](docs/installation.md)

### Privacy-Focused Setup (Local Only)

```bash
# Clone and install
git clone <repository>
cd documentation-mcp
bun install

# Configure for local processing
cp .env.example .env
# Edit .env with provider-agnostic config:
STORAGE_NAME=chroma
STORAGE_OPTIONS={"url":"http://localhost:8000"}
EMBEDDINGS_NAME=xenova
EMBEDDINGS_OPTIONS={"model":"Xenova/all-MiniLM-L6-v2","maxBatchSize":50}

# Start servers
bun run upload-server:dev  # Upload server on :3001
bun run mcp-server        # MCP server for Claude
```

### Cloud-Optimized Setup (Google Cloud)

```bash
# Install and configure
bun install
cp .env.example .env

# Edit .env (provider-agnostic):
STORAGE_NAME=firestore
STORAGE_OPTIONS={"projectId":"your-project-id"}
EMBEDDINGS_NAME=vertex-ai
EMBEDDINGS_OPTIONS={"model":"text-embedding-004","location":"us-central1"}

# Authenticate with Google Cloud
gcloud auth application-default login

# Start servers
bun run upload-server:dev
bun run mcp-server
```

### Hybrid Setup (ChromaDB + Local Embeddings)

```bash
# Start ChromaDB
docker run -p 8000:8000 chromadb/chroma

# Configure app
STORAGE_NAME=chroma
STORAGE_OPTIONS={"url":"http://localhost:8000"}
EMBEDDINGS_NAME=xenova
EMBEDDINGS_OPTIONS={"model":"Xenova/all-MiniLM-L6-v2"}

# Start app
bun run upload-server:dev
bun run mcp-server
```

## 📋 Configuration Options

### Environment Variables

| Variable             | Type   | Description                                                                                                |
| -------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `HTTP_PORT`          | number | Upload server port (default: 3001 in examples, config default 8787)                                        |
| `STORAGE_NAME`       | string | Storage provider name (e.g., `chroma`, `firestore`)                                                        |
| `STORAGE_OPTIONS`    | JSON   | Provider-specific options as JSON (e.g., `{ "url": "http://localhost:8000" }` or `{ "projectId": "..." }`) |
| `EMBEDDINGS_NAME`    | string | Embeddings provider name (e.g., `xenova`, `vertex-ai`)                                                     |
| `EMBEDDINGS_OPTIONS` | JSON   | Provider-specific options as JSON (e.g., `{ "model": "Xenova/all-MiniLM-L6-v2" }`)                         |
| `CHUNK_SIZE`         | number | Target chunk size for splitting documents (default: 1000)                                                  |
| `CHUNK_OVERLAP`      | number | Overlap between chunks in characters (default: 200)                                                        |
| `MAX_CHUNK_SIZE`     | number | Hard cap for chunk size (default: 2000)                                                                    |

See `.env.example` for complete configuration options.

Deprecated (still parsed for backward compatibility): `STORAGE_PROVIDER`, `EMBEDDING_PROVIDER`, `CHROMA_URL`, `XENOVA_MODEL`, `MAX_BATCH_SIZE`, `UPLOAD_SERVER_PORT`, `UPLOAD_SERVER_HOST`.

## 🔧 Technology Stack Comparison

| Feature              | Firestore + Vertex AI | ChromaDB + Xenova |
| -------------------- | --------------------- | ----------------- |
| **Privacy**          | ❌ Cloud-based        | ✅ Self-hosted    |
| **Performance**      | ✅ Excellent          | ✅ Good           |
| **Scalability**      | ✅ Unlimited          | ✅ High           |
| **Setup Complexity** | ⚠️ Medium             | ⚠️ Medium         |
| **Cost**             | 💰 Pay-per-use        | 💰 Infrastructure |
| **Offline Support**  | ❌ No                 | ⚠️ Partial        |

## 🎯 Use Cases

### **Enterprise/Production**

→ **Firestore + Vertex AI**

- Automatic scaling
- Enterprise security
- Managed infrastructure

### **Privacy-Sensitive**

→ **ChromaDB + Xenova**

- No external cloud dependencies
- Complete data control
- Works in air-gapped environments

### **Development/Research**

→ **ChromaDB + Xenova**

- Easy experimentation
- Good performance
- Flexible deployment

## 📁 Project Structure

```
src/
├── config/
│   └── app-config.ts          # Configuration management with Zod
├── storage/
│   ├── storage-interface.ts   # Common storage interface
│   ├── firestore-storage.ts   # Firestore implementation
│   ├── chroma-storage.ts      # ChromaDB implementation
│   └── storage-factory.ts     # Factory for storage services
├── embeddings/
│   ├── embedding-interface.ts # Common embedding interface
│   ├── vertex-ai-embeddings.ts # Vertex AI implementation
│   ├── xenova-embeddings.ts   # Xenova implementation
│   └── embedding-factory.ts   # Factory for embedding services
├── services/
│   └── service-provider.ts    # Singleton service manager
├── validation/
│   └── api-schemas.ts         # Zod validation schemas
└── processing/
    └── document-processor.ts  # Updated to use abstractions
```

## 🔌 API Endpoints

### Upload Server (Port 3001)

- `GET /health` - Service health check with provider status
- `GET /sets` - List documentation sets
- `POST /sets` - Create documentation set
- `GET /sets/:setId` - Get specific set
- `GET /sets/:setId/documents` - List documents in set
- `POST /sets/:setId/upload` - Upload documents
- `DELETE /sets/:setId/documents/:docId` - Delete document

### MCP Server (stdio)

- `list_documentation_sets` - List available sets
- `search_documentation` - Vector search within sets
- `ask_documentation` - AI-powered question answering

## 🛠️ Development

```bash
# Install dependencies
bun install

# Development with file watching
bun run dev              # Upload server with hot reload
bun run web:dev         # Web UI development server

# Type checking
bun run typecheck

# Build for production
bun run web:build
```

## 🔍 Health Monitoring

Check service status:

```bash
curl http://localhost:3001/health
```

Response includes:

- Overall service health
- Storage provider status
- Embedding provider status
- System uptime

## 🤝 Contributing

The flexible backend architecture makes it easy to add new providers:

1. **Storage Provider**: Implement `StorageService` interface
2. **Embedding Provider**: Implement `EmbeddingService` interface
3. **Update Factories**: Add to respective factory files
4. **Configuration**: Add options to config schema

## 📄 License

MIT License - see LICENSE file for details.

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
await mcp.callTool("agentic_search", {
  setId: "your-set-id",
  query: "How do I authenticate API requests?",
  limit: 10,
});
```

## Configuration

### Environment Variables

```bash
# Core
HTTP_PORT=3001

# Provider-agnostic
STORAGE_NAME=chroma
STORAGE_OPTIONS={"url":"http://localhost:8000"}
EMBEDDINGS_NAME=xenova
EMBEDDINGS_OPTIONS={"model":"Xenova/all-MiniLM-L6-v2","maxBatchSize":50}

# Chunking
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_CHUNK_SIZE=2000
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
