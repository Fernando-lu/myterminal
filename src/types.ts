export type MessageRole = "system" | "user" | "assistant";

export type Message = {
  id: number;
  role: MessageRole;
  text: string;
};

export type CommandResult =
  | { type: "none" }
  | { type: "reply"; text: string }
  | { type: "clear" }
  | { type: "exit" }
  | { type: "git_push_flow_start" };
