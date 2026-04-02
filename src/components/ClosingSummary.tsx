import React from "react";
import { Box, Text } from "ink";

type Props = Readonly<{
  conversationId: string | null;
  toolCalls: Record<string, number>;
}>;

export function ClosingSummary({ conversationId, toolCalls }: Props) {
  const totalToolCalls = Object.values(toolCalls).reduce((sum, count) => sum + count, 0);
  const toolSummary = Object.entries(toolCalls)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name} x${count}`)
    .join(", ");

  return (
    <Box flexDirection="column">
      <Text color="magentaBright">{`MyTerminal 正在关闭，再见！`}</Text>
      <Box flexDirection="column" borderStyle="round" borderColor="blueBright" paddingX={2} marginTop={1} marginBottom={2}>
        <Text bold>交互摘要</Text>
        <Text>{`会话 ID: ${conversationId ?? "-"}`}</Text>
        <Text>{`工具调用: ${totalToolCalls}`}</Text>
        <Text>{`工具统计: ${toolSummary || "-"}`}</Text>
      </Box>
      {/* <Text color="gray">再次按 Ctrl+C 立即退出</Text> */}
    </Box>
  );
}
