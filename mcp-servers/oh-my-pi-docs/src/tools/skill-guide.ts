/**
 * Skill guide tool - returns full skill development guide.
 */
import { PATHS } from "../data/paths";
import { createGuideTool } from "../utils/guide-tool-factory";

export const { inputSchema, handler } = createGuideTool(PATHS.skillsDoc);