# Installation & Setup Guide

This project provides a Model Context Protocol (MCP) server and an upload server for documentation ingestion and search. Follow the steps below for a reliable local setup.

## 1) Prerequisites
- Bun >= 1.0
- Node toolchain (for optional web UI)
- Optional: Docker (to run ChromaDB locally)

## 2) Clone & Install
```bash
git clone <repository>
cd documentation-mcp
bun install
```

## 3) Configure Environment
1. Copy env template and edit values:
```bash
cp .env.example .env
```
2. Recommended local (privacy-first) config:
```bash
HTTP_PORT=3001
STORAGE_NAME=chroma
STORAGE_OPTIONS={"url":"http://localhost:8000"}
EMBEDDINGS_NAME=xenova
EMBEDDINGS_OPTIONS={"model":"Xenova/all-MiniLM-L6-v2","maxBatchSize":50}
```
Notes:
- Storage and embeddings are provider-agnostic; see `.env.example` for all options.
- `HTTP_PORT` controls the upload/MCP server port.

## 4) Start Dependencies (ChromaDB)
If using ChromaDB locally:
```bash
# Option A: Docker
docker run -p 8000:8000 chromadb/chroma

# Option B: Local (if chroma CLI installed)
bun run start:chroma
```

## 5) Start Servers
For best stability with MCP, prefer non-watch (prod) mode:
```bash
# Upload + MCP servers (same process)
bun run upload-server:prod
```
Dev (watch) mode is available but can drop SSE connections during hot-reload:
```bash
bun run upload-server:dev
```

## 6) Verify Health
```bash
curl http://localhost:3001/health
```
Expected JSON includes `status: "healthy"`, `storage: chroma`, `embeddings: xenova`.

## 7) Connect MCP Client (Windsurf / Claude Desktop)
Configure the MyContext MCP server with these endpoints:
- SSE (GET): `http://localhost:3001/sse`
- Messages (POST): `http://localhost:3001/messages`

Tips:
- After server restarts or first-time errors, refresh/reload MCP servers in the IDE to establish a clean session.
- Avoid trailing slashes in endpoints.

## 8) Ingest Documentation (Optional)
Use the upload endpoints from the same server:
- `GET /sets` — list sets
- `POST /sets` — create a set
- `POST /sets/:setId/upload` — upload PDF/HTML/TXT
- `GET /sets/:setId/documents` — list documents in the set

Quick example (list documents in a set called `Pinelabs_API`):
```bash
curl -s http://localhost:3001/sets/Pinelabs_API/documents | jq .
```

## 9) Query via MCP
Available MCP tools (from the MyContext provider):
- `list_documentation_sets` — list sets
- `get_documentation_set` — set details
- `search_documentation` — vector search within a set
- `agentic_search` — extractive answer from top results

Example flow:
1) List sets to confirm connection.
2) Search a set, e.g., `setId=Pinelabs_API`, `query="how to create a UPI transaction"`.
3) If relevant hits found, run `agentic_search` to get a concise extractive answer.

## 10) Troubleshooting
- SSE terminated / transport error:
  - Use non-watch mode: `bun run upload-server:prod`.
  - Refresh MCP servers in the IDE to create a fresh GET `/sse` session.
  - Ensure the client uses GET `/sse` and POST `/messages` (a `POST /sse` is invalid and will fail).
- Chroma warning about "undefined embedding function":
  - Safe to ignore; embeddings are computed locally and passed explicitly to Chroma.
- Health check failing:
  - Verify Chroma is running at `http://localhost:8000`.
  - Confirm `.env` values and restart the server.
