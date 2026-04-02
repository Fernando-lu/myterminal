/**
 * 全局 UI 常量
 *
 * 集中管理所有文案和样式字符，便于统一修改和国际化。
 * 只放被多个模块共享的常量，组件私有的数据（如 logoLines）放在组件内部。
 */
export const prompt = "❯";

export const ui = {
  headerTitle: "> myterminal code (v0.1.0)",
  headerModel: "my OAuth | coder-model (/model to change)",
  headerPath: "~/Desktop/workspace/learn/myterminal",
  tip: "Tips: 运行 myterminal --continue 或 myterminal --resume 可继续之前会话。",
  shortcut: "按 ? 查看快捷键",
  placeholder: "输入您的消息或 @ 文件路径",
  divider: "──────────────────────────────────────────────────────────────",
};
