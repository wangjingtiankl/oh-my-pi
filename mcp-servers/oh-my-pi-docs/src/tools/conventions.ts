/**
 * Conventions tool - returns project development conventions from AGENTS.md.
 */
import { z } from "zod";
import { PATHS } from "../data/paths";
import { readFile } from "../utils/file-reader";
import { extractSection } from "../utils/markdown-parser";

export const inputSchema = z.object({});

export async function handler(_params: z.infer<typeof inputSchema>): Promise<string> {
	const result = await readFile(PATHS.agentsMd);

	if (!result.success) {
		return `Error: ${result.error}`;
	}

	const content = result.content;

	// Extract key sections
	const codeQuality = extractSection(content, "Code Quality");
	const bunOverNode = extractSection(content, "Bun Over Node");
	const logging = extractSection(content, "Logging");
	const commands = extractSection(content, "Commands");
	const testingGuidance = extractSection(content, "Testing Guidance");

	const output = [
		"# Project Conventions",
		"",
		"Source: `AGENTS.md`",
		"",
		codeQuality || "",
		"",
		bunOverNode || "",
		"",
		logging || "",
		"",
		commands || "",
		"",
		testingGuidance || "",
		"",
		extractSection(content, "TUI Rendering Sanitization") || "",
		"",
		"---",
		"",
		"For full AGENTS.md content, read the file directly.",
	];

	return output.join("\n");
}