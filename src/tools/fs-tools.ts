/**
 * 文件类工具：新建 / 删除 / 编辑
 *
 * 路径安全：resolve 后必须落在 process.cwd() 之下，禁止 ../ 逃出工作区。
 * 编辑支持：`编辑 path | 内容` 一行写完，或 `编辑 path` 后下一行输入整段内容（单行）。
 */
import fs from "node:fs/promises";
import path from "node:path";
import type { Tool, ToolResult } from "./types.js";

function safeResolve(userPath: string): string | null {
  const cwd = process.cwd();
  const trimmed = userPath.trim();
  if (!trimmed) return null;
  const full = path.resolve(cwd, trimmed);
  const root = path.resolve(cwd);
  const rel = path.relative(root, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return null;
  }
  return full;
}

function msgs(...lines: string[]): ToolResult {
  return { messages: lines };
}

/** 新建 <路径> — 创建空文件；父目录自动创建；已存在则提示 */
export const newFileTool: Tool = {
  name: "newFile",
  description: "新建 <路径>",
  match: (input) => input.startsWith("新建 "),
  async run(input) {
    const rel = input.slice(3).trim();
    if (!rel) {
      return msgs("用法: 新建 <路径>");
    }
    const full = safeResolve(rel);
    if (!full) {
      return msgs("路径无效或超出当前工作区。");
    }
    try {
      await fs.access(full);
      return msgs(`已存在: ${rel}`);
    } catch {
      /* ok */
    }
    try {
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, "", "utf8");
      return msgs(`已创建: ${rel}`);
    } catch (e) {
      return msgs(`创建失败: ${String(e)}`);
    }
  },
};

/** 删除 <路径> — 文件或空目录；目录非空需递归删除 */
export const deleteFileTool: Tool = {
  name: "deleteFile",
  description: "删除 <路径>",
  match: (input) => input.startsWith("删除 "),
  async run(input) {
    const rel = input.slice(3).trim();
    if (!rel) {
      return msgs("用法: 删除 <路径>");
    }
    const full = safeResolve(rel);
    if (!full) {
      return msgs("路径无效或超出当前工作区。");
    }
    try {
      await fs.rm(full, { recursive: true, force: false });
      return msgs(`已删除: ${rel}`);
    } catch (e) {
      return msgs(`删除失败: ${String(e)}`);
    }
  },
};

async function writeEditedFile(full: string, rel: string, content: string): Promise<ToolResult> {
  try {
    await fs.writeFile(full, content, "utf8");
    return msgs(`已写入: ${rel}（${content.length} 字符）`);
  } catch (e) {
    return msgs(`写入失败: ${String(e)}`);
  }
}

/** 编辑 <路径> [| 内容] — 可选 ` | ` 后为全文替换；否则下一行输入单行内容 */
export const editFileTool: Tool = {
  name: "editFile",
  description: "编辑 <路径> [| 内容]",
  match: (input) => input.startsWith("编辑 "),
  async run(input) {
    const rest = input.slice(3).trim();
    if (!rest) {
      return msgs("用法: 编辑 <路径> 或 编辑 <路径> | <新内容>");
    }

    const sep = " | ";
    const sepIdx = rest.indexOf(sep);
    if (sepIdx >= 0) {
      const rel = rest.slice(0, sepIdx).trim();
      const content = rest.slice(sepIdx + sep.length);
      if (!rel) {
        return msgs("路径不能为空。");
      }
      const full = safeResolve(rel);
      if (!full) {
        return msgs("路径无效或超出当前工作区。");
      }
      return writeEditedFile(full, rel, content);
    }

    const full = safeResolve(rest);
    if (!full) {
      return msgs("路径无效或超出当前工作区。");
    }

    let preview = "";
    try {
      preview = await fs.readFile(full, "utf8");
    } catch {
      return {
        messages: [
          `文件尚不存在，将创建: ${rest}`,
          "请输入文件内容（单行），输入 :q 取消:",
        ],
        waitInput: {
          hint: "新文件内容",
          async handle(line) {
            if (line.trim() === ":q") {
              return msgs("已取消。");
            }
            const parent = path.dirname(full);
            await fs.mkdir(parent, { recursive: true });
            return writeEditedFile(full, rest, line);
          },
        },
      };
    }

    const head = preview.length > 400 ? `${preview.slice(0, 400)}…` : preview;
    return {
      messages: [
        `当前文件（前段预览）:\n${head || "(空文件)"}`,
        "请输入替换后的全文（单行），输入 :q 取消:",
      ],
      waitInput: {
        hint: "新内容",
        async handle(line) {
          if (line.trim() === ":q") {
            return msgs("已取消。");
          }
          return writeEditedFile(full, rest, line);
        },
      },
    };
  },
};
