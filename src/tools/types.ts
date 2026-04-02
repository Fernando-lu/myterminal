export type ToolResult = {
  messages: string[];
  waitInput?: {
    hint: string;
    handle: (input: string) => Promise<ToolResult>;
  };
};

export type Tool = {
  name: string;
  description: string;
  match: (input: string) => boolean;
  run: (input: string) => Promise<ToolResult>;
};
