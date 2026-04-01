/**
 * Events tool - returns ExtensionEvent types.
 */
import { z } from "zod";
import { PATHS } from "../data/paths";
import { readFile } from "../utils/file-reader";

export const inputSchema = z.object({
	event: z.string().optional().describe("Optional specific event name to query"),
});

export async function handler(params: z.infer<typeof inputSchema>): Promise<string> {
	const result = await readFile(PATHS.extensionTypes);

	if (!result.success) {
		return `Error: ${result.error}`;
	}

	const content = result.content;
	const lines = content.split("\n");

	// Find ExtensionEvent union type
	const eventUnionLineNum = lines.findIndex((l) => l.startsWith("export type ExtensionEvent ="));
	if (eventUnionLineNum === -1) {
		return "ExtensionEvent type not found in types.ts";
	}

	// Extract the union - find the semicolon line
	let eventUnionEndLine = eventUnionLineNum;
	for (let i = eventUnionLineNum; i < lines.length; i++) {
		if (lines[i].endsWith(";")) {
			eventUnionEndLine = i;
			break;
		}
	}

	const eventUnion = lines.slice(eventUnionLineNum, eventUnionEndLine + 1).join("\n");

	// Extract event names from the union - match any identifier before Event
	const eventNames = [...eventUnion.matchAll(/\|\s+(\w+Event)/g)].map((m) => m[1]);

	if (params.event) {
		// Find the specific event type definition
		const escapedEvent = params.event.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const eventTypeDefPattern = new RegExp(`^export (interface|type) ${escapedEvent}`);
		const eventLineNum = lines.findIndex((l) => eventTypeDefPattern.test(l));
		if (eventLineNum === -1) {
			return `Event "${params.event}" not found. Available events:\n${eventNames.map((e) => `- ${e}`).join("\n")}`;
		}

		const line = lines[eventLineNum];
		if (line.startsWith("export interface")) {
			// Find matching closing brace
			let braceCount = line.includes("{") ? 1 : 0;
			let endLine = eventLineNum;
			for (let i = eventLineNum + 1; i < lines.length; i++) {
				for (const char of lines[i]) {
					if (char === "{") braceCount++;
					if (char === "}") braceCount--;
				}
				if (braceCount === 0) {
					endLine = i;
					break;
				}
			}
			return lines.slice(eventLineNum, endLine + 1).join("\n");
		} else {
			// Type alias - find semicolon
			let endLine = eventLineNum;
			for (let i = eventLineNum; i < lines.length; i++) {
				if (lines[i].endsWith(";")) {
					endLine = i;
					break;
				}
			}
			return lines.slice(eventLineNum, endLine + 1).join("\n");
		}
	}

	// Return all event types summary
	const output = [
		"# Extension Events",
		"",
		"## Event Types Union",
		eventUnion,
		"",
		"## Available Events",
		...eventNames.map((e) => `- ${e}`),
		"",
		"## Event Categories",
		"",
		"### Session Events",
		"- `SessionEvent` — Session lifecycle events (start, switch, branch, compact, shutdown)",
		"- `ResourcesDiscoverEvent` — Resources discovered",
		"",
		"### Agent Events",
		"- `AgentStartEvent` — Agent started processing",
		"- `AgentEndEvent` — Agent finished",
		"- `TurnStartEvent` — Turn started",
		"- `TurnEndEvent` — Turn ended",
		"",
		"### Tool Events",
		"- `ToolCallEvent` — Tool being called (can block)",
		"- `ToolResultEvent` — Tool execution result",
		"- `ToolExecutionStartEvent` — Tool execution started",
		"- `ToolExecutionUpdateEvent` — Tool execution streaming update",
		"- `ToolExecutionEndEvent` — Tool execution finished",
		"",
		"### Message Events",
		"- `MessageStartEvent` — Message started streaming",
		"- `MessageUpdateEvent` — Message streaming update",
		"- `MessageEndEvent` — Message finished",
		"",
		"### Input Events",
		"- `InputEvent` — User input received (can modify)",
		"- `UserBashEvent` — User ran bash command",
		"- `UserPythonEvent` — User ran python code",
		"",
		"### Lifecycle Events",
		"- `ContextEvent` — Context injection (can modify messages)",
		"- `BeforeProviderRequestEvent` — Before API call",
		"- `BeforeAgentStartEvent` — Before agent starts (can inject message)",
		"- `AutoCompactionStartEvent/EndEvent` — Auto compaction lifecycle",
		"- `AutoRetryStartEvent/EndEvent` — Auto retry lifecycle",
		"",
		"### Special Events",
		"- `TtsrTriggeredEvent` — TTSR triggered",
		"- `TodoReminderEvent` — Todo reminder",
		"",
		`Use \`omp_get_events\` with \`event\` parameter for detailed type definition.`,
	];

	return output.join("\n");
}
