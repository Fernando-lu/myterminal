import type { Tool } from "./types.js";

export const echoTool: Tool = {
  name: "echo",
  description: "echo <text>",
  match: (input) => input.startsWith("echo "),
  async run(input) {
    return { messages: [input.slice(5)] };
  },
};
