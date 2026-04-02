#!/usr/bin/env node
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, render, useApp } from "ink";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Header } from "./components/Header.js";
import { History } from "./components/History.js";
import { InputArea } from "./components/InputArea.js";
import { findTool, getToolDescriptions } from "./tools/index.js";
import type { ToolResult } from "./tools/types.js";
import { ui } from "./constants.js";
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
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<((input: string) => Promise<ToolResult>) | null>(null);

  const push = (role: MessageRole, text: string) => {
    setHistory((prev) => [...prev, createMessage(role, text)]);
  };

  const pushAll = (messages: string[]) => {
    setHistory((prev) => [
      ...prev,
      ...messages.map((text) => createMessage("assistant", text)),
    ]);
  };

  const leave = useCallback(() => {
    setFarewell((prev) => prev ?? ui.bye);
  }, []);

  const handleToolResult = (result: ToolResult) => {
    pushAll(result.messages);
    pendingRef.current = result.waitInput?.handle ?? null;
  };

  const onCommand = async (command: string) => {
    if (!command || busy) return;

    push("user", command);

    if (pendingRef.current) {
      const handle = pendingRef.current;
      pendingRef.current = null;
      setBusy(true);
      const result = await handle(command);
      handleToolResult(result);
      setBusy(false);
      return;
    }

    if (command === "help") {
      push("assistant", `可用命令: help, ${getToolDescriptions()}, clear, exit`);
      return;
    }

    if (command === "clear") {
      setHistory([]);
      return;
    }

    if (command === "exit" || command === "quit") {
      leave();
      return;
    }

    const tool = findTool(command);
    if (tool) {
      setBusy(true);
      const result = await tool.run(command);
      handleToolResult(result);
      setBusy(false);
      return;
    }

    push("assistant", `未知命令: ${command}`);
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
    if (!farewell) return;
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
  type PendingFn = (input: string) => Promise<ToolResult>;
  let pending: PendingFn | null = null;

  for await (const raw of rl) {
    const command = raw.trim();
    if (!command) continue;

    if (pending) {
      const handle: PendingFn = pending;
      pending = null;
      const result: ToolResult = await handle(command);
      result.messages.forEach((m: string) => output.write(`${m}\n`));
      if (result.waitInput) {
        pending = result.waitInput.handle;
      }
      continue;
    }

    if (command === "help") {
      output.write(`可用命令: help, ${getToolDescriptions()}, clear, exit\n`);
      continue;
    }

    if (command === "clear") {
      output.write(`\x1Bc\n${ui.headerTitle}\n${ui.headerModel}\n${ui.headerPath}\n\n${ui.tip}\n\n`);
      continue;
    }

    if (command === "exit" || command === "quit") {
      output.write(`${ui.bye} 👋\n`);
      rl.close();
      return;
    }

    const tool = findTool(command);
    if (tool) {
      const result = await tool.run(command);
      result.messages.forEach((m) => output.write(`${m}\n`));
      if (result.waitInput) {
        pending = result.waitInput.handle;
      }
      continue;
    }

    output.write(`未知命令: ${command}\n`);
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
