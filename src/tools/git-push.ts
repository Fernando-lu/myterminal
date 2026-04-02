import type { Tool, ToolResult } from "./types.js";
import { exec } from "../shell.js";

async function commitAndPush(message: string): Promise<ToolResult> {
  const messages: string[] = [];
  const append = (text: string) => {
    messages[messages.length] = text;
  };

  append("正在执行: git commit ...");
  const commit = await exec("git", ["commit", "-m", message]);
  if (!commit.ok) {
    append(`commit 失败:\n${commit.stderr || "未知错误"}`);
    return { messages };
  }
  append(commit.stdout || "commit 成功");

  append("正在执行: git push ...");
  let push = await exec("git", ["push"]);
  if (!push.ok && push.stderr.includes("no upstream branch")) {
    append("检测到无 upstream，正在执行: git push -u origin HEAD");
    push = await exec("git", ["push", "-u", "origin", "HEAD"]);
  }

  if (push.ok) {
    append(`push 完成\n${push.stderr || push.stdout}`);
  } else {
    append(`push 失败:\n${push.stderr || "未知错误"}`);
  }

  return { messages };
}

export const gitPushTool: Tool = {
  name: "push",
  description: "push代码",
  match: (input) => input === "push" || input === "push代码",
  async run() {
    const messages: string[] = [];
    const append = (text: string) => {
      messages[messages.length] = text;
    };

    append("正在执行: git add .");
    const add = await exec("git", ["add", "."]);
    if (!add.ok) {
      append(`git add 失败:\n${add.stderr || "未知错误"}`);
      return { messages };
    }

    const status = await exec("git", ["status", "--porcelain"]);
    if (status.ok && !status.stdout.trim()) {
      append("没有需要提交的改动。");
      return { messages };
    }

    append("已暂存改动，请输入 commit message:");

    return {
      messages,
      waitInput: {
        hint: "请输入 commit message",
        handle: commitAndPush,
      },
    };
  },
};
