# Developer Business Rules Engine

## API Documentation Rules

### validate_api_completeness

- Check for missing parameters in endpoint documentation
- Verify response schemas are documented
- Ensure code examples are provided for each endpoint
- Validate authentication requirements are specified

### check_example_freshness

- Verify code examples work with current API versions
- Check for deprecated syntax in examples
- Validate example outputs match current API responses
- Flag examples using outdated libraries or frameworks

### detect_deprecation_warnings

- Identify deprecated APIs and suggest alternatives
- Flag sunset timelines and migration deadlines
- Recommend replacement APIs or methods
- Generate deprecation impact analysis

## Codebase Analysis Rules

### identify_anti_patterns

- Detect problematic code patterns and practices
- Flag potential performance bottlenecks
- Identify security vulnerabilities in code examples
- Spot maintainability issues and technical debt

### suggest_refactoring

- Recommend architectural improvements
- Suggest design pattern applications
- Identify code duplication and extraction opportunities
- Propose modularization strategies

### check_security_practices

- Validate security implementations in examples
- Check for exposed credentials or sensitive data
- Verify input validation and sanitization
- Flag insecure authentication patterns

## Integration Planning Rules

### validate_compatibility

- Check version compatibility across dependencies
- Identify conflicting library requirements
- Validate API version compatibility
- Flag breaking changes between versions

### suggest_migration_paths

- Plan upgrade sequences for breaking changes
- Recommend incremental migration strategies
- Identify critical dependencies for upgrade priority
- Generate migration checklists and timelines

### optimize_integration_order

- Recommend optimal implementation sequence
- Identify dependency prerequisites
- Plan parallel vs sequential integration steps
- Minimize integration risks and conflicts

## Rule Engine Interface

```typescript
interface DeveloperBusinessRules {
  // API Documentation Rules
  readonly validate_api_completeness: (api: APIStructure) => ValidationResult;
  readonly check_example_freshness: (examples: CodeExample[]) => FreshnessReport;
  readonly detect_deprecation_warnings: (content: string) => DeprecationWarning[];

  // Codebase Analysis Rules
  readonly identify_anti_patterns: (code: CodebaseStructure) => AntiPattern[];
  readonly suggest_refactoring: (patterns: ArchitecturalPattern[]) => RefactoringHint[];
  readonly check_security_practices: (code: CodeElement[]) => SecurityIssue[];

  // Integration Rules
  readonly validate_compatibility: (deps: Dependency[]) => CompatibilityIssue[];
  readonly suggest_migration_paths: (breaking: BreakingChange[]) => MigrationPath[];
  readonly optimize_integration_order: (integrations: IntegrationPoint[]) => ExecutionPlan;
}
```

## Rule Results

```typescript
interface ValidationResult {
  readonly passed: boolean;
  readonly issues: ValidationIssue[];
  readonly score: number;
  readonly recommendations: string[];
}

interface FreshnessReport {
  readonly outdatedExamples: string[];
  readonly deprecatedSyntax: string[];
  readonly updateRecommendations: string[];
  readonly freshnessScore: number;
}

interface SecurityIssue {
  readonly type: string; // 'exposed_credentials', 'sql_injection'
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly location: string; // File/line reference
  readonly description: string;
  readonly remediation: string;
}

interface MigrationPath {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly steps: MigrationStep[];
  readonly estimatedEffort: string;
  readonly risks: string[];
}
```

## Domain-Specific Customization

### Framework-Specific Rules

- React/Next.js best practices
- Node.js/Express patterns
- Python/FastAPI conventions
- REST/GraphQL API standards

### Language-Specific Validations

- TypeScript type safety
- Python type hints
- JavaScript modern syntax
- Documentation format compliance

### Platform-Specific Checks

- Cloud deployment patterns
- Container orchestration
- CI/CD pipeline integration
- Monitoring and observability
