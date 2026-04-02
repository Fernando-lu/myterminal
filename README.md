# myterminal

一个用 TypeScript + React(Ink) 实现的终端 CLI 学习项目，风格参考 claude code。

## 功能

- 终端欢迎页（Logo、信息卡、Tips、输入区样式）
- 命令输入与回显（支持工具注册模式）
- 内置命令：`help`、`push代码`、`clear`、`exit`
- 其他输入默认按系统命令执行（例如：`echo hello`、`pwd`、`git status`）
- `push代码` 流程：`git add .` -> 输入 commit message -> `git commit` -> `git push`
- 退出生命周期处理（`exit` / `Ctrl + C` 告别语）
- 非 TTY 场景兜底运行

## 启动

```bash
npm install
npm run dev
```

## 脚本

```bash
npm run dev
npm run build
npm run start
```

## 项目结构

```txt
src/
  components/        # Ink UI 组件
  tools/             # 命令工具（可扩展）
  shell.ts           # 命令执行封装（execa）
  index.tsx          # 应用入口
```

## 扩展命令

1. 在 `src/tools/` 新建一个 tool 文件
2. 实现 `match` 和 `run`
3. 在 `src/tools/index.ts` 注册
