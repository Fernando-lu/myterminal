import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

type CmdResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

async function run(command: string): Promise<CmdResult> {
  try {
    const { stdout, stderr } = await execAsync(command);
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return {
      ok: false,
      stdout: (e.stdout ?? "").trim(),
      stderr: (e.stderr ?? "").trim(),
    };
  }
}

export async function gitAddAll() {
  return run("git add .");
}

export async function gitCommitAndPush(message: string) {
  const safe = message.replace(/"/g, '\\"');
  const commit = await run(`git commit -m "${safe}"`);
  if (!commit.ok) {
    return {
      ok: false,
      text: commit.stderr || commit.stdout || "git commit 失败",
    };
  }
  const push = await run("git push");
  if (!push.ok) {
    return {
      ok: false,
      text: push.stderr || push.stdout || "git push 失败",
    };
  }
  return {
    ok: true,
    text: [commit.stdout, push.stdout].filter(Boolean).join("\n"),
  };
}
