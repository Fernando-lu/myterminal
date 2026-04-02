export type ToolName = "newFile" | "deleteFile" | "editFile" | "push" | "shell";

export type ApiEvent =
  | { event: "connected"; data: { conversationId: string } }
  | { event: "status"; data: { requestId: string; text: string } }
  | { event: "message"; data: { requestId: string; text: string } }
  | {
      event: "tool_call";
      data: {
        requestId: string;
        tool: ToolName;
        payload?: Record<string, string | undefined>;
      };
    }
  | { event: "done"; data: { requestId: string } };
