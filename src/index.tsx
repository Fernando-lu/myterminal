#!/usr/bin/env node
import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, render, useApp } from "ink";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { spawn } from "node:child_process";
import { Header } from "./components/Header.js";
import { History } from "./components/History.js";
import { InputArea } from "./components/InputArea.js";
import { runCommand } from "./command.js";
import { ui } from "./constants.js";
import type { Message, MessageRole } from "./types.js";

let messageId = 0;

function createMessage(role: MessageRole, text: string): Message {
  messageId += 1;
  return { id: messageId, role, text };
}

type GitExecResult = {
  ok: boolean;
  text: string;
};

function runGit(args: string[]): Promise<GitExecResult> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ ok: false, text: String(error) });
    });

    child.on("close", (code) => {
      const text = `${stdout}\n${stderr}`.trim();
      resolve({ ok: code === 0, text });
    });
  });
}

function App() {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [farewell, setFarewell] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [awaitingCommitMessage, setAwaitingCommitMessage] = useState(false);
  const [runningGit, setRunningGit] = useState(false);

  const push = (role: MessageRole, text: string) => {
    setHistory((prev) => [...prev, createMessage(role, text)]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const leave = useCallback(() => {
    setFarewell((prev) => prev ?? ui.bye);
  }, []);

  const onCommand = async (command: string) => {
    if (runningGit) {
      push("assistant", "git 命令执行中，请稍候...");
      return;
    }

    const result = runCommand(command);
    if (result.type === "none") {
      return;
    }
    push("user", command);

    if (awaitingCommitMessage) {
      setRunningGit(true);
      setAwaitingCommitMessage(false);

      push("assistant", "正在执行: git commit ...");
      const commitResult = await runGit(["commit", "-m", command]);
      if (!commitResult.ok) {
        push("assistant", `commit 失败:\n${commitResult.text || "未知错误"}`);
        setRunningGit(false);
        return;
      }

      push("assistant", "正在执行: git push");
      let pushResult = await runGit(["push"]);
      if (!pushResult.ok && pushResult.text.includes("no upstream branch")) {
        push("assistant", "检测到无 upstream，正在执行: git push -u origin HEAD");
        pushResult = await runGit(["push", "-u", "origin", "HEAD"]);
      }

      if (pushResult.ok) {
        push("assistant", `push 完成\n${pushResult.text}`);
      } else {
        push("assistant", `push 失败:\n${pushResult.text || "未知错误"}`);
      }
      setRunningGit(false);
      return;
    }

    if (result.type === "clear") {
      clearHistory();
      return;
    }
    if (result.type === "exit") {
      leave();
      return;
    }
    if (result.type === "git_push_flow_start") {
      setRunningGit(true);
      push("assistant", "正在执行: git add .");
      const addResult = await runGit(["add", "."]);
      if (!addResult.ok) {
        push("assistant", `git add 失败:\n${addResult.text || "未知错误"}`);
        setRunningGit(false);
        return;
      }

      setAwaitingCommitMessage(true);
      push("assistant", "已暂存改动，请输入 commit message 并回车。");
      setRunningGit(false);
      return;
    }
    if (result.type === "reply") {
      push("assistant", result.text);
    }
  };

  useEffect(() => {
    const onSignal = () => leave();
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    return () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    };
  }, [leave]);

  useEffect(() => {
    if (!farewell) {
      return;
    }
    const t = setTimeout(() => exit(), 80);
    return () => clearTimeout(t);
  }, [farewell, exit]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Header />
      <History history={history} hasFarewell={Boolean(farewell)} />

      {farewell ? (
        <Text color="green">{farewell} 👋</Text>
      ) : (
        <InputArea
          value={input}
          onChange={setInput}
          onSubmit={(value) => {
            setInput("");
            void onCommand(value.trim());
          }}
        />
      )}
    </Box>
  );
}

async function runFallback() {
  output.write(
    `\n${ui.headerTitle}\n${ui.headerModel}\n${ui.headerPath}\n\n${ui.tip}\n\n`,
  );
  const rl = readline.createInterface({
    input,
    output,
    terminal: false,
    crlfDelay: Infinity,
  });
  let awaitingCommitMessage = false;

  for await (const raw of rl) {
    const command = raw.trim();
    const result = runCommand(command);

    if (result.type === "none") {
      continue;
    }

    if (awaitingCommitMessage) {
      awaitingCommitMessage = false;

      output.write("正在执行: git commit ...\n");
      const commitResult = await runGit(["commit", "-m", command]);
      if (!commitResult.ok) {
        output.write(`commit 失败:\n${commitResult.text || "未知错误"}\n`);
        continue;
      }

      output.write("正在执行: git push\n");
      let pushResult = await runGit(["push"]);
      if (!pushResult.ok && pushResult.text.includes("no upstream branch")) {
        output.write("检测到无 upstream，正在执行: git push -u origin HEAD\n");
        pushResult = await runGit(["push", "-u", "origin", "HEAD"]);
      }
      if (pushResult.ok) {
        output.write(`push 完成\n${pushResult.text}\n`);
      } else {
        output.write(`push 失败:\n${pushResult.text || "未知错误"}\n`);
      }
      continue;
    }

    if (result.type === "clear") {
      output.write(`\x1Bc\n${ui.headerTitle}\n${ui.headerModel}\n${ui.headerPath}\n\n${ui.tip}\n\n`);
      continue;
    }

    if (result.type === "exit") {
      output.write(`${ui.bye} 👋\n`);
      rl.close();
      return;
    }

    if (result.type === "git_push_flow_start") {
      output.write("正在执行: git add .\n");
      const addResult = await runGit(["add", "."]);
      if (!addResult.ok) {
        output.write(`git add 失败:\n${addResult.text || "未知错误"}\n`);
        continue;
      }
      awaitingCommitMessage = true;
      output.write("已暂存改动，请输入 commit message 并回车。\n");
      continue;
    }

    if (result.type === "reply") {
      output.write(`${result.text}\n`);
    }
  }
  rl.close();
}

if (process.stdin.isTTY && process.stdout.isTTY) {
  render(<App />);
} else {
  try {
    await runFallback();
  } catch (error) {
    output.write(`启动失败: ${String(error)}\n`);
    process.exit(1);
  }
}
