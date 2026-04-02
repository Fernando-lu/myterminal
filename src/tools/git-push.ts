/**
 * Git Push 工具
 *
 * 设计模式：续问模式（Continuation Pattern）
 * 整个 push 流程分两步：
 *   第一步（run）：执行 git add，然后通过 waitInput 要求用户输入 commit message
 *   第二步（commitAndPush）：拿到 message 后执行 git commit + git push
 *
 * 这样做的好处：
 * - 工具内部不持有状态，每一步都是纯函数（输入 -> 输出）
 * - 主入口只需存一个 pending handle，不需要维护"当前处于哪个步骤"的状态机
 * - 如果以后有更多步骤（比如选择分支），只需要在 ToolResult 里继续返回 waitInput
 */
import type { Tool, ToolResult } from "./types.js";
import { exec } from "../shell.js";

/** 第二步：拿到 commit message 后执行 commit 和 push */
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

/** 第一步：git add，然后等待用户输入 commit message */
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
