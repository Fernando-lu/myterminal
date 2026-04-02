/**
 * 历史消息列表组件
 *
 * 渲染所有对话消息，按角色区分颜色：
 * - user（cyan）：用户输入，前面带提示符
 * - assistant（green）：工具/命令回复
 * - system（gray）：系统提示
 *
 * 使用 message.id 作为 React key，保证列表渲染稳定性。
 */
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
