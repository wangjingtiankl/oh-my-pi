/**
 * Extension guide tool - returns full extension development guide.
 */
import { PATHS } from "../data/paths";
import { createGuideTool } from "../utils/guide-tool-factory";

export const { inputSchema, handler } = createGuideTool(PATHS.extensionsDoc);