# Contributing to cogni-docs

Thank you for considering a contribution! This project aims to provide a local-first, provider-agnostic MCP server for documentation ingestion and search.

## Development Setup

- Prerequisites: Bun >= 1.0, Node toolchain (for optional web UI), Docker (optional for ChromaDB)
- Install: `bun install`
- Typecheck: `bun run typecheck`
- Start server (prod): `bun run upload-server:prod`
- Start server (dev/watch): `bun run upload-server:dev`
- Start Chroma: `docker run -p 8000:8000 chromadb/chroma` or `bun run start:chroma`
- Upload API smoke test: `bun run test:upload-server`

## Commit Messages

- Use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
- Examples:
  - `feat(upload): support PDF ingestion`
  - `fix(chunking): prevent empty chunk edge case`
  - `docs(installation): add Windsurf MCP config`

## Pull Requests

- Include a clear description: Problem, Solution, Implementation, Limitations.
- Add tests or smoke steps when feasible.
- Keep PRs focused and reasonably small.

## Coding Standards

- Language: TypeScript, use strict typing; avoid `any`.
- Style: Prettier (configured). Run `bun run format`.
- Functions: small and single-purpose; prefer early returns.
- Config: provider-agnostic, environment-driven.

## Reporting Issues

- Use the issue templates (bug report / feature request).
- Include repro steps, logs, and environment details.

## Security

- Please do not disclose security issues publicly. See `SECURITY.md` for responsible disclosure instructions.

## License

- By contributing, you agree that your contributions are licensed under the MIT License.
