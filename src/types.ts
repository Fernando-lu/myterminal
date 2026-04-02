/**
 * 消息系统类型
 *
 * 借鉴聊天式 UI 的消息模型：
 * - system: 系统提示信息（欢迎语等）
 * - user: 用户输入
 * - assistant: 工具/命令的回复
 *
 * 每条消息有唯一 id，用于 React key 渲染优化
 */
export type MessageRole = "system" | "user" | "assistant";

export type Message = {
  id: number;
  role: MessageRole;
  text: string;
};
