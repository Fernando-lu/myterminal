#!/usr/bin/env node
import React, { useCallback, useEffect, useState } from "react";
import { Box, Text, render, useApp } from "ink";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Header } from "./components/Header.js";
import { History } from "./components/History.js";
import { InputArea } from "./components/InputArea.js";
import { runCommand } from "./command.js";
import { ui } from "./constants.js";
import { gitAddAll, gitCommitAndPush } from "./git.js";
import type { Message, MessageRole } from "./types.js";

let messageId = 0;

function createMessage(role: MessageRole, text: string): Message {
  messageId += 1;
  return { id: messageId, role, text };
}

function App() {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [farewell, setFarewell] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [waitingCommitMessage, setWaitingCommitMessage] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

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
    if (isRunning) {
      return;
    }
    if (waitingCommitMessage) {
      if (!command) {
        push("assistant", "commit message 不能为空，请重新输入。");
        return;
      }
      if (command === "cancel") {
        push("user", command);
        push("assistant", "已取消 push 流程。");
        setWaitingCommitMessage(false);
        return;
      }
      push("user", command);
      setIsRunning(true);
      const result = await gitCommitAndPush(command);
      push("assistant", result.ok ? "已完成 commit + push。" : "push 失败。");
      if (result.text) {
        push("assistant", result.text);
      }
      setWaitingCommitMessage(false);
      setIsRunning(false);
      return;
    }

    const result = runCommand(command);
    if (result.type === "none") {
      return;
    }
    push("user", command);
    if (result.type === "clear") {
      clearHistory();
      return;
    }
    if (result.type === "exit") {
      leave();
      return;
    }
    if (result.type === "reply") {
      push("assistant", result.text);
    }
    if (result.type === "push") {
      setIsRunning(true);
      const added = await gitAddAll();
      if (!added.ok) {
        push("assistant", "git add 失败。");
        if (added.stderr || added.stdout) {
          push("assistant", added.stderr || added.stdout);
        }
        setIsRunning(false);
        return;
      }
      push("assistant", "已执行 git add . ，请输入 commit message（输入 cancel 可取消）。");
      setWaitingCommitMessage(true);
      setIsRunning(false);
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
  let waitingCommitMessage = false;

  for await (const raw of rl) {
    const command = raw.trim();
    if (waitingCommitMessage) {
      if (!command) {
        output.write("commit message 不能为空，请重新输入。\n");
        continue;
      }
      if (command === "cancel") {
        output.write("已取消 push 流程。\n");
        waitingCommitMessage = false;
        continue;
      }
      const done = await gitCommitAndPush(command);
      if (done.ok) {
        output.write("已完成 commit + push。\n");
      } else {
        output.write("push 失败。\n");
      }
      if (done.text) {
        output.write(`${done.text}\n`);
      }
      waitingCommitMessage = false;
      continue;
    }
    const result = runCommand(command);

    if (result.type === "none") {
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

    if (result.type === "reply") {
      output.write(`${result.text}\n`);
    }
    if (result.type === "push") {
      const added = await gitAddAll();
      if (!added.ok) {
        output.write("git add 失败。\n");
        if (added.stderr || added.stdout) {
          output.write(`${added.stderr || added.stdout}\n`);
        }
        continue;
      }
      output.write("已执行 git add . ，请输入 commit message（输入 cancel 可取消）。\n");
      waitingCommitMessage = true;
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
