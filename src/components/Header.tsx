/**
 * 欢迎页头部组件
 *
 * 布局参考 Qwen Code / Claude Code 风格：
 * 左侧 ASCII Logo + 右侧信息卡 + Tips + 分隔线 + 快捷键提示
 *
 * logoLines 只在此组件使用，遵循就近原则（Colocation），不放全局常量。
 */
import React from "react";
import { Box, Text } from "ink";
import { ui } from "../constants.js";

const logoLines = [
  { text: "███╗   ███╗██╗   ██╗", color: "cyanBright" as const },
  { text: "████╗ ████║╚██╗ ██╔╝", color: "blueBright" as const },
  { text: "██╔████╔██║ ╚████╔╝ ", color: "magentaBright" as const },
  { text: "██║╚██╔╝██║  ╚██╔╝  ", color: "redBright" as const },
  { text: "╚═╝ ╚═╝ ╚═╝   ╚═╝   ", color: "whiteBright" as const },
];

export function Header() {
  return (
    <>
      <Box marginBottom={1}>
        <Box flexDirection="column" marginRight={2}>
          {logoLines.map((line) => (
            <Text key={line.text} color={line.color}>
              {line.text}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1}>
          <Text color="magentaBright">{ui.headerTitle}</Text>
          <Text color="gray">{ui.headerModel}</Text>
          <Text color="whiteBright">{ui.headerPath}</Text>
        </Box>
      </Box>

      <Text color="gray" dimColor>
        {ui.tip}
      </Text>
      <Text color="blue">{ui.divider}</Text>

      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          {ui.shortcut}
        </Text>
      </Box>
    </>
  );
}
