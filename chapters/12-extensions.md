# §12 扩展层：MCP、hooks、skills、subagents

当读者已经理解 tools、context、session、policy 之后，再讲 MCP、hooks、skills、subagents 才不会乱。它们不是 agent 本体，而是 harness 的扩展层。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 820 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Extension layers">
<style>.r{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.a{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.3}.t{font:600 15px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}</style>
<rect class="a" x="260" y="40" width="300" height="58"/><text class="t" x="410" y="74" text-anchor="middle">Core Harness</text>
<rect class="r" x="110" y="135" width="130" height="70"/><text class="t" x="175" y="166" text-anchor="middle">Built-in Tools</text><text class="s" x="175" y="188" text-anchor="middle">read / edit / shell</text>
<rect class="r" x="260" y="135" width="130" height="70"/><text class="t" x="325" y="166" text-anchor="middle">MCP</text><text class="s" x="325" y="188" text-anchor="middle">外部工具协议</text>
<rect class="r" x="410" y="135" width="130" height="70"/><text class="t" x="475" y="166" text-anchor="middle">Hooks</text><text class="s" x="475" y="188" text-anchor="middle">生命周期拦截</text>
<rect class="r" x="560" y="135" width="130" height="70"/><text class="t" x="625" y="166" text-anchor="middle">Skills</text><text class="s" x="625" y="188" text-anchor="middle">知识和流程包</text>
<rect class="r" x="335" y="250" width="150" height="70"/><text class="t" x="410" y="281" text-anchor="middle">Subagents</text><text class="s" x="410" y="303" text-anchor="middle">独立上下文的代理调用</text>
<path d="M410 98 L175 135 M410 98 L325 135 M410 98 L475 135 M410 98 L625 135 M410 205 L410 250" stroke="#9f351e" fill="none"/>
</svg>
</div>
<figcaption>FIG 12·1 扩展层级。MCP、hooks、skills、subagents 是 core harness 之上的不同扩展方式。</figcaption>
</figure>

## MCP：工具和上下文的协议边界

MCP 的价值是把外部系统以标准方式暴露给 agent：文件、数据库、Issue tracker、文档、设计工具、内部 API。它解决“怎么发现和调用外部能力”的问题。

它不解决所有问题。MCP server 是否可信、工具是否危险、输出是否会 prompt inject、权限如何配置，仍然是 harness 和组织策略的责任。

更准确的说法：

```text
MCP is a transport and discovery boundary, not a safety boundary.
```

## Hooks：确定性的生命周期逻辑

hooks 是在 agent 生命周期某些点插入确定性逻辑：工具调用前、工具调用后、session start/end、compact 前后、commit 前后。

适合 hooks 的事情：

- 编辑后自动格式化。
- shell 前阻断危险命令。
- tool result 后做审计日志。
- session end 自动生成 summary。
- commit 前跑 lint。

不适合 hooks 的事情：让 hook 也变成一个大语言模型再随便改状态。那会把确定性边界搞糊。

## Skills：把经验打包进上下文

skills 是可发现的能力包：一段说明、一些脚本、模板、资源。它们的价值不是“多了一个工具”，而是把团队经验变成可复用流程。

Claude Code 和 Codex 都有 skills 概念；Pi 也支持遵循 Agent Skills 标准的 skill。关键是 progressive disclosure：模型先看到 skill 描述，只有相关时才加载全文。否则 skills 也会吃光 context。

## Subagents：独立上下文，不是免费大脑

subagent 最容易被神化。更准确地说，它是一次独立配置的 agent 调用：有自己的上下文、工具权限、任务目标，完成后把摘要返回主 agent。

好处：

- 长任务隔离上下文。
- 并行探索不同方向。
- 分离 reviewer / implementer / researcher。

代价：

- token 和时间成本。
- 协调复杂度。
- 子任务边界不清时会重复劳动。
- 返回摘要可能丢细节。

:::warn|常见误区
subagent 不是“多了一个大脑所以必然更强”。它主要换来隔离和并行，也带来协调损耗。
:::

## 扩展选择表

<table>
<thead><tr><th>你要解决的问题</th><th>优先考虑</th><th>原因</th></tr></thead>
<tbody>
<tr><td>接 Jira / Slack / 内部 DB</td><td>MCP 或自定义工具</td><td>外部系统能力暴露</td></tr>
<tr><td>每次编辑后跑 formatter</td><td>hook</td><td>确定性生命周期动作</td></tr>
<tr><td>团队固定 review 流程</td><td>skill / command</td><td>打包知识和步骤</td></tr>
<tr><td>长任务拆成独立调查</td><td>subagent</td><td>隔离上下文、并行</td></tr>
<tr><td>只是跑一个 CLI</td><td>shell + README</td><td>不要过早上协议</td></tr>
</tbody>
</table>

## 读源码定位

- Pi: `src/core/extensions/`、`docs/extensions.md`、`examples/extensions/`
- Pi: `docs/skills.md`
- Claude Code: MCP、hooks、skills、subagents 文档
- Codex: skills、plugins、hooks、MCP、subagents、AGENTS.md 文档

