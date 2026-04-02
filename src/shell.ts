/**
 * Shell 命令执行层
 *
 * 设计思想：
 * - 对底层命令执行做一层薄封装（Facade 模式），屏蔽 execa 的细节
 * - 统一返回 ExecResult { ok, stdout, stderr }，上层不需要关心异常处理
 * - 提供两种执行方式：
 *   exec(cmd, args)  — 参数化执行，安全（不走 shell 拼接，防注入）
 *   execCommand(line) — 整行执行，方便（用户直接输入的命令走这个）
 *
 * 为什么用 execa 而不是原生 child_process：
 * - Promise 原生支持
 * - reject: false 可以拿到失败结果而不是抛异常
 * - 输出自动 trim、类型完善
 */
import { execa, execaCommand } from "execa";

export type ExecResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

/** 参数化执行（推荐用于工具内部，如 git add / git push） */
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

/** 整行命令执行（用于用户直接输入的系统命令，如 ls、pwd） */
export async function execCommand(commandLine: string): Promise<ExecResult> {
  const result = await execaCommand(commandLine, { reject: false, shell: true });
  return {
    ok: !result.failed,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
