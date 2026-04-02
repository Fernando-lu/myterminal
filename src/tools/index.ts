import type { Tool } from "./types.js";
import { gitPushTool } from "./git-push.js";
import { echoTool } from "./echo.js";

const tools: Tool[] = [gitPushTool, echoTool];

export function findTool(input: string): Tool | undefined {
  return tools.find((t) => t.match(input));
}

export function getToolDescriptions(): string {
  return tools.map((t) => t.description).join(", ");
}

export type { Tool, ToolResult } from "./types.js";
