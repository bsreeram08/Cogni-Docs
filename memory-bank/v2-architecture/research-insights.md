# Research Insights from Prior Art

## LlamaIndex Agentic Document Workflows (ADW)

### Key Insights

- **Documents work together in business processes** - Real workflows involve multiple related documents, not isolated processing
- **State management across steps** - Context must be maintained throughout multi-step processes
- **Cross-document context building** - Understanding requires analysis across document boundaries
- **Workflow orchestration vs linear pipeline** - Complex processes need orchestration, not simple sequences

### ADW Architecture Patterns

- **Multi-layer modularization** - Separate parsing → chunking → embedding → annotation → indexing → retrieval
- **Agent orchestration** - Agents analyze whole docs to choose strategy/parameters and annotate chunks
- **Event-driven pipelines** - Emit stepwise events for observability and async scaling
- **Human-in-the-loop** - Allow low-confidence chunks to be flagged for review
- **Metadata-rich storage** - Persist flat fields with arrays serialized as needed

### Real-World Use Cases

- **Contract Review**: Parse contracts, cross-reference regulations, identify compliance issues
- **Patient Case Summaries**: Group related conditions/treatments, match against medical guidelines
- **Invoice Processing**: Extract data, verify against contracts, optimize payment timing
- **Claims Processing**: Organize information from multiple documents, support human decisions

## Azure AI Search Layout-Aware Chunking

### Key Insights

- **Layout-aware chunking preserves semantic boundaries** - Headers and structure are semantic information
- **Hierarchical headers as metadata** - Document structure provides meaningful context
- **Structure-aware processing respects document organization** - Don't split mid-section

### Technical Patterns

- **Document Intelligence Layout Skill** - Parse document structure and extract markdown with headers
- **Semantic Chunking** - Split by headings and coherent fragments, not just character count
- **Header Depth Preservation** - Maintain h1/h2/h3 hierarchy in metadata
- **Index Projections** - Map document structure to searchable fields

### Metadata Schema

```json
{
  "chunk": "content",
  "title": "document_title",
  "header_1": "top_level_section",
  "header_2": "subsection",
  "header_3": "detailed_section"
}
```

## Combined Approach for v2

### Workflow Orchestration + Structure Preservation

- **Event-driven workflow engine** for multi-step processing
- **Layout-aware chunking** that respects document structure
- **Cross-document analysis** for integration and compatibility
- **State management** throughout workflow execution

### Developer-Specific Adaptations

- **Code-aware structure analysis** - Understand API docs, code files, technical specs
- **Integration point detection** - Find connections between systems and APIs
- **Dependency graph construction** - Map relationships across codebases
- **Business rule application** - Validate completeness, security, compatibility

### Architecture Synthesis

```
Azure Structure Analysis + LlamaIndex Workflow Orchestration
                                ↓
    Developer-Focused Event-Driven Workflow Engine
```

## Lessons Applied to v2 Design

### From ADW

1. **Multi-document workflows** - API discovery, codebase onboarding, integration planning
2. **State-aware processing** - Maintain context across workflow stages
3. **Event-driven coordination** - Scalable async processing with observability
4. **Cross-document intelligence** - Analyze relationships and dependencies

### From Azure AI Search

1. **Structure preservation** - Respect document layout and semantic boundaries
2. **Hierarchical metadata** - Maintain header hierarchy and section context
3. **Layout-aware chunking** - Don't split mid-section or mid-code-block
4. **Semantic coherence** - Keep related content together

### Developer Domain Specialization

1. **Code entity extraction** - Functions, classes, APIs, types
2. **Dependency analysis** - Package imports, API dependencies
3. **Integration planning** - Compatibility, migration paths, adapters
4. **Quality validation** - Completeness, security, best practices

## Implementation Priorities Based on Research

### High Priority (Core Value)

- **Structure-aware chunking** - Immediate quality improvement
- **Cross-document context** - Essential for developer workflows
- **Event-driven processing** - Scalability and extensibility foundation

### Medium Priority (Enhanced Intelligence)

- **Dependency graph analysis** - Complex but high-value feature
- **Integration point detection** - Specialized but useful capability
- **Business rule engine** - Customizable validation framework

### Lower Priority (Advanced Features)

- **Breaking change detection** - Valuable but complex to implement
- **Migration path planning** - Sophisticated but specialized use case
- **Security analysis** - Important but can be added incrementally
