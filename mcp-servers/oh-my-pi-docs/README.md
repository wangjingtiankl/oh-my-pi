# oh-my-pi-docs MCP Server

An MCP (Model Context Protocol) server providing precise knowledge query APIs for coding agents developing oh-my-pi extensions.

## Features

- 15 tools for querying extension development knowledge:

### Overview
- `omp_get_overview` — Extension system architecture overview
### Detailed Guides
- `omp_get_extension_guide` — Extension development guide
- `omp_get_hook_guide` — Hook development guide
- `omp_get_custom_tool_guide` — Custom tool development guide
- `omp_get_mcp_guide` — MCP server development guide
- `omp_get_skill_guide` — Skill development guide

### API Reference
- `omp_get_api` — ExtensionAPI interface reference
- `omp_get_events` — Event type definitions
- `omp_get_tool_schema` — ToolDefinition schema patterns

### Examples & Conventions
- `omp_list_examples` — List code examples
- `omp_read_example` — Read example source code
- `omp_get_conventions` — Project development conventions

### General Query
- `omp_list_docs` — List documentation files
- `omp_read_doc` — Read documentation file
- `omp_search` — Search across docs, examples, and types

## Configuration

Add to `.omp/mcp.json`:

```json
{
	"mcpServers": {
		"omp-docs": {
			"command": "bun",
			"args": ["run", "mcp-servers/oh-my-pi-docs/src/index.ts"],
			"cwd": "${workspaceFolder}"
		}
	}
}
```

## Development

```bash
# Install dependencies (from repo root)
bun install

# Type check
bun run tsc --noEmit

# Run server (stdio transport)
bun run mcp-servers/oh-my-pi-docs/src/index.ts
```

## Data Sources

All data is read at runtime from project files:

| Source | Path |
|--------|------|
| Extensions docs | `docs/extensions.md` |
| Hooks docs | `docs/hooks.md` |
| Custom Tools docs | `docs/custom-tools.md` |
| MCP docs | `docs/mcp-*.md` |
| Skills docs | `docs/skills.md` |
| ExtensionAPI types | `packages/coding-agent/src/extensibility/extensions/types.ts` |
| Examples | `packages/coding-agent/examples/` |
| Conventions | `AGENTS.md` |
