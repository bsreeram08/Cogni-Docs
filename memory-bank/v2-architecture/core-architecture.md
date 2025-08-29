# v2 Core Architecture

## Event-Driven Workflow Engine

Complete redesign from linear pipeline to event-driven workflow orchestration.

### Key Components

1. **Event Bus System** - Message broker for workflow coordination
2. **DeveloperStructureAnalyzer** - Parse API docs, code, technical specs
3. **CrossCodebaseAnalyzer** - Multi-document relationship analysis
4. **WorkflowOrchestrator** - State management and process coordination
5. **DeveloperBusinessRules** - Domain-specific validation engine

### Processing Flow

```
document.added → structure.analyzed → code.extracted → apis.discovered → dependencies.mapped → cross_references.built → workflow.completed
```

### Architecture Shift

**v1:** Document → Parse → Chunk → Agent Annotation → Embed → Store

**v2:** Documents → Event Bus → Multi-Stage Workflow Engine

- Structure Analysis (layout-aware, code-aware)
- Cross-Document Context Building
- Developer Business Rules Application
- State-Aware Processing with Event Coordination
- Workflow-Based Decision Support

### Event System

```typescript
interface WorkflowEvent {
  readonly type: DeveloperWorkflowEventType;
  readonly workflowId: string;
  readonly documentId: string;
  readonly payload: WorkflowEventPayload;
  readonly timestamp: string;
  readonly correlationId: string;
}

type DeveloperWorkflowEventType =
  | "document.added"
  | "structure.analyzed"
  | "code.extracted"
  | "apis.discovered"
  | "dependencies.mapped"
  | "cross_references.built"
  | "workflow.completed";
```

### Design Principles

- **Event-Driven**: Asynchronous, scalable processing
- **Domain-Focused**: Developer documentation specialized
- **State-Aware**: Context maintained across workflow steps
- **Cross-Document**: Multi-document analysis and relationships
- **Extensible**: Plugin-based rules and processors
