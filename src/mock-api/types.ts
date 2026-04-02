export type ApiEvent =
  | { event: "status"; data: { text: string } }
  | { event: "message"; data: { text: string } }
  | {
      event: "tool_call";
      data: {
        tool: "newFile" | "deleteFile" | "editFile" | "push" | "shell";
        payload?: Record<string, string | undefined>;
      };
    }
  | { event: "done"; data: { text?: string } };
