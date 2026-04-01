/**
 * API reference tool - returns ExtensionAPI interface methods.
 */
import { z } from "zod";
import { PATHS } from "../data/paths";
import { readFile } from "../utils/file-reader";

export const inputSchema = z.object({
	method: z.string().optional().describe("Optional specific method name to query"),
});

export async function handler(params: z.infer<typeof inputSchema>): Promise<string> {
	const result = await readFile(PATHS.extensionTypes);

	if (!result.success) {
		return `Error: ${result.error}`;
	}

	const content = result.content;

	// Find ExtensionAPI interface
	const apiStart = content.indexOf("export interface ExtensionAPI {");
	if (apiStart === -1) {
		return "ExtensionAPI interface not found in types.ts";
	}

	// Extract the interface by finding the closing brace on its own line
	const lines = content.split("\n");
	const startLineNum = content.slice(0, apiStart).split("\n").length;
	let endLineNum = -1;

	for (let i = startLineNum; i < lines.length; i++) {
		if (lines[i] === "}") {
			endLineNum = i;
			break;
		}
	}

	if (endLineNum === -1) {
		return "Could not find end of ExtensionAPI interface";
	}

	const apiContent = lines.slice(startLineNum - 1, endLineNum + 1).join("\n");

	if (params.method) {
		// Find specific method - match method name at start of line with a tab
		const escapedMethod = params.method.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const methodPattern = new RegExp(`^\\t${escapedMethod}[<(]`, "m");
		const match = apiContent.match(methodPattern);

		if (!match) {
			return `Method "${params.method}" not found in ExtensionAPI. Available methods:\n${listMethods(apiContent)}`;
		}

		// Find the start of the method (including any JSDoc comment above it)
		const matchIndex = match.index!;
		let startIdx = matchIndex;

		// Look backwards for JSDoc comment
		const beforeMethod = apiContent.slice(0, matchIndex);
		const linesBefore = beforeMethod.split("\n");
		for (let i = linesBefore.length - 1; i >= 0; i--) {
			const line = linesBefore[i];
			if (line.trim().endsWith("*/")) {
				// Found end of JSDoc, find start
				for (let j = i; j >= 0; j--) {
					if (linesBefore[j].trim().startsWith("/**")) {
						startIdx = beforeMethod.lastIndexOf("/**");
						break;
					}
				}
				break;
			}
			if (!line.trim().startsWith("*") && !line.trim().startsWith("*/") && line.trim() !== "") {
				break;
			}
		}

		// Find end of method signature and capture ALL overloads
		// TypeScript overloaded methods appear as consecutive signatures with same name
		const apiLines = apiContent.split("\n");
		const startLine = apiContent.slice(0, startIdx).split("\n").length - 1;
		let endLine = startLine;

		// Scan forward to find where overloads end
		for (let i = startLine; i < apiLines.length; i++) {
			const line = apiLines[i];
			if (line === "}") {
				// Hit the interface closing brace
				endLine = i;
				break;
			}
			if (line.endsWith(";")) {
				// End of a signature - check if next line is another overload
				endLine = i;
				// Look ahead for consecutive overload
				for (let j = i + 1; j < apiLines.length; j++) {
					const nextLine = apiLines[j];
					if (nextLine === "}") {
						// Interface end, stop looking
						break;
					}
					if (nextLine.startsWith("\t" + params.method + "(")) {
						// Found another overload, continue capturing
						endLine = j;
						// Reset outer loop to find this overload's end
						i = j - 1;
						break;
					}
					if (nextLine.trim() !== "" && !nextLine.startsWith("\t")) {
						// Non-tab-indented non-empty line means we're past overloads
						break;
					}
					// Skip empty lines between overloads
				}
				break;
			}
		}

		return apiLines.slice(startLine, endLine + 1).join("\n").trim();
	}

	// Return full ExtensionAPI interface
	return [
		"# ExtensionAPI Interface",
		"",
		"Source: `packages/coding-agent/src/extensibility/extensions/types.ts`",
		"",
		apiContent,
		"",
		"## Available Methods",
		listMethods(apiContent),
	].join("\n");
}

function listMethods(apiContent: string): string {
	// Extract all method/event names from the interface
	const methodMatches = [...apiContent.matchAll(/^\t(\w+)[<(]/gm)];
	const methods = methodMatches.map((m) => m[1]);
	return methods.map((m) => `- ${m}`).join("\n");
}