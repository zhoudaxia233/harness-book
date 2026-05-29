# harness-book

> 本地阅读：打开 `index.html`。  
> 源稿：`chapters/*.md`。运行 `npm run build` 可重新生成阅读版。

《Agent Harness：拆开编码代理》是一份中文深读手稿，用来解释 Claude Code、Codex、Pi 这类 coding agent / agent harness 到底是怎么来的。

它不把编码代理讲成“更聪明的聊天机器人”，而是从一个用户请求出发，拆开它如何变成一次可观察、可执行、可回滚、可验证的代码变更：上下文如何装配，工具如何暴露，shell 如何运行，补丁如何应用，权限如何判断，session 如何记录，失败如何恢复，最后如何做出差异化。

## 结构

| 章 | 标题 |
|---|---|
| 0 | 写在前面 |
| 1 | 一次改代码任务的全链路 |
| 2 | Agent Harness 的最小心智模型 |
| 3 | 先做一个能跑的 toy agent |
| 4 | 上下文从哪里来 |
| 5 | Session：代理真正“记住”的东西 |
| 6 | 工具调用不是函数调用 |
| 7 | Shell、文件系统与工作区 |
| 8 | 代码编辑策略 |
| 9 | 权限、沙箱与安全边界 |
| 10 | 验证与错误恢复 |
| 11 | 产品化界面：Claude Code / Codex / Pi 的可观察差异 |
| 12 | 扩展层：MCP、hooks、skills、subagents、workflows |
| 13 | 做出差异化 |
| 14 | 进阶资源 |

## 构建

```bash
npm run build
```

生成结果是单文件 `index.html`，包含内联 CSS、内联 SVG 图示和全部正文。没有运行时依赖。

## 主要资料入口

- Pi: [pi.dev](https://pi.dev/)、[earendil-works/pi](https://github.com/earendil-works/pi)
- Claude Code: [overview](https://code.claude.com/docs/en/overview), [how Claude Code works](https://code.claude.com/docs/en/how-claude-code-works), [permissions](https://code.claude.com/docs/en/permissions)
- Codex: [CLI](https://developers.openai.com/codex/cli), [security](https://developers.openai.com/codex/security), [AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [sandboxing](https://developers.openai.com/codex/concepts/sandboxing)
- 开源 Codex CLI: [openai/codex](https://github.com/openai/codex)

## 写作约束

- 先 mental model，再实现落点，再源码/行为定位。
- 只对闭源产品做公开资料和可观察行为层面的描述，不声称知道内部实现。
- 技术措辞保持克制：模型提出 tool call，harness 执行工具；context 不是 memory；MCP 是协议，不是安全边界。
- 每章尽量回答同一个问题：这个环节如何帮助“一个用户请求变成经过验证的代码变更”。
