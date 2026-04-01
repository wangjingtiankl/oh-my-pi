/**
 * Examples tool - list and read code examples.
 */
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { PATHS, getRelativePath } from "../data/paths";
import { readFile } from "../utils/file-reader";

export const listSchema = z.object({
	type: z.enum(["extension", "hook", "custom-tool", "sdk"]).optional().describe("Filter by example type"),
});

export const readSchema = z.object({
	name: z.string().describe("Example name (e.g., 'api-demo', 'hello', or qualified 'custom-tools/hello')"),
});

interface ExampleEntry {
	name: string;
	type: "extension" | "hook" | "custom-tool" | "sdk";
	path: string;
	relativePath: string;
	description?: string;
}

async function scanExamples(): Promise<ExampleEntry[]> {
	const examples: ExampleEntry[] = [];
	const types = ["extensions", "hooks", "custom-tools", "sdk"] as const;

	for (const type of types) {
		const typeDir = path.join(PATHS.examplesDir, type);
		try {
			const entries = await fs.readdir(typeDir, { withFileTypes: true });

			for (const entry of entries) {
				const isDirectory = entry.isDirectory();
				const isFile = entry.isFile();
				const isTsFile = entry.name.endsWith(".ts");
				const hasNoExtension = !entry.name.includes(".");

				// Accept .ts files (direct examples) and directories without extensions (example packages)
				if ((isFile && isTsFile) || (isDirectory && hasNoExtension)) {
					const fullPath = path.join(typeDir, entry.name);
					examples.push({
						name: entry.name.replace(".ts", ""),
						type: type === "custom-tools" ? "custom-tool" : type === "extensions" ? "extension" : type === "hooks" ? "hook" : type,
						path: fullPath,
						relativePath: getRelativePath(fullPath),
					});
				}
			}
		} catch {
			// Directory might not exist
		}
	}

	return examples.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listHandler(params: z.infer<typeof listSchema>): Promise<string> {
	const allExamples = await scanExamples();

	const filtered = params.type ? allExamples.filter((e) => e.type === params.type) : allExamples;

	if (filtered.length === 0) {
		return params.type
			? `No examples found for type "${params.type}". Available types: extension, hook, custom-tool, sdk`
			: "No examples found.";
	}

	const output = [
		"# Code Examples",
		"",
		`Found ${filtered.length} examples`,
		"",
		"## Examples",
		"",
...filtered.map((e) => {
			const typeLabel = `[${e.type}]`;
			return `- **${e.name}** ${typeLabel} — \`${e.relativePath}\``;
		}),
		"",
		"## Usage",
		"Use `omp_read_example` with the example name to read the full source code.",
		"",
		"## Categories",
		"- **extension**: Full extension modules with tools/commands/events",
		"- **hook**: Hook modules for event interception",
		"- **custom-tool**: Custom tool modules",
		"- **sdk**: SDK usage examples (programmatic API)",
	];

	return output.join("\n");
}

export async function readHandler(params: z.infer<typeof readSchema>): Promise<string> {
	const allExamples = await scanExamples();

// Find example by name (exact match, qualified 'type/name', or without extension)
		const example = allExamples.find((e) => {
			// Qualified name: 'custom-tools/hello' or 'extension/hello'
			if (params.name.includes("/")) {
				const [typePrefix, name] = params.name.split("/");
				const normalizedType = typePrefix === "custom-tools" ? "custom-tool" : typePrefix;
				return e.type === normalizedType && e.name === name;
			}
			// Unqualified name: match by name only (first match wins)
			return e.name === params.name || e.name === params.name.replace(".ts", "");
		});

		if (!example) {
			const availableNames = allExamples.map((e) => `${e.type}/${e.name}`).join(", ");
			return `Example "${params.name}" not found. Available examples: ${availableNames}. Use qualified name (e.g., 'extension/hello') for disambiguation.`;
		}

	// If it's a directory, show the contents
	if (!example.path.endsWith(".ts")) {
		try {
			const entries = await fs.readdir(example.path, { withFileTypes: true });
			const files = entries
				.filter((e) => e.isFile())
				.map((e) => e.name)
				.sort();

			const output = [
				`# Example: ${example.name}`,
				"",
				`Type: ${example.type}`,
				`Path: ${example.relativePath}`,
				"",
				"This is a directory-based example containing:",
				...files.map((f) => `- ${f}`),
				"",
				"Read individual files with `omp_read_example` using the full filename.",
			];

			// Try to read README.md if present
			const readmePath = path.join(example.path, "README.md");
			const readmeResult = await readFile(readmePath);
			if (readmeResult.success && readmeResult.content) {
				output.push("", "---", "", "## README", "", readmeResult.content);
			}

			return output.join("\n");
		} catch {
			return `Error reading directory ${example.path}`;
		}
	}

	// Read the .ts file
	const result = await readFile(example.path);

	if (!result.success) {
		return `Error: ${result.error}`;
	}

	const output = [
		`# Example: ${example.name}`,
		"",
		`Type: ${example.type}`,
		`Path: ${example.relativePath}`,
		"",
		"## Source Code",
		"",
		"```typescript",
		result.content || "",
		"```",
	];

	return output.join("\n");
}