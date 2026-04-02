import type { Tool, ToolResult } from "./types.js";
import { exec } from "../shell.js";

async function commitAndPush(message: string): Promise<ToolResult> {
  const messages: string[] = [];

  messages.push("正在执行: git commit ...");
  const commit = await exec("git", ["commit", "-m", message]);
  if (!commit.ok) {
    messages.push(`commit 失败:\n${commit.stderr || "未知错误"}`);
    return { messages };
  }
  messages.push(commit.stdout || "commit 成功");

  messages.push("正在执行: git push ...");
  let push = await exec("git", ["push"]);
  if (!push.ok && push.stderr.includes("no upstream branch")) {
    messages.push("检测到无 upstream，正在执行: git push -u origin HEAD");
    push = await exec("git", ["push", "-u", "origin", "HEAD"]);
  }

  if (push.ok) {
    messages.push(`push 完成\n${push.stderr || push.stdout}`);
  } else {
    messages.push(`push 失败:\n${push.stderr || "未知错误"}`);
  }

  return { messages };
}

export const gitPushTool: Tool = {
  name: "push",
  description: "push代码 (git add → commit → push)",
  match: (input) => input === "push" || input === "push代码",
  async run() {
    const messages: string[] = [];

    messages.push("正在执行: git add .");
    const add = await exec("git", ["add", "."]);
    if (!add.ok) {
      messages.push(`git add 失败:\n${add.stderr || "未知错误"}`);
      return { messages };
    }

    const status = await exec("git", ["status", "--porcelain"]);
    if (status.ok && !status.stdout.trim()) {
      messages.push("没有需要提交的改动。");
      return { messages };
    }

    messages.push("已暂存改动，请输入 commit message:");

    return {
      messages,
      waitInput: {
        hint: "请输入 commit message",
        handle: commitAndPush,
      },
    };
  },
};
