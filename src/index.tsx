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
import { Box, Text, render, useApp, useInput } from "ink";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ClosingSummary } from "./components/ClosingSummary.js";
import { Header } from "./components/Header.js";
import { History } from "./components/History.js";
import { InputArea } from "./components/InputArea.js";
import { MockApiConnection } from "./mock-api/client.js";
import { getToolDescriptions } from "./tools/index.js";
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
  const connectionRef = useRef(new MockApiConnection());
  const [input, setInput] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [exitHintArmed, setExitHintArmed] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);

  const push = (role: MessageRole, text: string) => {
    setHistory((prev) => [...prev, createMessage(role, text)]);
  };

  const leave = useCallback(() => {
    setExitHintArmed(false);
    setIsClosing(true);
    connectionRef.current.close();
  }, []);

  useInput((value, key) => {
    if (!key.ctrl || value !== "c") {
      return;
    }

    if (isClosing) {
      exit();
      return;
    }

    if (exitHintArmed) {
      leave();
      return;
    }

    setExitHintArmed(true);
  });

  /**
   * 命令处理主流程（职责链）
   * 优先级：内置命令 -> POST 到 mock API（结果全部从长连接回流）
   */
  const onCommand = async (command: string) => {
    if (command) {
      setExitHintArmed(false);
    }

    if (!command || busy) return;

    push("user", command);

    // 内置命令
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

    // 非内置命令：统一 POST 到服务端会话；实际结果通过长连接事件回流
    setBusy(true);
    await connectionRef.current.postMessage(command);
    setBusy(false);
  };

  useEffect(() => {
    if (!isClosing) return;
    exit()
  }, [isClosing, exit]);

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

  /** 生命周期：启动时建立一次长连接并持续消费事件 */
  useEffect(() => {
    let cancelled = false;

    const consume = async () => {
      for await (const evt of connectionRef.current.openStream()) {
        if (cancelled) break;

        if (evt.event === "connected") {
          setConversationId(evt.data.conversationId);
          push("system", `conversation_id: ${evt.data.conversationId}`);
          continue;
        }

        if (evt.event === "status") {
          push("assistant", `[api][${evt.data.requestId.slice(0, 8)}] ${evt.data.text}`);
          continue;
        }

        if (evt.event === "tool_call") {
          setToolCalls((prev) => ({
            ...prev,
            [evt.data.tool]: (prev[evt.data.tool] ?? 0) + 1,
          }));
          push("assistant", `[api][${evt.data.requestId.slice(0, 8)}] 调用工具: ${evt.data.tool}`);
          continue;
        }

        if (evt.event === "message") {
          push("assistant", evt.data.text);
          continue;
        }

        if (evt.event === "done") {
          push("assistant", `[api][${evt.data.requestId.slice(0, 8)}] 流程结束。`);
        }
      }
    };

    void consume();
    return () => {
      cancelled = true;
      connectionRef.current.close();
    };
  }, []);

  return (
    <Box flexDirection="column" paddingX={1}>
      {isClosing ? (
        <ClosingSummary conversationId={conversationId} toolCalls={toolCalls} />
      ) : (
        <>
          <Header />
          <History history={history} hasFarewell={isClosing} />
          <InputArea
            value={input}
            onChange={setInput}
            onSubmit={(value) => {
              setInput("");
              void onCommand(value.trim());
            }}
          />
          {exitHintArmed ? <Text color="yellow">再按一次 Ctrl+C 将退出并显示统计页面</Text> : null}
        </>
      )}
    </Box>
  );
}

/**
 * 非 TTY 模式（管道/脚本环境）
 * 逻辑与 App 组件一致，但用 readline 读取输入、直接 write 输出
 */
async function runFallback() {
  const connection = new MockApiConnection();
  output.write(
    `\n${ui.headerTitle}\n${ui.headerModel}\n${ui.headerPath}\n\n${ui.tip}\n\n`,
  );
  const rl = readline.createInterface({
    input,
    output,
    terminal: false,
    crlfDelay: Infinity,
  });
  const pendingOutputs: string[] = [];
  const consumeEvents = async () => {
    for await (const evt of connection.openStream()) {
      if (evt.event === "connected") {
        output.write(`conversation_id: ${evt.data.conversationId}\n`);
        continue;
      }
      if (evt.event === "status") {
        output.write(`[api][${evt.data.requestId.slice(0, 8)}] ${evt.data.text}\n`);
        continue;
      }
      if (evt.event === "tool_call") {
        output.write(`[api][${evt.data.requestId.slice(0, 8)}] 调用工具: ${evt.data.tool}\n`);
        continue;
      }
      if (evt.event === "message") {
        output.write(`${evt.data.text}\n`);
        continue;
      }
      if (evt.event === "done") {
        pendingOutputs[pendingOutputs.length] = evt.data.requestId;
        output.write(`[api][${evt.data.requestId.slice(0, 8)}] 流程结束。\n`);
      }
    }
  };
  void consumeEvents();

  for await (const raw of rl) {
    const command = raw.trim();
    if (!command) continue;

    if (command === "help") {
      output.write(`可用命令: help, ${getToolDescriptions()}, clear, exit\n`);
      continue;
    }

    if (command === "clear") {
      output.write(`\x1Bc\n${ui.headerTitle}\n${ui.headerModel}\n${ui.headerPath}\n\n${ui.tip}\n\n`);
      continue;
    }

    if (command === "exit" || command === "quit") {
      connection.close();
      rl.close();
      return;
    }

    await connection.postMessage(command);
  }
  connection.close();
  rl.close();
}

/**
 * 启动入口
 * 根据 stdin/stdout 是否为 TTY 决定运行模式：
 * - TTY：React/Ink 渲染（交互式终端）
 * - 非 TTY：readline 逐行读取（管道/脚本）
 */
if (process.stdin.isTTY && process.stdout.isTTY) {
  render(<App />, { exitOnCtrlC: false });
} else {
  try {
    await runFallback();
  } catch (error) {
    output.write(`启动失败: ${String(error)}\n`);
    process.exit(1);
  }
}
