import { randomUUID } from "node:crypto";
import { runToolByName } from "../tools/index.js";
import type { ToolResult } from "../tools/types.js";
import type { ApiEvent, ToolName } from "./types.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type PendingHandle = ((input: string) => Promise<ToolResult>) | null;

function parseEdit(input: string): Record<string, string | undefined> {
  const body = input.slice(2).trim();
  const idx = body.indexOf(" | ");
  if (idx < 0) {
    return { path: body };
  }
  return {
    path: body.slice(0, idx).trim(),
    content: body.slice(idx + 3),
  };
}

function routeIntent(input: string): {
  tool: ToolName;
  payload: Record<string, string | undefined>;
  message: string;
} {
  if (input === "push" || input === "push代码") {
    return { tool: "push", payload: {}, message: "识别到 Git 推送流程。" };
  }
  if (input.startsWith("新建 ")) {
    return {
      tool: "newFile",
      payload: { path: input.slice(3).trim() },
      message: "识别到文件创建请求。",
    };
  }
  if (input.startsWith("删除 ")) {
    return {
      tool: "deleteFile",
      payload: { path: input.slice(3).trim() },
      message: "识别到文件删除请求。",
    };
  }
  if (input.startsWith("编辑 ")) {
    return {
      tool: "editFile",
      payload: parseEdit(input),
      message: "识别到文件编辑请求。",
    };
  }
  return {
    tool: "shell",
    payload: { command: input },
    message: "未匹配专用意图，改为执行系统命令。",
  };
}

export class MockApiConnection {
  readonly conversationId = randomUUID();
  private queue: ApiEvent[] = [];
  private waiters: Array<() => void> = [];
  private disposed = false;
  private requestChain = Promise.resolve();
  private pendingHandle: PendingHandle = null;

  constructor() {
    this.push({
      event: "connected",
      data: { conversationId: this.conversationId },
    });
  }

  private push(event: ApiEvent) {
    if (this.disposed) return;
    this.queue[this.queue.length] = event;
    const waiter = this.waiters.shift();
    if (waiter) waiter();
  }

  private async nextEvent(): Promise<ApiEvent | null> {
    while (!this.disposed) {
      if (this.queue.length > 0) {
        return this.queue.shift() ?? null;
      }
      await new Promise<void>((resolve) => {
        this.waiters[this.waiters.length] = resolve;
      });
    }
    return null;
  }

  async *openStream(): AsyncGenerator<ApiEvent> {
    while (!this.disposed) {
      const evt = await this.nextEvent();
      if (!evt) break;
      yield evt;
    }
  }

  postMessage(input: string) {
    const requestId = randomUUID();
    this.requestChain = this.requestChain.then(() => this.handlePost(requestId, input));
    return this.requestChain;
  }

  private async handlePost(requestId: string, input: string) {
    this.push({
      event: "status",
      data: { requestId, text: "请求已发送到 mock API..." },
    });
    await sleep(80);
    this.push({
      event: "status",
      data: { requestId, text: "mock API 正在分析你的输入..." },
    });
    await sleep(120);

    if (this.pendingHandle) {
      this.push({
        event: "status",
        data: { requestId, text: "进入续问阶段，使用上一步等待的输入处理器..." },
      });
      const handle = this.pendingHandle;
      this.pendingHandle = null;
      const result = await handle(input);
      this.emitToolResult(requestId, result);
      this.push({ event: "done", data: { requestId } });
      return;
    }

    const intent = routeIntent(input);
    this.push({ event: "message", data: { requestId, text: intent.message } });
    this.push({
      event: "tool_call",
      data: { requestId, tool: intent.tool, payload: intent.payload },
    });
    const result = await runToolByName(intent.tool, intent.payload);
    this.emitToolResult(requestId, result);
    this.push({ event: "done", data: { requestId } });
  }

  private emitToolResult(requestId: string, result: ToolResult) {
    for (const text of result.messages) {
      this.push({ event: "message", data: { requestId, text } });
    }
    this.pendingHandle = result.waitInput?.handle ?? null;
  }

  close() {
    this.disposed = true;
    while (this.waiters.length) {
      const waiter = this.waiters.shift();
      if (waiter) waiter();
    }
  }
}
