# myterminal

一个用 TypeScript + React(Ink) 实现的终端 CLI 学习项目，风格参考 claude code。

## 功能

- 终端欢迎页（Logo、信息卡、Tips、输入区样式）
- 命令输入与回显
- 内置命令：`help`、`echo <text>`、`clear`、`exit`
- 退出生命周期处理（`exit` / `Ctrl + C` 告别语）
- 非 TTY 场景兜底运行

## 启动

```bash
npm install
npm run dev
```
