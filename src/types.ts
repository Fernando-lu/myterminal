export type MessageRole = "system" | "user" | "assistant";

export type Message = {
  id: number;
  role: MessageRole;
  text: string;
};
