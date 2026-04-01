/**
 * Docs browser tool - list and read documentation files.
 */
import { z } from "zod";
import { listDocs, listDocsByCategory } from "../data/doc-index";
import { readFile } from "../utils/file-reader";
import { extractSection } from "../utils/markdown-parser";

export const listSchema = z.object({
	category: z.string().optional().describe("Filter by category (mcp, extension, theme, api, config)"),
});

export const readSchema = z.object({
	path: z.string().describe("Doc filename (e.g., 'extensions.md')"),
	section: z.string().optional().describe("Optional section name to extract"),
});

export async function listHandler(params: z.infer<typeof listSchema>): Promise<string> {
	const docs = params.category ? await listDocsByCategory(params.category) : await listDocs();

	if (docs.length === 0) {
		return params.category
			? `No docs found for category "${params.category}". Available categories: mcp, extension, theme, api, config`
			: "No docs found in docs/ directory.";
	}

	const output = [
		"# Documentation Files",
		"",
		`Found ${docs.length} docs`,
		"",
		"## Files",
		"",
		...docs.map((d) => `- **${d.name}** — \`docs/${d.name}\``),
		"",
		"## Usage",
		"Use `omp_read_doc` with the filename to read the full content.",
		"Add `--section <name>` to extract a specific section.",
		"",
		"## Categories",
		"- **mcp**: MCP integration guides (mcp-*.md)",
		"- **extension**: Extension system guides",
		"- **theme**: Theme customization guides",
		"- **api**: API reference docs",
		"- **config**: Configuration guides",
	];

	return output.join("\n");
}

export async function readHandler(params: z.infer<typeof readSchema>): Promise<string> {
	// Resolve path
	const docPath = params.path.startsWith("docs/") ? params.path : `docs/${params.path}`;

	// Get absolute path from doc index
	const docs = await listDocs();
	const doc = docs.find((d) => d.name === params.path || d.relativePath === docPath);

	if (!doc) {
		return `Doc "${params.path}" not found. Use \`omp_list_docs\` to see available docs.`;
	}

	const result = await readFile(doc.path);

	if (!result.success) {
		return `Error: ${result.error}`;
	}

	if (params.section) {
		const sectionContent = extractSection(result.content, params.section);
		if (!sectionContent) {
			const sections = result.content.split("\n").filter((l) => l.startsWith("## "));
			return `Section "${params.section}" not found. Available sections:\n${sections.map((s) => `- ${s.slice(3).trim()}`).join("\n")}`;
		}
		return sectionContent;
	}

	return result.content;
}