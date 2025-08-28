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

# Chunking (default: LangChain recursive)
CHUNKING_NAME=langchain
CHUNKING_OPTIONS={"strategy":"recursive","chunkSize":3000,"chunkOverlap":150}
```

Alternative (Transformers.js via @huggingface/transformers):

```bash
# EMBEDDINGS_NAME=transformersjs
# EMBEDDINGS_OPTIONS={"model":"Xenova/all-MiniLM-L6-v2","device":"wasm","pooling":"mean","normalize":true,"maxBatchSize":50}
```

Notes:

- Storage and embeddings are provider-agnostic; see `.env.example` for all options.
- `HTTP_PORT` controls the upload/MCP server port.
- Chunking is pluggable via `CHUNKING_NAME` (`langchain` default, `chonkie`, or `builtin`).
- For local CPU runtimes, set Transformers.js `device` to `wasm` (WebGPU is not available on server).

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

Configure the MyContext MCP server with the Streamable HTTP endpoint:

- MCP (POST): `http://localhost:3001/mcp`

Notes:

- After server restarts, reload MCP servers in your IDE to establish a clean session.
- Avoid trailing slashes in endpoints.
- `GET /mcp` intentionally returns `405 Method Not Allowed` (this server replies with JSON over HTTP; no unsolicited SSE stream).

### Request flow

- __Initialize__ (first request):

  ```bash
  curl -i -s -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    http://localhost:3001/mcp \
    -d '{
          "jsonrpc":"2.0",
          "id":"1",
          "method":"initialize",
          "params":{
            "clientInfo":{"name":"curl","version":"0"},
            "protocolVersion":"2025-03-26",
            "capabilities":{}
          }
        }'
  ```

  - The response includes header: `Mcp-Session-Id: <uuid>` (and `X-Request-Id` for tracing).

- __Subsequent requests__ must include the session header:

  ```bash
  curl -s -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -H "Mcp-Session-Id: $SESSION_ID" \
    http://localhost:3001/mcp \
    -d '{
          "jsonrpc":"2.0",
          "id":"2",
          "method":"tools/list",
          "params":{}
        }'
  ```

- __Terminate session__ (optional):

  ```bash
  curl -i -X DELETE -H "Mcp-Session-Id: $SESSION_ID" http://localhost:3001/mcp
  ```

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

1. List sets to confirm connection.
2. Search a set, e.g., `setId=Pinelabs_API`, `query="how to create a UPI transaction"`.
3. If relevant hits found, run `agentic_search` to get a concise extractive answer.

## 9a) Advanced: Agentic document processing (optional)

You can optionally enable an agent-guided ingestion stage that aligns chunks to topic boundaries and enriches them with metadata (topic tags, section headings, code language, entities, summaries, and quality scores). This improves retrieval precision for large, multi-topic docs. See `docs/agentic-processing.md` for the design and recommended schema. The feature is designed to be toggleable and provider-agnostic.

## 10) Troubleshooting

- __Use non-watch mode__ for stability: `bun run upload-server:prod`.
- __Missing Mcp-Session-Id__:
  - After `initialize`, include `Mcp-Session-Id` on every subsequent POST `/mcp` request.
- __Bad Request: Server not initialized__:
  - Your first POST must be a JSON-RPC `initialize` request with `params.protocolVersion`, `params.clientInfo`, and `params.capabilities`.
- __Unsupported protocol version__:
  - Omit the `Mcp-Protocol-Version` header or use a supported version. The JSON payload `protocolVersion` should remain (recommended: `2025-03-26`).
- Chroma warning about "undefined embedding function":
  - Safe to ignore; embeddings are computed locally and passed explicitly to Chroma.
- Health check failing:
  - Verify Chroma is running at `http://localhost:8000`.
  - Confirm `.env` values and restart the server.
