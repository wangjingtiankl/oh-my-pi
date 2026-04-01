/**
 * MCP Documentation Server for oh-my-pi
 *
 * Provides tools for querying extension development knowledge:
 * - API reference
 * - Event types
 * - Code examples
 * - Documentation browsing
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logger } from "@oh-my-pi/pi-utils";

// Import tool handlers and schemas
import * as overview from "./tools/overview";
import * as extensionGuide from "./tools/extension-guide";
import * as hookGuide from "./tools/hook-guide";
import * as customToolGuide from "./tools/custom-tool-guide";
import * as mcpGuide from "./tools/mcp-guide";
import * as skillGuide from "./tools/skill-guide";
import * as apiReference from "./tools/api-reference";
import * as events from "./tools/events";
import * as toolSchema from "./tools/tool-schema";
import * as examples from "./tools/examples";
import * as docsBrowser from "./tools/docs-browser";
import * as conventions from "./tools/conventions";
import * as search from "./tools/search";

const server = new McpServer({
	name: "omp-docs",
	version: "1.0.0",
});

// Category 1: Overview
server.registerTool(
	"omp_get_overview",
	{
		description: "Get extension system architecture overview. Returns summary of mechanisms, runtime model, and quick start.",
		inputSchema: overview.inputSchema,
	},
	async (params) => {
		const result = await overview.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

// Category 2: Detailed Guides
server.registerTool(
	"omp_get_extension_guide",
	{
		description: "Get full extension development guide from docs/extensions.md. Optionally extract specific section.",
		inputSchema: extensionGuide.inputSchema,
	},
	async (params) => {
		const result = await extensionGuide.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_get_hook_guide",
	{
		description: "Get full hook development guide from docs/hooks.md. Optionally extract specific section.",
		inputSchema: hookGuide.inputSchema,
	},
	async (params) => {
		const result = await hookGuide.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_get_custom_tool_guide",
	{
		description: "Get custom tool development guide from docs/custom-tools.md. Optionally extract specific section.",
		inputSchema: customToolGuide.inputSchema,
	},
	async (params) => {
		const result = await customToolGuide.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_get_mcp_guide",
	{
		description: "Get combined MCP documentation from docs/mcp-*.md files. Optionally extract specific section.",
		inputSchema: mcpGuide.inputSchema,
	},
	async (params) => {
		const result = await mcpGuide.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_get_skill_guide",
	{
		description: "Get skill development guide from docs/skills.md. Optionally extract specific section.",
		inputSchema: skillGuide.inputSchema,
	},
	async (params) => {
		const result = await skillGuide.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

// Category 3: API Reference
server.registerTool(
	"omp_get_api",
	{
		description: "Get ExtensionAPI interface reference. Optionally query specific method signature.",
		inputSchema: apiReference.inputSchema,
	},
	async (params) => {
		const result = await apiReference.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_get_events",
	{
		description: "Get extension event type definitions. Optionally query specific event type.",
		inputSchema: events.inputSchema,
	},
	async (params) => {
		const result = await events.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_get_tool_schema",
	{
		description: "Get ToolDefinition interface and parameter schema patterns for registering tools.",
		inputSchema: toolSchema.inputSchema,
	},
	async (params) => {
		const result = await toolSchema.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

// Category 4: Examples & Conventions
server.registerTool(
	"omp_list_examples",
	{
		description: "List available code examples. Optionally filter by type (extension, hook, custom-tool, sdk).",
		inputSchema: examples.listSchema,
	},
	async (params) => {
		const result = await examples.listHandler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_read_example",
	{
		description: "Read specific example source code by name.",
		inputSchema: examples.readSchema,
	},
	async (params) => {
		const result = await examples.readHandler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_get_conventions",
	{
		description: "Get project development conventions from AGENTS.md (Code Quality, Bun Over Node, Logging, Commands).",
		inputSchema: conventions.inputSchema,
	},
	async (params) => {
		const result = await conventions.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

// Category 5: General Query
server.registerTool(
	"omp_list_docs",
	{
		description: "List all documentation files in docs/ directory. Optionally filter by category.",
		inputSchema: docsBrowser.listSchema,
	},
	async (params) => {
		const result = await docsBrowser.listHandler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_read_doc",
	{
		description: "Read specific documentation file. Optionally extract specific section.",
		inputSchema: docsBrowser.readSchema,
	},
	async (params) => {
		const result = await docsBrowser.readHandler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

server.registerTool(
	"omp_search",
	{
		description: "Search across docs, examples, and types for matching patterns.",
		inputSchema: search.inputSchema,
	},
	async (params) => {
		const result = await search.handler(params);
		return { content: [{ type: "text", text: result }] };
	},
);

// Start server
async function runServer() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

runServer().catch((err) => {
	logger.error("MCP server error", { error: err });
	process.exit(1);
});