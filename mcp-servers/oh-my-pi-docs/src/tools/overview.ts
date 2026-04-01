/**
 * Overview tool - provides extension system architecture overview.
 */
import { z } from "zod";
import { PATHS } from "../data/paths";
import { readFile } from "../utils/file-reader";
import { extractIntro, extractSection } from "../utils/markdown-parser";

export const inputSchema = z.object({});

export async function handler(_params: z.infer<typeof inputSchema>): Promise<string> {
	const result = await readFile(PATHS.extensionsDoc);

	if (!result.success) {
		return `Error: ${result.error}`;
	}

	const content = result.content;

	// Extract intro section (before first ## header)
	const intro = extractIntro(content);

	// Extract key sections
	const whatIs = extractSection(content, "What an extension is");
	const runtimeModel = extractSection(content, "Runtime model");
	const quickStart = extractSection(content, "Quick start");

	const output = [
		"# Extension System Overview",
		"",
		intro,
		"",
		whatIs || "",
		"",
		runtimeModel || "",
		"",
		quickStart || "",
		"",
		"## Mechanisms Available",
		"- **Extensions**: Multi-component runtime modules (tools + commands + events)",
		"- **Hooks**: Event interception/preprocessing modules",
		"- **Custom Tools**: Single model-callable tool modules",
		"- **Skills**: Static knowledge/context files (SKILL.md)",
		"- **MCP Servers**: External tool integration via Model Context Protocol",
		"- **Slash Commands**: User-triggered action commands",
		"",
		"## Documentation Sources",
		"- `docs/extensions.md` — Full extension development guide",
		"- `docs/hooks.md` — Hook subsystem documentation",
		"- `docs/custom-tools.md` — Custom tool development",
		"- `docs/skills.md` — Skill discovery and format",
		"- `docs/mcp-*.md` — MCP integration guides",
		"",
		"## Quick Queries",
		"- `omp_get_extension_guide` — Full extension development guide",
		"- `omp_get_api` — ExtensionAPI interface reference",
		"- `omp_list_examples` — Code examples",
	];

	return output.join("\n");
}
