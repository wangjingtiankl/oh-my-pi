# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Typecheck and lint
bun run check          # All packages
bun run check:ts      # TypeScript only
bun run check:rs      # Rust only

# Tests
bun run test          # All packages (parallel)
bun run test:ts       # TypeScript only
bun run test:rs       # Rust only

# Lint and format
bun run lint          # All packages
bun run fix           # Auto-fix (includes format-prompts)

# Per-package (for focused work)
bun --cwd=packages/coding-agent run check
bun --cwd=packages/coding-agent run test
bun --cwd=packages/coding-agent run build    # Build binary
```

## Architecture

### Monorepo Structure

```
packages/
├── ai/           Multi-provider LLM client with streaming
├── agent/         Agent runtime with tool calling
├── coding-agent/  Main CLI (primary focus for all work)
├── tui/           Terminal UI with differential rendering
├── natives/       N-API bindings (JS wrapper)
├── stats/         Observability dashboard
├── utils/         Shared utilities (logger, streams)
└── swarm-extension/

crates/
├── pi-natives/   Rust crate: grep, shell, text, syntax highlighting
└── brush-*-vendored/  Vendored shell execution
```

### Coding Agent Boot Sequence

```
CLI (src/cli.ts) → Main (src/main.ts) → buildSessionOptions()
  → createAgentSession() → Mode dispatch:
    - InteractiveMode (TUI event loop)
    - runPrintMode (one-shot)
    - runRpcMode (JSONL stdin/stdout)
```

### Key Boundaries

- **AgentSession** (`session/agent-session.ts`): Runtime coordinator, event fan-out, persistence wiring
- **SessionManager** (`session/session-manager.ts`): JSONL append-only tree, branch topology
- **Settings** (`config/settings.ts`): Global/project/override merge, YAML persistence
- **Tool registry** (`tools/index.ts`): Built-in tools factory map

## Code Conventions

### Bun Over Node.js

Always use Bun APIs when available:

| Operation     | Use                          | Not                    |
|---------------|------------------------------|------------------------|
| File I/O      | `Bun.file()`, `Bun.write()` | `fs.readFileSync`      |
| Spawn         | `$`cmd`` or `Bun.spawn()`   | `child_process`       |
| Sleep         | `Bun.sleep(ms)`              | `setTimeout`           |
| Path          | `import.meta.dir`            | `fileURLToPath`        |

### TypeScript Rules

- **No `any`** unless absolutely necessary
- **No `ReturnType<>`** — use the actual type name
- **No inline imports** — top-level only, no `import().then`
- **Barrel exports**: `export * from "./module"` in index files
- **ES `#private` fields** — no TypeScript `private`/`protected` keyword
- **Promises**: use `Promise.withResolvers()` instead of `new Promise(...)`

### Prompts

Prompts live in static `.md` files with Handlebars for dynamic content:

```typescript
import content from "./prompt.md" with { type: "text" }
```

### Logging

**Never use `console.log`/`error`/`warn`** — use the centralized logger:

```typescript
import { logger } from "@oh-my-pi/pi-utils";
logger.error("MCP request failed", { url, method });
```

### TUI Sanitization

All displayed text must be sanitized:
- Tabs → spaces via `replaceTabs()`
- Truncate via `truncateToWidth()` with `TRUNCATE_LENGTHS` constants
- Paths → `shortenPath()` (replaces home with `~`)

### Generated Files

`packages/ai/src/models.json` is generated — **never edit directly**. Fix the source:
- Resolution rules → `provider-models/openai-compat.ts`
- Provider descriptors → `provider-models/descriptors.ts`
- Generator-level → `scripts/generate-models.ts`

Regenerate: `bun --cwd=packages/ai run generate-models`

## Adding Features

### Add a Built-in Tool

1. Register factory in `packages/coding-agent/src/tools/index.ts` under `BUILTIN_TOOLS`
2. Export types from the tools barrel
3. Wire feature gates in `isToolAllowed(name)` for runtime enable/disable

### Add an RPC Command

1. Add command shape to `RpcCommand` in `modes/rpc/rpc-types.ts`
2. Add success response variant to `RpcResponse`
3. Update `RpcSessionState` if runtime state changes

### Add a Hook Event

1. Define event interface in `extensibility/hooks/types.ts`
2. Add to `HookEvent` union
3. Add `on()` overload for the handler

## Rust Crate

`crates/pi-natives/` provides performance-critical operations (grep, shell, text, keys, highlight, glob, task, ps, image, clipboard, html). Build via `bun run build:native`. Platform builds: linux-x64, linux-arm64, darwin-x64, darwin-arm64, win32-x64.

## Changelog

Each package maintains `packages/*/CHANGELOG.md`. Entries go under `## [Unreleased]`. Never modify already-released sections.