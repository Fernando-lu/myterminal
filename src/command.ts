import type { CommandResult } from "./types.js";

function isPushIntent(command: string) {
  return command === "push" || command === "push代码" || command === "push code" || command === "git push";
}

export function runCommand(command: string): CommandResult {
  if (!command) {
    return { type: "none" };
  }

  if (command === "help") {
    return { type: "reply", text: "可用命令: help, echo <text>, push, clear, exit" };
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

  if (isPushIntent(command)) {
    return { type: "push" };
  }

  return { type: "reply", text: `未知命令: ${command}` };
}
