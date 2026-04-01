/**
 * Docs directory index helper.
 */
import { isEnoent } from "@oh-my-pi/pi-utils";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PATHS, getRelativePath } from "./paths";

export interface DocEntry {
	name: string;
	path: string;
	relativePath: string;
	description?: string;
}

/**
 * Get list of all docs in the docs directory.
 */
export async function listDocs(): Promise<DocEntry[]> {
	try {
		const entries = await fs.readdir(PATHS.docsDir, { withFileTypes: true });
		const docs: DocEntry[] = [];

		for (const entry of entries) {
			if (entry.isFile() && entry.name.endsWith(".md")) {
				const fullPath = path.join(PATHS.docsDir, entry.name);
				docs.push({
					name: entry.name,
					path: fullPath,
					relativePath: getRelativePath(fullPath),
				});
			}
		}

		// Sort by name
		docs.sort((a, b) => a.name.localeCompare(b.name));
		return docs;
	} catch (err) {
		if (isEnoent(err)) {
			return [];
		}
		throw err;
	}
}

/**
 * Get docs filtered by category (prefix).
 * Categories are inferred from filename patterns:
 * - mcp-* → MCP category
 * - extensions.md, hooks.md, custom-tools.md, skills.md → Extension category
 * - theme-* → Theme category
 */
export async function listDocsByCategory(category: string): Promise<DocEntry[]> {
	const allDocs = await listDocs();

	// Category mappings
	const categoryPatterns: Record<string, string[]> = {
		mcp: ["mcp-"],
		extension: ["extensions.md", "hooks.md", "custom-tools.md", "skills.md"],
		theme: ["theme-", "theme.md"],
		api: ["api-"],
		config: ["config"],
	};

	const patterns = categoryPatterns[category] || [category];
	return allDocs.filter((doc) => patterns.some((p) => doc.name.startsWith(p) || doc.name === p));
}
