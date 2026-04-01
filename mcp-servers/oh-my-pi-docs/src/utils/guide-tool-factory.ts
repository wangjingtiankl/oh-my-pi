/**
 * Factory for creating guide tool implementations.
 * Eliminates duplication across extension, hook, skill, and custom-tool guides.
 */
import { z } from "zod";
import { readFile } from "./file-reader";
import { extractSection, formatSectionsList } from "./markdown-parser";

const guideSchema = z.object({
	section: z.string().optional().describe("Optional section name to extract"),
});

/**
 * Creates a guide tool handler for a given document path.
 * @param docPath - Absolute path to the guide document
 * @returns Object with inputSchema and handler function
 */
export function createGuideTool(docPath: string) {
	return {
		inputSchema: guideSchema,
		handler: async (params: z.infer<typeof guideSchema>): Promise<string> => {
			const result = await readFile(docPath);

			if (!result.success) {
				return `Error: ${result.error}`;
			}

			if (params.section) {
				const sectionContent = extractSection(result.content, params.section);
				if (!sectionContent) {
					return `Section "${params.section}" not found. Available sections:\n${formatSectionsList(result.content)}`;
				}
				return sectionContent;
			}

			return result.content;
		},
	};
}