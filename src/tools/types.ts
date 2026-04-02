/**
 * 工具系统类型定义
 *
 * 设计模式：策略模式（Strategy Pattern）
 * 每个 Tool 是一个策略，通过 match 判断是否命中，通过 run 执行具体逻辑。
 * 主入口不需要知道具体策略的实现细节，只需遍历策略列表找到匹配项并执行。
 *
 * 设计思想：
 * - ToolResult 支持 waitInput（续问/Continuation 模式），
 *   让一个工具可以分多步交互，而不需要在入口维护复杂的状态机。
 * - 每次 waitInput.handle 返回新的 ToolResult，形成链式续问，理论上可以无限步。
 */

/**
 * 工具执行结果
 * messages: 本次执行产生的输出消息列表
 * waitInput: 可选，表示工具需要用户继续输入（续问模式）
 *   - hint: 提示文案
 *   - handle: 接收用户下一次输入并返回新的 ToolResult
 */
export type ToolResult = {
  messages: string[];
  waitInput?: {
    hint: string;
    handle: (input: string) => Promise<ToolResult>;
  };
};

/**
 * 工具接口
 * name: 工具名称（用于注册和调试）
 * description: 描述（用于 help 输出）
 * match: 判断用户输入是否匹配该工具
 * run: 执行工具逻辑，返回 ToolResult
 */
export type Tool = {
  name: string;
  description: string;
  match: (input: string) => boolean;
  run: (input: string) => Promise<ToolResult>;
};
