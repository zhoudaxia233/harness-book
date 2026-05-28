# §0 写在前面：为什么不是“聊天机器人写代码”

你用 Claude Code、Codex 或 Pi 时，表面上是在和一个会写代码的模型聊天。可真正让它变成“编码代理”的，不只是模型，而是模型外面那层运行壳：它能读哪些文件、能调用哪些工具、命令在哪里跑、改文件前要不要确认、历史怎么保存、失败后如何恢复。

这层东西我在书里叫 **Agent Harness**。中文可以叫“代理运行壳”或“编码代理工作台”，但我会保留英文，因为它比“框架”“智能体系统”都更贴近本书要讲的东西：一个把模型接到真实工作区上的工程装置。

:::mental|本书的第一条心智模型
model 不是 agent。model + context + tool loop + state + permission boundary + UI，才是 coding agent。
:::

为什么值得专门写一本？因为很多教程会把重点放在“让模型输出 JSON action”上，好像有了 `Thought -> Action -> Observation` 就等于造出了 Claude Code。这个说法只对了一小半。toy ReAct demo 能教你循环形状，但教不了你真实工具的副作用、上下文预算、补丁冲突、shell 超时、权限确认、session replay、用户中断、测试失败和回滚。

如果你写过一个简易 Web 框架，你会知道 `http.createServer()` 不是难点。难点在路由、中间件、body parser、错误边界、session、部署约束。coding agent 也是一样：最小循环很短，门道全在 harness。

本书的目标不是评测“Claude Code、Codex、Pi 谁更强”。产品变化太快，闭源产品也不该被假装看穿。更稳的方式是先拆出共同骨架，再看不同 harness 把复杂度放在哪里：有的偏产品化体验，有的偏安全治理，有的偏极简可改，有的偏团队工作流。

读完之后，你应该能做三件事：

- 画出 coding agent 的核心数据流。
- 分辨一次失败到底是模型能力问题，还是 harness 设计问题。
- 知道如果自己做一个小 agent，先写哪些模块，哪些先别碰。

## 这本书怎么读

第一遍按章通读即可。遇到代码片段，不必马上照抄运行，先看它在 harness 里负责什么。第二遍挑一个最小实现，把 `agent loop`、`tool registry`、`shell tool`、`patch edit`、`permission gate` 串起来。第三遍选一个差异化方向：更稳的编辑、更好的权限、更强的上下文、更好的 UI，或者更可靠的 eval。

每章尽量保持四件事：

- **心智模型**：先说这个部件解决什么问题。
- **实现落点**：给出最小结构或伪代码。
- **产品对照**：用 Claude Code / Codex / Pi 的公开资料和可观察行为做参照。
- **常见误区**：把容易讲过头的地方压回准确边界。

:::warn|术语边界
不要说“模型执行了 bash”。模型只会提出 tool call；harness 校验、授权、执行命令，再把结果喂回模型。这个边界后面会反复出现。
:::

## 参考对象

这本书主要拿三类系统做参照。

- **Claude Code**：产品化程度高，覆盖 terminal、IDE、desktop、web、CI/CD、Slack 等表面；官方文档明确把它称为能读代码、改文件、运行命令并接入开发工具的 agentic coding tool。
- **OpenAI Codex / Codex CLI**：既有本地终端里的开源 CLI，也有 app、IDE、web、SDK 等产品表面；OpenAI 官方文档把它描述为可委派云端和本地 coding agents 的工具系列。
- **Pi**：官方定位是 minimal terminal coding harness。它默认只给模型 `read`、`write`、`edit`、`bash`，把 MCP、sub-agents、plan mode、permission popups 等留给 extensions 或用户工作流。

Pi 很适合当显微镜，因为它把 harness 拆得相对直白；Claude Code 和 Codex 适合当成熟产品参照物，因为它们展示了一个 toy loop 走向产品后会加回哪些工程层。

## 读源码定位

- Pi: `packages/agent/src/agent-loop.ts`、`packages/coding-agent/src/core/tools/`、`packages/coding-agent/src/core/agent-session.ts`
- Codex CLI: `openai/codex` 仓库的 `codex-rs/`、`docs/config.md`、`docs/agents_md.md`、`docs/sandbox.md`
- Claude Code: 官方 `How Claude Code works`、`permissions`、`context window`、`MCP`、`skills`、`subagents` 文档

