import { execa } from "execa";

export type ExecResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export async function exec(
  command: string,
  args: string[] = [],
): Promise<ExecResult> {
  const result = await execa(command, args, { reject: false });
  return {
    ok: !result.failed,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
