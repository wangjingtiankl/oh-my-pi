/**
 * Path constants for all data sources.
 * All paths are relative to repo root.
 */
import * as path from "node:path";
import * as url from "node:url";

// Get the directory of this file
const __filename = import.meta.path || url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../../..");

export const PATHS = {
	docsDir: path.join(REPO_ROOT, "docs"),
	extensionsDoc: path.join(REPO_ROOT, "docs/extensions.md"),
	hooksDoc: path.join(REPO_ROOT, "docs/hooks.md"),
	customToolsDoc: path.join(REPO_ROOT, "docs/custom-tools.md"),
	skillsDoc: path.join(REPO_ROOT, "docs/skills.md"),
	mcpDocs: [
		path.join(REPO_ROOT, "docs/mcp-config.md"),
		path.join(REPO_ROOT, "docs/mcp-protocol-transports.md"),
		path.join(REPO_ROOT, "docs/mcp-runtime-lifecycle.md"),
		path.join(REPO_ROOT, "docs/mcp-server-tool-authoring.md"),
	],

	// Types
	extensionTypes: path.join(REPO_ROOT, "packages/coding-agent/src/extensibility/extensions/types.ts"),
	customToolTypes: path.join(REPO_ROOT, "packages/coding-agent/src/extensibility/custom-tools/types.ts"),
	// Examples
	examplesDir: path.join(REPO_ROOT, "packages/coding-agent/examples"),

	// Conventions
	agentsMd: path.join(REPO_ROOT, "AGENTS.md"),

	// Repo root for relative path construction
	repoRoot: REPO_ROOT,
};

export function getRelativePath(absolutePath: string): string {
	return path.relative(PATHS.repoRoot, absolutePath);
}
