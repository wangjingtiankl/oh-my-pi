/**
 * Search tool - grep through docs, examples, and types.
 */
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PATHS, getRelativePath } from "../data/paths";

export const inputSchema = z.object({
	query: z.string().describe("Search query (regex pattern)"),
	sources: z
		.array(z.enum(["docs", "examples", "types"]))
		.optional()
		.describe("Sources to search (default: all)"),
});

interface SearchResult {
	source: string;
	path: string;
	line: number;
	snippet: string;
}

async function searchInDirectory(
	dir: string,
	regex: RegExp,
	sourceLabel: string,
	filePattern: string = "*.ts",
): Promise<SearchResult[]> {
	const results: SearchResult[] = [];

	try {
		// Get all matching files
		const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });

		for (const entry of entries) {
			if (!entry.isFile()) continue;

			const filePath = path.join(entry.parentPath, entry.name);

			// Filter by pattern
			if (filePattern === "*.md" && !filePath.endsWith(".md")) continue;
			if (filePattern === "*.ts" && !filePath.endsWith(".ts")) continue;

			try {
				const content = await Bun.file(filePath).text();
				const lines = content.split("\n");

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					const matchResult = safeRegexTest(regex, line);
					if (matchResult === null) {
						// Timeout exceeded - skip this file to avoid hanging
						continue;
					}
					if (matchResult) {
						results.push({
							source: sourceLabel,
							path: getRelativePath(filePath),
							line: i + 1,
							snippet: line.slice(0, 200).trim(),
						});
					}
				}
			} catch {
				// Skip unreadable files
			}
		}
	} catch {
		// Directory might not exist
	}

	return results;
}

/**
 * Maximum time allowed for regex matching per file.
 * If exceeded, the result is discarded to avoid slow responses.
 * Note: This is post-completion detection, not pre-execution protection.
 * JavaScript's regex engine is synchronous and cannot be interrupted.
 */
const REGEX_TIMEOUT_MS = 5000;

/**
 * Execute regex match with timeout detection.
 * Returns null if execution took too long, otherwise returns match result.
 * WARNING: A catastrophic backtracking pattern can still hang the event loop
 * before the timeout check runs. For critical security, use a safe-regex library
 * or validate pattern complexity before calling this function.
 */
function safeRegexTest(regex: RegExp, text: string): boolean | null {
	const start = Date.now();
	try {
		const result = regex.test(text);
		if (Date.now() - start > REGEX_TIMEOUT_MS) {
			return null; // Slow execution detected
		}
		return result;
	} catch {
		return false;
	}
}


export async function handler(params: z.infer<typeof inputSchema>): Promise<string> {
	// Validate regex pattern before searching
	let regex: RegExp;
	try {
		// Use 'i' flag only (no 'g' flag - it causes lastIndex issues with .test())
		regex = new RegExp(params.query, "i");
	} catch {
		return "Error: Invalid regex pattern. Please use a valid regular expression.";
	}

	const sources = params.sources || ["docs", "examples", "types"];
	const results: SearchResult[] = [];

	// Search in each source
	if (sources.includes("docs")) {
		const docResults = await searchInDirectory(PATHS.docsDir, regex, "docs", "*.md");
		results.push(...docResults);
	}

	if (sources.includes("examples")) {
		const exampleResults = await searchInDirectory(PATHS.examplesDir, regex, "examples", "*.ts");
		results.push(...exampleResults);
	}

	if (sources.includes("types")) {
		const typesDir = path.dirname(PATHS.extensionTypes);
		const typesResults = await searchInDirectory(typesDir, regex, "types", "*.ts");
		results.push(...typesResults);
	}

	if (results.length === 0) {
		return `No results found for "${params.query}" in sources: ${sources.join(", ")}`;
	}

	// Sort by source, then path, then line
	results.sort((a, b) => {
		if (a.source !== b.source) return a.source.localeCompare(b.source);
		if (a.path !== b.path) return a.path.localeCompare(b.path);
		return a.line - b.line;
	});

	// Limit results
	const limited = results.slice(0, 50);

	const output = [
		`# Search Results for "${params.query}"`,
		"",
		`Found ${results.length} matches (showing ${limited.length})`,
		"",
		...limited.map((r) => {
			return `- **[${r.source}]** ${r.path}:${r.line}\n  ${r.snippet}`;
		}),
		"",
		"---",
		"",
		"Use `omp_read_doc` or `omp_read_example` to read full files.",
	];

	return output.join("\n");
}
