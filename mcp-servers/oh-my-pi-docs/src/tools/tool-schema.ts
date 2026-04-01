/**
 * Tool schema tool - returns ToolDefinition interface and parameter patterns.
 */
import { z } from "zod";
import { PATHS } from "../data/paths";
import { readFile } from "../utils/file-reader";

export const inputSchema = z.object({});

export async function handler(_params: z.infer<typeof inputSchema>): Promise<string> {
	// Read extension types for ToolDefinition
	const extResult = await readFile(PATHS.extensionTypes);
	if (!extResult.success) {
		return `Error: ${extResult.error}`;
	}

	const extContent = extResult.content;
	const extLines = extContent.split("\n");

	// Find ToolDefinition interface
	const toolDefLineNum = extLines.findIndex((l) => l.startsWith("export interface ToolDefinition"));
	if (toolDefLineNum === -1) {
		return "ToolDefinition interface not found in types.ts";
	}

	// Extract the interface by finding matching closing brace
	const declarationLine = extLines[toolDefLineNum];
	let braceCount = declarationLine.includes("{") ? 1 : 0;
	let toolDefEndLine = toolDefLineNum;
	for (let i = toolDefLineNum + 1; i < extLines.length; i++) {
		for (const char of extLines[i]) {
			if (char === "{") braceCount++;
			if (char === "}") braceCount--;
		}
		if (braceCount === 0) {
			toolDefEndLine = i;
			break;
		}
	}

	const toolDef = extLines.slice(toolDefLineNum, toolDefEndLine + 1).join("\n");

	// Read custom tool types for CustomTool and CustomToolFactory
	const customResult = await readFile(PATHS.customToolTypes);
	let customToolInterface = "// CustomTool types not available";
	let customToolFactory = "// CustomToolFactory not available";

	if (customResult.success) {
		const customContent = customResult.content;
		const customLines = customContent.split("\n");

		// Extract CustomTool interface
		const customToolLineNum = customLines.findIndex((l) => l.startsWith("export interface CustomTool<"));
		if (customToolLineNum !== -1) {
			const declarationLine = customLines[customToolLineNum];
			let braceCount = declarationLine.includes("{") ? 1 : 0;
			let customToolEndLine = customToolLineNum;
			for (let i = customToolLineNum + 1; i < customLines.length; i++) {
				for (const char of customLines[i]) {
					if (char === "{") braceCount++;
					if (char === "}") braceCount--;
				}
				if (braceCount === 0) {
					customToolEndLine = i;
					break;
				}
			}
			customToolInterface = customLines.slice(customToolLineNum, customToolEndLine + 1).join("\n");
		}

		// Extract CustomToolFactory type
		const customFactoryLineNum = customLines.findIndex((l) => l.startsWith("export type CustomToolFactory"));
		if (customFactoryLineNum !== -1) {
			let endLine = customFactoryLineNum;
			for (let i = customFactoryLineNum; i < customLines.length; i++) {
				if (customLines[i].endsWith(";")) {
					endLine = i;
					break;
				}
			}
			customToolFactory = customLines.slice(customFactoryLineNum, endLine + 1).join("\n");
		}
	}

	const output = [
		"# Tool Schema Reference",
		"",
		"## ToolDefinition Interface",
		"(for extension-registered tools)",
		"",
		toolDef,
		"",
		"## CustomTool Interface",
		"(for custom tool modules)",
		"",
		customToolInterface,
		"",
		"## CustomToolFactory Type",
		customToolFactory,
		"",
		"## Parameter Schema Patterns",
		"",
		"### Using TypeBox (Recommended)",
		"```typescript",
		"import { Type } from \"@sinclair/typebox\";",
		"",
		"// Simple object parameter",
		"parameters: Type.Object({",
		"  name: Type.String(),",
		"  count: Type.Optional(Type.Number({ default: 10 }))",
		"})",
		"",
		"// Array parameter",
		"parameters: Type.Object({",
		"  items: Type.Array(Type.String())",
		"})",
		"",
		"// Enum parameter",
		"parameters: Type.Object({",
		"  mode: Type.Enum({ fast: \"fast\", slow: \"slow\" })",
		"})",
		"```",
		"",
		"## Tool Registration Patterns",
		"",
		"### Extension Tool",
		"```typescript",
		"pi.registerTool({",
		"  name: \"my_tool\",",
		"  label: \"My Tool\",",
		"  description: \"Does something useful\",",
		"  parameters: Type.Object({ input: Type.String() }),",
		"  async execute(toolCallId, params, signal, onUpdate, ctx) {",
		"    return {",
		"      content: [{ type: \"text\", text: `Processed: ${params.input}` }],",
		"      details: { processed: params.input }",
		"    };",
		"  }",
		"});",
		"```",
		"",
		"### Custom Tool Module",
		"```typescript",
		"import type { CustomToolFactory } from \"@oh-my-pi/pi-coding-agent\";",
		"",
		"const factory: CustomToolFactory = (pi) => ({",
		"  name: \"my_tool\",",
		"  description: \"Does something useful\",",
		"  parameters: pi.typebox.Type.Object({ input: pi.typebox.Type.String() }),",
		"  async execute(toolCallId, params, onUpdate, ctx, signal) {",
		"    return {",
		"      content: [{ type: \"text\", text: `Processed: ${params.input}` }]",
		"    };",
		"  }",
		"});",
		"",
		"export default factory;",
		"```",
		"",
		"See also:",
		"- `omp_get_extension_guide` for full extension guide",
		"- `omp_get_custom_tool_guide` for custom tool guide",
		"- `omp_list_examples` for code examples",
	];

	return output.join("\n");
}
