import type { ApiEvent } from "./types.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseEdit(input: string) {
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

export async function* streamMockApi(input: string): AsyncGenerator<ApiEvent> {
  yield { event: "status", data: { text: "请求已发送到 mock API..." } };
  await sleep(120);
  yield { event: "status", data: { text: "mock API 正在分析你的输入..." } };
  await sleep(160);

  if (input === "push" || input === "push代码") {
    yield { event: "message", data: { text: "识别到 Git 推送流程。" } };
    yield { event: "tool_call", data: { tool: "push" } };
    yield { event: "done", data: { text: "流程结束。" } };
    return;
  }

  if (input.startsWith("新建 ")) {
    const filePath = input.slice(3).trim();
    yield { event: "message", data: { text: "识别到文件创建请求。" } };
    yield {
      event: "tool_call",
      data: { tool: "newFile", payload: { path: filePath } },
    };
    yield { event: "done", data: { text: "流程结束。" } };
    return;
  }

  if (input.startsWith("删除 ")) {
    const filePath = input.slice(3).trim();
    yield { event: "message", data: { text: "识别到文件删除请求。" } };
    yield {
      event: "tool_call",
      data: { tool: "deleteFile", payload: { path: filePath } },
    };
    yield { event: "done", data: { text: "流程结束。" } };
    return;
  }

  if (input.startsWith("编辑 ")) {
    const parsed = parseEdit(input);
    yield { event: "message", data: { text: "识别到文件编辑请求。" } };
    yield {
      event: "tool_call",
      data: { tool: "editFile", payload: parsed },
    };
    yield { event: "done", data: { text: "流程结束。" } };
    return;
  }

  yield { event: "message", data: { text: "未匹配专用意图，改为执行系统命令。" } };
  yield {
    event: "tool_call",
    data: { tool: "shell", payload: { command: input } },
  };
  yield { event: "done", data: { text: "流程结束。" } };
}
