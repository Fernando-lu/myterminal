import type { CommandResult } from "./types.js";

export function runCommand(command: string): CommandResult {
  if (!command) {
    return { type: "none" };
  }

  if (command === "help") {
    return { type: "reply", text: "可用命令: help, echo <text>, push代码, clear, exit" };
  }

  if (command === "clear") {
    return { type: "clear" };
  }

  if (command === "exit" || command === "quit") {
    return { type: "exit" };
  }

  if (command.startsWith("echo ")) {
    return { type: "reply", text: command.slice(5) };
  }

  if (command === "push代码" || command === "push") {
    return { type: "git_push_flow_start" };
  }

  return { type: "reply", text: `未知命令: ${command}` };
}
