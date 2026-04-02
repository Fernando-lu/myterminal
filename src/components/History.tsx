import React from "react";
import { Box, Text } from "ink";
import type { Message, MessageRole } from "../types.js";
import { prompt } from "../constants.js";

function getMessageColor(role: MessageRole) {
  if (role === "user") {
    return "cyan";
  }
  if (role === "assistant") {
    return "green";
  }
  return "gray";
}

function getMessageText(role: MessageRole, text: string) {
  if (role === "user") {
    return `${prompt} ${text}`;
  }
  if (role === "assistant") {
    return text;
  }
  return `• ${text}`;
}

export function History({ history, hasFarewell }: { history: Message[]; hasFarewell: boolean }) {
  return (
    <Box flexDirection="column" marginBottom={hasFarewell ? 0 : 1}>
      {history.map((item) => (
        <Text key={item.id} color={getMessageColor(item.role)}>
          {getMessageText(item.role, item.text)}
        </Text>
      ))}
    </Box>
  );
}
