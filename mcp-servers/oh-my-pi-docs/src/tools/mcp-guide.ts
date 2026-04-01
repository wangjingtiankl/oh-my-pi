/**
 * MCP guide tool - returns combined MCP documentation from multiple files.
 */
import { z } from "zod";
import { PATHS, getRelativePath } from "../data/paths";
import { readFiles, FileReaderResult } from "../utils/file-reader";
import { extractSection } from "../utils/markdown-parser";

export const inputSchema = z.object({
	section: z.string().optional().describe("Optional section name to extract"),
});

export async function handler(params: z.infer<typeof inputSchema>): Promise<string> {
	const results = await readFiles(PATHS.mcpDocs);

	const failed = results.filter((r) => !r.success);
	if (failed.length > 0) {
		return `Errors loading MCP docs:\n${failed.map((r) => `- ${r.error}`).join("\n")}`;
	}

	// Combine all MCP docs
	const combined = results
		.filter((r) => r.success)
		.map((r) => {
			const relPath = getRelativePath(r.path);
			return [`---`, `Source: ${relPath}`, `---`, r.content].join("\n");
		})
		.join("\n\n");

	if (params.section) {
		// Search across all combined content
		const sectionContent = extractSection(combined, params.section);
		if (!sectionContent) {
			return `Section "${params.section}" not found. Available sections:\n${listAllSections(results)}`;
		}
		return sectionContent;
	}

	return combined;
}

function listAllSections(results: FileReaderResult[]): string {
	const allSections: string[] = [];
	for (const r of results) {
		if (r.success) {
			const relPath = getRelativePath(r.path);
			const sections = r.content
				.split("\n")
				.filter((line) => line.startsWith("# ") || line.startsWith("## "));
			for (const s of sections) {
				const level = s.startsWith("# ") && !s.startsWith("## ") ? 1 : 2;
				const name = s.slice(level + 1).trim();
				allSections.push(`- ${name} (from ${relPath})`);
			}
		}
	}
	return allSections.join("\n");
}
