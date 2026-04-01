/**
 * Markdown section extraction utilities.
 */

/**
 * Extract a section from markdown content by header.
 * Returns content from the header line to the next same-level or higher-level header.
 */
export function extractSection(content: string, sectionName: string): string | null {
	const lines = content.split("\n");
	const targetHeader = `## ${sectionName}`;
	const targetHeaderAlt = `# ${sectionName}`;

	let startIndex = -1;
	let startLevel = 0;

	// Find the target header
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line === targetHeader) {
			startIndex = i;
			startLevel = 2;
			break;
		}
		if (line === targetHeaderAlt) {
			startIndex = i;
			startLevel = 1;
			break;
		}
		// Also match headers with different formats like "## Overview" vs "##Overview"
		if (line.startsWith("## ") && line.slice(3).trim() === sectionName) {
			startIndex = i;
			startLevel = 2;
			break;
		}
		if (line.startsWith("# ") && line.slice(2).trim() === sectionName) {
			startIndex = i;
			startLevel = 1;
			break;
		}
	}

	if (startIndex === -1) {
		return null;
	}

	// Find the end of the section
	let endIndex = lines.length;
	for (let i = startIndex + 1; i < lines.length; i++) {
		const line = lines[i];
		// Check for next same-level or higher-level header
		if (startLevel === 1 && line.startsWith("# ") && !line.startsWith("## ")) {
			endIndex = i;
			break;
		}
		if (startLevel === 2 && (line.startsWith("# ") || line.startsWith("## "))) {
			endIndex = i;
			break;
		}
	}

	return lines.slice(startIndex, endIndex).join("\n").trim();
}

/**
 * Extract all section headers from markdown content.
 */
export function extractHeaders(content: string): string[] {
	const lines = content.split("\n");
	const headers: string[] = [];

	for (const line of lines) {
		if (line.startsWith("## ")) {
			headers.push(line.slice(3).trim());
		} else if (line.startsWith("# ")) {
			headers.push(line.slice(2).trim());
		}
	}

	return headers;
}

/**
 * Extract the first paragraph/intro section before any ## headers.
 */
export function extractIntro(content: string): string {
	const lines = content.split("\n");
	const introLines: string[] = [];

	for (const line of lines) {
		if (line.startsWith("## ")) {
			break;
		}
		// Skip the title line
		if (line.startsWith("# ")) {
			continue;
		}
		introLines.push(line);
	}

	return introLines.join("\n").trim();
}

/**
 * Extract a code block from markdown content.
 * Returns all code blocks if no language specified.
 */
export function extractCodeBlocks(content: string, language?: string): string[] {
	const lines = content.split("\n");
	const blocks: string[] = [];
	let inBlock = false;
	let blockStart = -1;
	let blockLang = "";

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.startsWith("```")) {
			if (!inBlock) {
				inBlock = true;
				blockStart = i;
				blockLang = line.slice(3).trim();
			} else {
				if (!language || blockLang === language) {
					blocks.push(lines.slice(blockStart + 1, i).join("\n"));
				}
				inBlock = false;
			}
		}
	}

	return blocks;
}

/**
 * Format all section headers as a bullet list.
 */
export function formatSectionsList(content: string): string {
	const headers = extractHeaders(content);
	return headers.map(h => `- ${h}`).join("\n");
}
