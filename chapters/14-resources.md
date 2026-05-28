# §14 进阶资源：读完不是终点

这本书只搭骨架。真正吃透 agent harness，要读源码、跑小实验、积累失败 trace。

## 可点击资料入口

这些入口用于定位事实，不用于背诵产品口号。产品文档会变化，读的时候以页面当前版本为准。

- Pi 官网：[pi.dev](https://pi.dev/)
- Pi 源码：[earendil-works/pi](https://github.com/earendil-works/pi)
- Pi coding-agent 包：[packages/coding-agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)
- Claude Code overview：[code.claude.com/docs/en/overview](https://code.claude.com/docs/en/overview)
- Claude Code how it works：[code.claude.com/docs/en/how-claude-code-works](https://code.claude.com/docs/en/how-claude-code-works)
- Claude Code permissions：[code.claude.com/docs/en/permissions](https://code.claude.com/docs/en/permissions)
- Claude Code MCP：[code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp)
- Claude Code hooks：[code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks)
- Claude Code skills：[code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)
- Claude Code subagents：[code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents)
- Codex CLI docs：[developers.openai.com/codex/cli](https://developers.openai.com/codex/cli)
- Codex security docs：[developers.openai.com/codex/security](https://developers.openai.com/codex/security)
- Codex AGENTS.md docs：[developers.openai.com/codex/guides/agents-md](https://developers.openai.com/codex/guides/agents-md)
- Codex sandboxing docs：[developers.openai.com/codex/concepts/sandboxing](https://developers.openai.com/codex/concepts/sandboxing)
- Codex permissions docs：[developers.openai.com/codex/permissions](https://developers.openai.com/codex/permissions)
- Codex hooks docs：[developers.openai.com/codex/hooks](https://developers.openai.com/codex/hooks)
- Codex skills docs：[developers.openai.com/codex/skills](https://developers.openai.com/codex/skills)
- Codex MCP docs：[developers.openai.com/codex/mcp](https://developers.openai.com/codex/mcp)
- Codex subagents docs：[developers.openai.com/codex/subagents](https://developers.openai.com/codex/subagents)
- Open-source Codex CLI：[openai/codex](https://github.com/openai/codex)

## 建议阅读顺序

### 1. 先读极简实现

找一个 200 行以内的 tool-calling agent。重点看：

- messages 如何组织。
- tool schema 如何传给模型。
- tool result 如何回到下一轮。
- 工具错误如何处理。

不要在这个阶段追求安全和完整。你只是要看见循环。

### 2. 再读 Pi

Pi 适合拆 harness，因为它刻意保持 minimal。建议顺序：

- `packages/agent/src/agent-loop.ts`
- `packages/agent/src/types.ts`
- `packages/coding-agent/src/core/tools/`
- `packages/coding-agent/src/core/sdk.ts`
- `packages/coding-agent/src/core/agent-session.ts`
- `docs/session-format.md`
- `docs/compaction.md`
- `docs/extensions.md`

读 Pi 时不要只看功能清单，要看它为什么把某些东西留给 extension。

### 3. 再读 Codex CLI

Codex CLI 开源，适合看一个产品级工具如何在 Rust / TUI / app server / sandbox / config 里组织复杂度。

建议读：

- `README.md`
- `docs/agents_md.md`
- `docs/config.md`
- `docs/sandbox.md`
- `codex-rs/` 下的 CLI、core、apply-patch、protocol 相关模块

同时对照 OpenAI developers 上的 Codex CLI、security、AGENTS.md、skills、hooks、permissions 文档。

### 4. 再读 Claude Code 文档

Claude Code 闭源部分不能瞎猜，但官方文档很适合看产品化边界：

- How Claude Code works
- context window
- permissions
- settings
- MCP
- hooks
- skills
- subagents
- sessions / checkpoints

读法是：不要问“内部是不是这么实现”，而问“它把什么能力暴露成了产品概念”。

## 术语警戒线

最后再列一次全书最重要的措辞边界。

- 不要说“model 就是 agent”。agent 至少包含模型、上下文、工具循环、状态、权限和执行环境。
- 不要说“模型执行了 bash”。模型提出 tool call，harness 执行。
- 不要说“context window 就是 memory”。context 是当前输入预算；memory 是外部持久化、摘要、检索或规则注入。
- 不要说“MCP 让工具安全”。MCP 是协议，不是安全策略。
- 不要说“subagent 必然更强”。subagent 提供隔离和并行，也带来协调成本。
- 不要把闭源产品内部说死。除非有官方文档或源码证据，否则用“可观察行为”和“设计推断”。

## 最后的检查清单

读完这本书后，你应该能回答：

- 一个用户请求如何变成 session 事件流？
- context builder 为什么比“全仓库塞进去”更重要？
- tool call 为什么要 schema、权限、输出截断？
- shell tool 最少要记录哪些字段？
- 为什么 patch 比 write_file 更适合真实项目？
- sandbox 和 approval 分别解决什么问题？
- agent 如何验证自己没搞坏？
- Claude Code / Codex / Pi 的差异是产品取舍，不是简单强弱。
- 如果你要做自己的 harness，第一版该删掉哪些野心？

如果这些问题能说清楚，门道就已经入门了。剩下就是工程：拿固定任务集跑，收集失败 trace，一次只改一个薄弱环节。

## 致谢

本书的写法参考了 `nanochat-book` 那种“先建立完整流水线，再逐段拆开”的教学路径。技术参照来自 Pi、Claude Code、Codex 的公开文档与源码。任何闭源产品内部实现，都只按公开资料和可观察行为讨论。
