# Enhanced Metadata Schema

## DeveloperChunkMetadata

```typescript
interface DeveloperChunkMetadata {
  // Technical Structure
  readonly document_type: DeveloperDocumentType;
  readonly code_language: string[]; // ['typescript', 'python']
  readonly framework: string[]; // ['react', 'fastapi']
  readonly api_methods: string[]; // ['GET /users', 'POST /auth']
  readonly code_entities: CodeEntity[];

  // Cross-Document Intelligence
  readonly related_apis: string[]; // IDs of related endpoints
  readonly dependency_chain: string[]; // Libraries referenced
  readonly integration_points: string[]; // Connection points
  readonly breaking_changes: BreakingChange[];

  // Developer Experience
  readonly complexity_level: "beginner" | "intermediate" | "advanced";
  readonly completeness_score: number; // Has examples, params?
  readonly maintainability_flags: string[]; // ['outdated_example']

  // Workflow Context
  readonly workflow_stage: DeveloperWorkflowStage;
  readonly cross_doc_context: CrossDocumentContext;
}
```

## CodeEntity Structure

```typescript
interface CodeEntity {
  readonly type: string; // 'class', 'function', 'endpoint', 'type'
  readonly name: string; // 'UserService', 'createUser', '/api/users'
  readonly signature: string; // Full function/method signature
  readonly namespace: string; // 'auth.service', 'api.v1'
}

interface CodeElement {
  readonly type: "function" | "class" | "interface" | "endpoint" | "schema";
  readonly name: string; // 'UserService', 'createUser'
  readonly signature: string; // Full function signature
  readonly documentation: string; // JSDoc, docstrings
  readonly examples: string[]; // Usage examples
  readonly relatedElements: string[]; // Cross-references
}
```

## Workflow Stage Types

```typescript
type DeveloperWorkflowStage =
  | "discovery" // Finding relevant docs/APIs
  | "analysis" // Understanding structure/dependencies
  | "integration" // Planning connections between systems
  | "implementation" // Ready for developer use
  | "maintenance"; // Ongoing updates/compatibility
```

## API Structure Metadata

```typescript
interface APIStructure {
  readonly endpoints: APIEndpoint[]; // GET /users, POST /auth
  readonly schemas: JSONSchema[]; // Request/response models
  readonly authentication: AuthMethod[]; // OAuth, API keys
  readonly examples: CodeExample[]; // curl, SDK examples
}

interface APIEndpoint {
  readonly method: string; // 'GET', 'POST', 'PUT'
  readonly path: string; // '/api/v1/users/{id}'
  readonly parameters: Parameter[]; // Query, path, body params
  readonly responses: Response[]; // Status codes, schemas
  readonly examples: string[]; // Working code examples
}
```

## Codebase Structure Metadata

```typescript
interface CodebaseStructure {
  readonly entryPoints: string[]; // main.ts, index.js, app.py
  readonly modules: ModuleInfo[]; // Exported functions/classes
  readonly dependencies: Dependency[]; // Package imports
  readonly patterns: ArchitecturalPattern[]; // MVC, microservices, etc.
}
```
