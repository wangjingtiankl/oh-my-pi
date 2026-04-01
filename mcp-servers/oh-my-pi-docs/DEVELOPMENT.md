# MCP Server Development Guide

## Core Philosophy

### Skill vs MCP: Responsibility Separation

When building knowledge tools for coding agents, maintain clear separation between **decision logic** and **content delivery**:

| Layer | Responsibility | Characteristics |
|-------|---------------|-----------------|
| **Skill** | Decision + Concepts | Always in context, zero query cost, guides agent reasoning |
| **MCP** | Content Delivery | On-demand query, detailed definitions, complete examples |

**Why this separation matters**:

1. **Skills are free** — They inject knowledge into every LLM call without the agent needing to actively query. Use them for:
   - Conceptual frameworks ("what is X")
   - Decision logic ("when to use X")
   - User correction guidance ("user says X but actually needs Y")
   - Quick reference tables ("API signature cheatsheet")

2. **MCP tools are precise** — They provide detailed, queryable content on demand. Use them for:
   - Complete API definitions (full interface with all fields)
   - Type signatures (exact parameter types, return types)
   - Full code examples (complete source files)
   - Detailed documentation (full guides, not summaries)

### The Anti-Pattern

**Don't duplicate content between skill and MCP**:

```
❌ BAD: Skill contains API signatures + MCP also returns API signatures
   → Maintenance burden, potential inconsistency, wasted context tokens

✅ GOOD: Skill explains "what the API is for" + MCP returns "exact signature"
   → Each layer has unique value, no redundancy
```

**Don't put decision logic in MCP**:

```
❌ BAD: MCP tool `query_mechanism` recommends extension/hook/skill
   → Agent must call tool to get decision, skill's decision framework is unused

✅ GOOD: Skill contains decision flow + MCP provides detailed guides
   → Agent understands concepts from skill, queries details from MCP
```

## Design Principles

### 1. Skill: Zero-Cost Understanding

A skill should enable the agent to make correct decisions without calling any tools.

**Good skill content**:
```
## When to Use Custom Tool vs Extension

Custom Tool: Single LLM-callable function
- One tool = one module
- No events, no commands
- Use when: model_call trigger, single purpose

Extension: Multi-component runtime module
- Tools + commands + events + UI
- Full session access
- Use when: multiple tools OR need events OR need session state
```

**Bad skill content**:
```
## API Reference

registerTool(options: {
  name: string;
  label: string;
  description: string;
  parameters: TSchema;
  execute: (id, params, signal, onUpdate, ctx) => Promise<Result>;
  ...
})
```
→ This belongs in MCP, not skill. It's reference material, not decision logic.

### 2. MCP: On-Demand Precision

MCP tools should return complete, precise content that the skill cannot reasonably include.

**Good MCP tool**:
```
omp_get_api({ method: "registerTool" })
→ Returns full method signature with:
   - All parameter types
   - Optional fields marked
   - JSDoc comments
   - Generic type parameters
```

**Bad MCP tool**:
```
omp_query_mechanism({ requirements: {...} })
→ Returns "recommended: custom_tool"
```
→ This is decision logic, belongs in skill. MCP should provide content, not make decisions.

### 3. Skill Points to MCP

The skill should guide agents to the right MCP tool for detailed content:

```markdown
## MCP Tool Reference

| You want to... | Call this tool |
|----------------|----------------|
| See full API signature | `omp_get_api({ method: "registerTool" })` |
| Read complete example | `omp_read_example({ name: "hello" })` |
| Check event definitions | `omp_get_events({ event: "ToolCallEvent" })` |
```

This creates a clear flow:
```
Agent reads skill → Understands concepts → Knows which MCP tool to call → Gets precise content
```

## Tool Design Patterns

### Pattern 1: Hierarchical Query

Let users query at different granularity levels:

```
omp_get_api()              → Full ExtensionAPI interface
omp_get_api({ method: "registerTool" })  → Specific method signature

omp_get_events()           → All event types summary
omp_get_events({ event: "ToolCallEvent" })  → Specific event definition
```

**Why**: Sometimes agents need overview, sometimes need specific details. Don't force them to parse full content.

### Pattern 2: Section Extraction

For long documents, allow section filtering:

```
omp_get_extension_guide()  → Full guide (500+ lines)
omp_get_extension_guide({ section: "Tools" })  → Just the Tools section
```

**Why**: Reduces token usage when agent only needs specific information.

### Pattern 3: Type Filtering

For collections, allow filtering by type:

```
omp_list_examples()  → All examples
omp_list_examples({ type: "extension" })  → Only extension examples
```

**Why**: Helps agents find relevant examples faster.

### Pattern 4: Cross-Source Search

When content spans multiple sources, provide unified search:

```
omp_search({ query: "registerTool" })
→ Searches across docs, examples, types
→ Returns matches with source and context
```

**Why**: Agents often don't know where the information lives.

## File Structure

```
mcp-servers/your-mcp/
├── src/
│   ├── index.ts           # MCP server entry, tool registration
│   ├── tools/
│   │   ├── api-reference.ts    # Specific content queries
│   │   ├── examples.ts         # Example browsing
│   │   └── search.ts           # Cross-source search
│   ├── data/
│   │   ├── paths.ts            # File path constants
│   │   └── doc-index.ts        # Content indexing (optional)
│   └── utils/
│       ├── file-reader.ts      # File reading utilities
│       └── markdown-parser.ts  # Section extraction
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

```json
// .omp/mcp.json
{
  "mcpServers": {
    "your-mcp": {
      "command": "bun",
      "args": ["run", "mcp-servers/your-mcp/src/index.ts"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

**Note**: Use `cwd: "${workspaceFolder}"` so relative paths in tools resolve correctly.

## Runtime Data Loading

Read data at runtime from project files, not pre-generated:

```typescript
// ✅ GOOD: Runtime loading, always fresh
const content = await Bun.file(PATHS.extensionTypes).text();

// ❌ BAD: Pre-generated data, requires sync
const content = PRE_GENERATED_API_DEFINITIONS;
```

**Why**:
- Data stays in sync with source files
- No build step for data updates
- Simpler maintenance

## Testing

Test via stdio JSON-RPC:

```bash
cd mcp-servers/your-mcp
cat << 'EOF' | bun run src/index.ts
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"your_tool","arguments":{}}}
EOF
```

## Common Pitfalls

### 1. Decision Logic in MCP

```
❌ MCP tool that recommends mechanisms
✅ Skill contains decision logic, MCP provides detailed guides
```

### 2. Content Duplication

```
❌ Skill contains API signatures, MCP also returns them
✅ Skill explains concepts, MCP returns precise definitions
```

### 3. Missing Hierarchy

```
❌ omp_get_api() returns 2000-line interface, no filtering
✅ omp_get_api({ method: "registerTool" }) returns specific method
```

### 4. Static Data Generation

```
❌ Build script generates JSON from source files
✅ Runtime reads directly from source files
```

## Checklist

Before shipping an MCP server:

- [ ] Skill exists with decision logic + concepts
- [ ] No decision logic duplicated in MCP tools
- [ ] MCP tools provide precise, queryable content
- [ ] Skill points to relevant MCP tools
- [ ] Tools support hierarchical queries (overview → specific)
- [ ] Long documents support section extraction
- [ ] Data loaded at runtime, not pre-generated
- [ ] Tested via stdio JSON-RPC
- [ ] README documents available tools
- [ ] CHANGELOG tracks tool changes
