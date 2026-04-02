import React from "react";
import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { prompt, ui } from "../constants.js";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
};

export function InputArea({ value, onChange, onSubmit }: Props) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="blue">{ui.divider}</Text>
      <Box>
        <Text color="cyan">{prompt} </Text>
        <TextInput
          value={value}
          placeholder={ui.placeholder}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </Box>
      <Text color="blue">{ui.divider}</Text>
    </Box>
  );
}
