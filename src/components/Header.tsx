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
