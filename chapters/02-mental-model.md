# §2 Agent Harness 的最小心智模型

现在给本书的核心定义。

**Agent Harness 是把语言模型接到真实工作区上的运行时。**它负责选择模型输入、暴露工具、执行动作、记录状态、约束权限、展示过程，并把真实世界的反馈重新交给模型。

它至少包含六个部件。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 840 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Harness layers">
<style>.r{fill:#fffaf0;stroke:#17130d;stroke-width:1.3}.a{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.4}.t{font:600 15px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}</style>
<rect x="240" y="30" width="360" height="56" class="a"/><text x="420" y="64" text-anchor="middle" class="t">Model：决定下一步想做什么</text>
<rect x="110" y="120" width="150" height="70" class="r"/><text x="185" y="150" text-anchor="middle" class="t">Context</text><text x="185" y="172" text-anchor="middle" class="s">看见什么</text>
<rect x="275" y="120" width="150" height="70" class="r"/><text x="350" y="150" text-anchor="middle" class="t">Tools</text><text x="350" y="172" text-anchor="middle" class="s">能做什么</text>
<rect x="440" y="120" width="150" height="70" class="r"/><text x="515" y="150" text-anchor="middle" class="t">Session</text><text x="515" y="172" text-anchor="middle" class="s">发生过什么</text>
<rect x="605" y="120" width="150" height="70" class="r"/><text x="680" y="150" text-anchor="middle" class="t">Policy</text><text x="680" y="172" text-anchor="middle" class="s">允许什么</text>
<rect x="190" y="230" width="210" height="78" class="a"/><text x="295" y="262" text-anchor="middle" class="t">Workspace Runtime</text><text x="295" y="286" text-anchor="middle" class="s">FS / shell / git / tests</text>
<rect x="440" y="230" width="210" height="78" class="a"/><text x="545" y="262" text-anchor="middle" class="t">Interface</text><text x="545" y="286" text-anchor="middle" class="s">diff / approve / interrupt</text>
<path d="M420 86 L185 120 M420 86 L350 120 M420 86 L515 120 M420 86 L680 120 M350 190 L295 230 M680 190 L295 230 M515 190 L545 230" stroke="#9f351e" fill="none"/>
</svg>
</div>
<figcaption>FIG 2·1 Harness 的六个核心部件。模型在最上层，但它不是整个系统。</figcaption>
</figure>

## Model：决策内核

模型负责基于当前上下文预测下一步：回答、读文件、跑命令、应用补丁、继续验证，或者向用户提问。不同模型会影响质量、速度、成本、上下文长度和工具调用格式，但本书重点不是模型训练，而是外层运行时。

一句话：模型负责“想做什么”。

## Context：它能看见什么

context 不是 memory。context 是本轮请求真正送进模型的输入预算，里面可能有系统指令、项目说明、用户任务、最近历史、文件片段、工具结果、压缩摘要。

一句话：context 决定模型这一轮根据什么做判断。

## Tools：它能做什么

工具是 harness 暴露给模型的 typed capability。读文件、搜代码、跑 shell、编辑文件、打开浏览器、查网页、调 MCP server，都可以是工具。工具的 schema 越清楚，模型越不容易乱填参数；工具的返回越结构化，下一轮越容易接着干。

一句话：tools 把文字意图接到真实世界。

## Session：它经历过什么

session 是任务的事件日志。用户说了什么、模型请求了什么工具、工具返回什么、哪些权限被允许或拒绝、哪些文件被改、哪些测试跑过，都应该能从 session 里还原。

Pi 的 session JSONL tree、Claude Code 的本地 JSONL 会话、Codex 的任务/工作区状态，都是同一类问题的不同实现。

一句话：session 不是聊天记录，是可恢复的执行轨迹。

## Policy：它被允许做什么

一旦工具能产生副作用，就必须有 policy。读文件要不要限制路径？写文件前要不要确认？shell 能不能访问网络？能不能读 `.env`？能不能 `git push`？这些不能交给模型临场自由发挥，必须由 harness 或组织策略兜底。

一句话：policy 是模型和机器之间的刹车。

## Workspace Runtime：动作发生在哪里

工作区是副作用发生的地方。它可能是你的本机目录、git worktree、容器、云端 VM、CI runner，或者远程 SSH 环境。不同环境决定了安全边界、命令可用性、网络权限和性能。

一句话：agent 不在抽象世界里改代码，它在某个真实 runtime 里改工作区。

## Interface：人怎样参与循环

终端、IDE、网页、桌面 app，看似只是 UI，实际会影响 agent 能力。一个好的界面能展示 diff、工具输出、权限理由、测试结果、session 状态，让用户能中断、批准、回滚和继续。没有这些控制面板，agent 就会变成黑盒。

一句话：UI 是人参与 agent loop 的地方，不是皮肤。

:::warn|常见误区
不要把 “agent = LLM + prompt” 当成定义。那最多是一个聊天 bot。coding agent 至少还需要工具循环、状态、权限和执行环境。
:::

## 最小数据结构

教学版可以先用这些类型。

```ts
type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text?: string; toolCalls?: ToolCall[] }
  | { role: "tool"; toolCallId: string; result: ToolResult }

type ToolCall = {
  id: string
  name: string
  input: unknown
}

type ToolResult = {
  ok: boolean
  content: string
  metadata?: Record<string, unknown>
}

type HarnessState = {
  cwd: string
  messages: Message[]
  tools: Tool[]
  policy: PermissionPolicy
}
```

这个结构离产品级还很远，但已经能解释大部分行为：模型看 `messages`，选择 `tools`，工具在 `cwd` 里执行，`policy` 决定要不要拦。

## 读源码定位

- Pi: `packages/agent/src/types.ts` 定义 `AgentMessage`、`AgentTool`、`AgentState`
- Pi: `packages/coding-agent/src/core/sdk.ts` 把模型、auth、tools、session 组装起来
- Codex: `docs/config.md`、`docs/agents_md.md`、`docs/sandbox.md` 展示配置和边界
- Claude Code: settings / permissions / context window 文档展示 scope、context、policy 如何产品化

