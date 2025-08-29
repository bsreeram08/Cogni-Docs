# Document Types & Workflows

## Developer Document Types

```typescript
type DeveloperDocumentType =
  | "api_reference" // OpenAPI specs, REST docs
  | "sdk_documentation" // Library docs, method references
  | "codebase_analysis" // Source code files, README files
  | "tutorial_guide" // Getting started, how-to guides
  | "technical_spec" // RFCs, architecture docs
  | "changelog_release"; // Version notes, migration guides
```

## Core Workflow Types

### API Discovery Workflow

- **Documents**: api_reference, sdk_documentation
- **Rules**: extract_endpoints, map_parameters, link_examples
- **Purpose**: Cross-reference API endpoints, parameters, examples

### Codebase Onboarding Workflow

- **Documents**: codebase_analysis, tutorial_guide, technical_spec
- **Rules**: identify_entry_points, map_dependencies, extract_patterns
- **Purpose**: Help developers understand new codebases

### Integration Planning Workflow

- **Documents**: api_reference, technical_spec, sdk_documentation
- **Rules**: compatibility_check, dependency_analysis, breaking_changes
- **Purpose**: Plan integrations between systems/APIs

## Document Analysis Focus

### API Reference Documents

- Extract endpoints, methods, parameters
- Parse request/response schemas
- Identify authentication methods
- Link to working code examples

### SDK Documentation

- Map exported functions and classes
- Extract method signatures and documentation
- Identify usage patterns and examples
- Cross-reference with API endpoints

### Codebase Analysis

- Identify entry points (main.ts, index.js, app.py)
- Map module structure and exports
- Extract architectural patterns
- Build dependency graphs

### Technical Specifications

- Parse RFC-style documents
- Extract system requirements
- Identify integration points
- Map to implementation examples
