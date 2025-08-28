# Agentic Document Processing (Chunking + Annotation)

This page explains how an agent‑guided ingestion pipeline can improve search quality for large, multi‑topic documentation sets (e.g., API manuals). It complements, not replaces, the existing chunking providers. The approach is designed to be optional and align with this project’s provider‑agnostic architecture.

## Why standard chunking struggles

- Strong topic shifts get split mid‑section, causing mixed concepts in a chunk.
- Overlaps blend adjacent topics (common in API docs with repeated field names), corrupting embeddings.
- Results become noisy: queries retrieve irrelevant sections or mixed answers.

## What “agentic” adds

- Smart topic segmentation: detect topic/section boundaries and adapt chunking params accordingly.
- Context‑rich metadata: tag each chunk with topic, section/heading, code language, entities, and a short summary.
- Quality scoring and optional pruning: identify ambiguous/weak chunks to reduce noise in retrieval.

## Recommended metadata schema (per chunk)

Keep fields flat for vector DB compatibility. Arrays may be stored as CSV when needed (e.g., Chroma).

- topic_tag: string — main subject or endpoint
- section_heading: string — original heading/subheading
- code_language: string — when code present
- entities_person: string[] — people
- entities_org: string[] — organizations/products
- summary: string — 1–2 sentence abstract
- quality_score: number (0–1) — confidence/quality
- text: string — chunk content

Example (illustrative):

```json
{
  "chunk_id": "docA-00012",
  "topic_tag": "Payments API: Create Charge",
  "section_heading": "POST /v1/charges",
  "code_language": "curl",
  "entities_person": [],
  "entities_org": ["AcmePay"],
  "summary": "Explains required parameters and error codes for creating a charge.",
  "quality_score": 0.94,
  "text": "..."
}
```

## Processing rules (ingestion)

- Chunk alignment: respect headings/semantic breaks; avoid spanning multiple topics.
- Annotation: extract topic, section, code language, entities; generate a short summary and quality score.
- Pruning (optional): drop or down‑weight chunks below a quality threshold; keep disabled by default.

## How this maps to this project

- Chunking provider: use `langchain` provider with `recursive | intelligent | semantic` strategies to get initial splits.
- Agent stage (concept):
  - Pre‑chunk analysis: adjust strategy/chunkSize/overlap based on detected boundaries.
  - Post‑chunk annotation: add metadata (topic_tag, section_heading, code_language, entities, summary, quality_score).
- Storage metadata: keep keys flat; providers like `app/storage/chroma-storage.ts` can serialize arrays to CSV (similar to existing keywords).

Note: This document describes an optional agentic stage at ingestion time. It is separate from the existing `agentic_search` MCP tool, which operates at query time.

## Configuration (preview)

The agentic stage is intended to be toggleable and provider‑agnostic, consistent with current config style:

- agent.enabled: boolean (default false)
- agent.name: string (e.g., "mastra" | "heuristic")
- agent.options: object (model/batching/timeouts/thresholds)

No runtime change is implied by this document; it describes the design and recommended fields so downstream systems can plan for tags and scores.

## Provider options

- Heuristic (fast, rules‑based): baseline alignment and tagging without an LLM.
- LLM‑driven (local): via Ollama or LM Studio (e.g., mistral/phi3/qwen‑coder). Batch annotate for throughput; use timeouts and fallback to heuristic.
- Hybrid: heuristic pre‑screen + targeted LLM when ambiguity is detected.

## Performance and UX

- Throughput: prefer batched annotation; cache per‑section summaries when possible.
- Observability: log/emit events for steps (analysis → chunking → annotation → persist) to integrate with existing SSE endpoints if needed.
- Safety: keep agent OFF by default to preserve current performance and behavior.

## Status

- This page is a design/architecture explainer for ingestion‑time agentic processing.
- Implementation is intended to be feature‑flagged and optional; current default remains the standard chunking flow.

## Architectural patterns from prior art

- Multi‑layer modularization: separate parsing → chunking → embedding → annotation → indexing → retrieval. This mirrors our provider‑agnostic directories (`app/parsers/`, `app/chunking/`, `app/embeddings/`, `app/storage/`).
- Agent orchestration: an agent stage can analyze whole docs to choose strategy/params and annotate chunks. This can be added as an optional service without changing providers.
- Event‑driven pipelines: emit stepwise events (analysis → chunking → annotation → persist) for observability and async scaling; aligns with existing SSE endpoints (`/sse`, `/messages`).
- Human‑in‑the‑loop: allow low‑confidence chunks (low `quality_score`) to be flagged for review or re‑annotation.
- Metadata‑rich storage: persist flat fields (e.g., `topic_tag`, `section_heading`, `code_language`, `summary`, `quality_score`); arrays serialized as CSV when required by the store.
- Configurable chunking: switch strategies (`recursive`, `intelligent`, `semantic`) per corpus, optionally steered by the agent.

## References & prior art

- LlamaIndex — Introducing Agentic Document Workflows (ADW): https://www.llamaindex.ai/blog/introducing-agentic-document-workflows
- LlamaIndex — Workflows (docs): https://docs.llamaindex.ai/en/stable/module_guides/workflow/
- DeepLearning.AI — Event‑driven agentic document workflows (course overview).
- Microsoft Azure AI Search — Chunk documents in vector search: https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents
- Microsoft Azure AI Search — Semantic/layout-aware chunking: https://learn.microsoft.com/en-us/azure/search/search-how-to-semantic-chunking
- Microsoft Azure AI Search — Integrated vectorization overview: https://learn.microsoft.com/en-us/azure/search/vector-search-integrated-vectorization
- Microsoft Azure AI Search — Text Split skill: https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-textsplit
- Azure Architecture Center — RAG chunking phase: https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-chunking-phase
- Pinecone — Chunking strategies for LLM/RAG: https://www.pinecone.io/learn/chunking-strategies/
- AWS — Intelligent Document Processing (IDP) overview: https://aws.amazon.com/what-is/intelligent-document-processing/
- AWS — Intelligent Document Processing on AWS (solution): https://aws.amazon.com/solutions/implementations/intelligent-document-processing-on-aws/
- Databricks — Adaptive text splitter and content‑aware chunking examples.

## Appendix: Agent‑friendly pointers (condensed)

1. Metadata fields

- topic_tag, section_heading, code_language, entities_person, entities_org, summary, quality_score, text

2. Processing rules

- Align chunks to headings/semantic breaks; avoid cross‑topic overlap
- Annotate topic/section/code/entities; generate summary + quality_score
- Optional pruning by threshold

3. Output format

- Flat JSON per chunk; arrays acceptable (may be CSV‑serialized by storage layer)

4. Integration

- Accept strategy, chunk size/overlap, pruning threshold via config
- Prefer batch annotation; log steps for observability

5. Feedback loops

- Allow new tag types; flag low‑confidence chunks for review

6. Extensibility

- Swap providers (heuristic/LLM/hybrid) behind a stable interface
