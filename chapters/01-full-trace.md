# §1 一次改代码任务的全链路

先别急着讲 MCP、subagent、RAG 或 eval。我们从一条普通请求开始：

```text
帮我修一下登录接口偶尔返回 500 的问题，跑测试确认。
```

如果这是普通聊天模型，它最多给你排查建议。如果是 coding agent，它会把这句话变成一串动作：看项目结构、找登录代码、跑测试或复现命令、读错误日志、改文件、再跑测试，最后告诉你改了什么。

这条链路可以拆成七段。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 920 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Agent loop">
<defs><marker id="a1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9f351e"/></marker></defs>
<style>.b{fill:#fffaf0;stroke:#17130d;stroke-width:1.4}.h{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.4}.t{font:600 15px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}.l{stroke:#9f351e;stroke-width:1.5;marker-end:url(#a1)}</style>
<g><rect class="h" x="20" y="78" width="105" height="86"/><text class="t" x="72" y="112" text-anchor="middle">User</text><text class="s" x="72" y="136" text-anchor="middle">任务</text></g>
<line class="l" x1="125" y1="121" x2="160" y2="121"/>
<g><rect class="b" x="160" y="78" width="120" height="86"/><text class="t" x="220" y="108" text-anchor="middle">Context</text><text class="s" x="220" y="133" text-anchor="middle">指令 / 文件 / 历史</text></g>
<line class="l" x1="280" y1="121" x2="315" y2="121"/>
<g><rect class="h" x="315" y="78" width="105" height="86"/><text class="t" x="367" y="112" text-anchor="middle">Model</text><text class="s" x="367" y="136" text-anchor="middle">下一步</text></g>
<line class="l" x1="420" y1="121" x2="455" y2="121"/>
<g><rect class="b" x="455" y="78" width="130" height="86"/><text class="t" x="520" y="108" text-anchor="middle">Tool Runtime</text><text class="s" x="520" y="133" text-anchor="middle">校验 / 权限 / 执行</text></g>
<line class="l" x1="585" y1="121" x2="620" y2="121"/>
<g><rect class="b" x="620" y="78" width="120" height="86"/><text class="t" x="680" y="108" text-anchor="middle">Workspace</text><text class="s" x="680" y="133" text-anchor="middle">文件 / shell / git</text></g>
<line class="l" x1="740" y1="121" x2="775" y2="121"/>
<g><rect class="h" x="775" y="78" width="120" height="86"/><text class="t" x="835" y="108" text-anchor="middle">Observation</text><text class="s" x="835" y="133" text-anchor="middle">输出 / diff / 测试</text></g>
<path d="M835 178 C835 230 370 230 370 178" fill="none" stroke="#9f351e" stroke-width="1.5" marker-end="url(#a1)"/>
<text x="604" y="222" class="s" text-anchor="middle">结果写回 session，再进入下一轮</text>
</svg>
</div>
<figcaption>FIG 1·1 一次 coding agent 任务的主循环。模型只在中间决定下一步；真实副作用都在 harness 的工具运行时里发生。</figcaption>
</figure>

## 1. 接收任务：不是只存一句 prompt

用户输入会变成一条 `UserMessage`。但 harness 通常还会同时记录当前工作目录、git 状态、选中的模型、权限模式、会话 ID、环境变量策略、已有 session 历史。产品界面上你只看到一行字，运行时里已经多了一堆上下文。

## 2. 装配上下文：模型不是天然看见整个仓库

这是最容易误解的地方。官方文档常说这类工具“understands your codebase”，但工程上更准确的说法是：harness 通过搜索、读取文件、项目指令、历史摘要和工具结果，逐步把相关材料塞进模型上下文。

如果 agent 要修登录接口，它可能先用 `rg "login"` 找文件，再读 `src/auth/*`，再看测试。它不是一次性吞下整个 repo。

:::warn|常见误区
不要说“agent 读懂了整个仓库”。更准确：它通过工具调用构造了当前任务需要的仓库切片。
:::

## 3. 模型决策：下一步是 action，不是最终答案

模型收到上下文后，可能返回自然语言，也可能返回一个或多个 tool call。比如：

```json
{
  "tool": "shell",
  "input": {
    "command": "npm test -- login",
    "timeoutMs": 30000
  }
}
```

这个 JSON 本身没有副作用。真正的副作用要等 harness 接管。

## 4. 工具运行时：把“想做”变成“允许做”

tool runtime 要做几件事：找到工具、校验参数、判断权限、准备 cwd 和环境变量、执行、截断输出、结构化错误，然后把结果写回 session。产品级 harness 的分水岭就在这里。

toy demo 往往是：

```ts
const result = await tools[call.name](call.input)
```

真实版本至少更接近：

```ts
const tool = registry.get(call.name)
const input = validate(tool.schema, call.input)
const decision = await policy.check({ tool, input, workspace })
if (!decision.allowed) return deniedResult(decision.reason)
const result = await tool.run(input, { cwd, env, signal, outputLimit })
session.appendToolResult(call.id, result)
```

## 5. 工作区变化：最终产物是状态，不只是回答

coding agent 的输出不是“我建议你把第 12 行改成这样”。它真正的产物是工作区状态变化：某些文件被 patch，某些命令跑过，某些测试通过或失败，git diff 发生了变化。

这就是为什么 diff review、checkpoint、git status、测试输出很重要。没有这些东西，final answer 再自信也不算证据。

## 6. 验证：让工具回路闭合

好的 agent 不应该改完就汇报“应该好了”。它要跑对应测试、lint、类型检查，或至少说明为什么无法验证。Claude Code 官方文档里也反复强调：给 agent 可验证目标，它表现会明显更好。

验证失败时，任务不结束。失败输出会作为 observation 回到模型，触发下一轮排查。

## 7. 汇报：把 trace 压成用户能判断的结论

最后的回答应该回答四件事：

- 改了哪些文件。
- 为什么这么改。
- 跑了哪些验证。
- 还有哪些风险或未验证项。

如果这四件事说不清，就说明 session trace 没有被 harness 组织好，或者模型没有被要求基于证据汇报。

## 本章小结

一次 coding agent 任务不是“一问一答”，而是一条带副作用的事件流。模型决定下一步，harness 负责让下一步可控、可审计、可恢复。

## 读源码定位

- Pi: `packages/agent/src/agent-loop.ts` 里的 `runLoop`、`executeToolCalls`
- Pi: `packages/coding-agent/src/core/agent-session.ts` 的 session 事件与持久化
- Claude Code: `How Claude Code works` 中的 agentic loop、tools、sessions、permissions
- Codex: `openai/codex` README、developer docs 的 CLI / security / AGENTS.md 页面

