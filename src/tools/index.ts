/**
 * 工具注册表（Tool Registry）
 *
 * 设计模式：注册表模式（Registry Pattern）
 * 所有工具在这里集中注册，主入口通过 findTool 查找匹配的工具。
 *
 * 扩展方式：
 * 1. 在 src/tools/ 下新建工具文件，实现 Tool 接口
 * 2. 在此文件 import 并加入 tools 数组
 * 3. 主入口无需修改（开闭原则：对扩展开放，对修改关闭）
 */
import type { Tool } from "./types.js";
import { gitPushTool } from "./git-push.js";
import { newFileTool, deleteFileTool, editFileTool } from "./fs-tools.js";
import { execCommand } from "../shell.js";
import type { ToolResult } from "./types.js";

const tools: Tool[] = [newFileTool, deleteFileTool, editFileTool, gitPushTool];

/** 根据用户输入查找匹配的工具 */
export function findTool(input: string): Tool | undefined {
  return tools.find((t) => t.match(input));
}

/** 生成所有工具的描述文本（用于 help 命令输出） */
export function getToolDescriptions(): string {
  return tools.map((t) => t.description).join(", ");
}

export async function runToolByName(
  name: "newFile" | "deleteFile" | "editFile" | "push" | "shell",
  payload: Record<string, string | undefined> = {},
): Promise<ToolResult> {
  if (name === "push") {
    return gitPushTool.run("push");
  }

  if (name === "newFile") {
    return newFileTool.run(`新建 ${payload.path ?? ""}`.trimEnd());
  }

  if (name === "deleteFile") {
    return deleteFileTool.run(`删除 ${payload.path ?? ""}`.trimEnd());
  }

  if (name === "editFile") {
    if (typeof payload.content === "string") {
      return editFileTool.run(`编辑 ${payload.path ?? ""} | ${payload.content}`.trimEnd());
    }
    return editFileTool.run(`编辑 ${payload.path ?? ""}`.trimEnd());
  }

  const shellResult = await execCommand(payload.command ?? "");
  const out = shellResult.stdout || shellResult.stderr || "(无输出)";
  return { messages: [out] };
}

export type { Tool, ToolResult } from "./types.js";
