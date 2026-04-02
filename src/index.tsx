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

  const push = (role: MessageRole, text: string) => {
    setHistory((prev) => [...prev, createMessage(role, text)]);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const leave = useCallback(() => {
    setFarewell((prev) => prev ?? ui.bye);
  }, []);

  const onCommand = (command: string) => {
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
            onCommand(value.trim());
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

  for await (const raw of rl) {
    const command = raw.trim();
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
