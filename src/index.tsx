#!/usr/bin/env node
/**
 * 应用入口
 *
 * 整体架构：
 * ┌─────────────────────────────────────────────────────┐
 * │  用户输入                                            │
 * │    ↓                                                │
 * │  内置命令？(help/clear/exit) → 直接处理               │
 * │    ↓ 否                                              │
 * │  匹配到 Tool？ → 执行 tool.run()                      │
 * │    ↓ 否                                              │
 * │  当作系统命令执行 (execCommand)                        │
 * └─────────────────────────────────────────────────────┘
 *
 * 设计模式：
 * - 职责链（Chain of Responsibility）：输入依次经过 pending → 内置命令 → 工具匹配 → shell 兜底
 * - 续问模式（Continuation）：pendingRef 存储工具返回的 waitInput.handle，下次输入直接调用
 * - 适配器（Adapter）：同一套命令处理逻辑适配 TTY（React/Ink）和非 TTY（readline）两种运行环境
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Text, render, useApp } from "ink";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Header } from "./components/Header.js";
import { History } from "./components/History.js";
import { InputArea } from "./components/InputArea.js";
import { execCommand } from "./shell.js";
import { findTool, getToolDescriptions } from "./tools/index.js";
import type { ToolResult } from "./tools/types.js";
import { ui } from "./constants.js";
import type { Message, MessageRole } from "./types.js";

let messageId = 0;

function createMessage(role: MessageRole, text: string): Message {
  messageId += 1;
  return { id: messageId, role, text };
}

/**
 * TTY 模式主组件（React/Ink 渲染）
 * 状态管理全部在组件内，工具执行结果通过 push/pushAll 写入 history
 */
function App() {
  const { exit } = useApp();
  const [input, setInput] = useState("");
  const [farewell, setFarewell] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  /** 续问句柄：如果上一个工具返回了 waitInput，下次输入会直接调用这个 handle */
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

  /** 统一处理工具返回值：输出消息 + 存储续问句柄 */
  const handleToolResult = (result: ToolResult) => {
    pushAll(result.messages);
    pendingRef.current = result.waitInput?.handle ?? null;
  };

  /**
   * 命令处理主流程（职责链）
   * 优先级：pending 续问 → 内置命令 → 注册工具 → 系统命令兜底
   */
  const onCommand = async (command: string) => {
    if (!command || busy) return;

    push("user", command);

    // 1. 续问模式：上一个工具要求继续输入
    if (pendingRef.current) {
      const handle = pendingRef.current;
      pendingRef.current = null;
      setBusy(true);
      const result = await handle(command);
      handleToolResult(result);
      setBusy(false);
      return;
    }

    // 2. 内置命令（不走工具系统）
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

    // 3. 匹配注册工具
    const tool = findTool(command);
    if (tool) {
      setBusy(true);
      const result = await tool.run(command);
      handleToolResult(result);
      setBusy(false);
      return;
    }

    // 4. 兜底：当作系统命令直接执行
    setBusy(true);
    const shellResult = await execCommand(command);
    const out = shellResult.stdout || shellResult.stderr || "(无输出)";
    push("assistant", out);
    setBusy(false);
  };

  /** 生命周期：信号退出 */
  useEffect(() => {
    const onSignal = () => leave();
    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
    return () => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    };
  }, [leave]);

  /** 生命周期：告别语显示后延迟退出 */
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

/**
 * 非 TTY 模式（管道/脚本环境）
 * 逻辑与 App 组件一致，但用 readline 读取输入、直接 write 输出
 */
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

    const shellResult = await execCommand(command);
    const out = shellResult.stdout || shellResult.stderr || "(无输出)";
    output.write(`${out}\n`);
  }
  rl.close();
}

/**
 * 启动入口
 * 根据 stdin/stdout 是否为 TTY 决定运行模式：
 * - TTY：React/Ink 渲染（交互式终端）
 * - 非 TTY：readline 逐行读取（管道/脚本）
 */
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
