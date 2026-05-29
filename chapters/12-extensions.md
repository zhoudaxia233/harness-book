# §12 扩展层：MCP、hooks、skills、subagents、workflows

当读者已经理解 tools、context、session、policy 之后，再讲 MCP、hooks、skills、subagents、workflows 才不会乱。它们不是 agent 本体，而是 harness 的扩展层。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 820 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Extension layers">
<style>.r{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.a{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.3}.t{font:600 15px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}</style>
<rect class="a" x="260" y="40" width="300" height="58"/><text class="t" x="410" y="74" text-anchor="middle">Core Harness</text>
<rect class="r" x="110" y="135" width="130" height="70"/><text class="t" x="175" y="166" text-anchor="middle">Built-in Tools</text><text class="s" x="175" y="188" text-anchor="middle">read / edit / shell</text>
<rect class="r" x="260" y="135" width="130" height="70"/><text class="t" x="325" y="166" text-anchor="middle">MCP</text><text class="s" x="325" y="188" text-anchor="middle">外部工具协议</text>
<rect class="r" x="410" y="135" width="130" height="70"/><text class="t" x="475" y="166" text-anchor="middle">Hooks</text><text class="s" x="475" y="188" text-anchor="middle">生命周期拦截</text>
<rect class="r" x="560" y="135" width="130" height="70"/><text class="t" x="625" y="166" text-anchor="middle">Skills</text><text class="s" x="625" y="188" text-anchor="middle">知识和流程包</text>
<rect class="r" x="250" y="250" width="145" height="70"/><text class="t" x="322" y="281" text-anchor="middle">Subagents</text><text class="s" x="322" y="303" text-anchor="middle">独立上下文的代理调用</text>
<rect class="r" x="430" y="250" width="145" height="70"/><text class="t" x="502" y="281" text-anchor="middle">Workflows</text><text class="s" x="502" y="303" text-anchor="middle">代码化的多代理编排</text>
<path d="M410 98 L175 135 M410 98 L325 135 M410 98 L475 135 M410 98 L625 135 M410 205 L322 250 M410 205 L502 250" stroke="#9f351e" fill="none"/>
</svg>
</div>
<figcaption>FIG 12·1 扩展层级。MCP、hooks、skills、subagents、workflows 是 core harness 之上的不同扩展方式。</figcaption>
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

## Dynamic workflows：把协调从上下文挪到代码

dynamic workflow 容易被误解成“更高级的 subagent”。更准确地说：

```text
subagent 是执行单元；workflow 是控制流。
```

普通 subagent 模式像主 agent 管一个小团队。它在自己的上下文里写计划、派人、接收结果、决定下一步。任务一大，主 agent 要记住哪些子任务已经跑过、哪些结果要复核、哪些分支失败、最后如何合并。计划虽然写在对话里，但仍然依赖模型每一轮都真的照做。

dynamic workflow 把这件事换成另一种形态：主 agent 先写一段可执行脚本，然后把协调权交给 workflow runtime。代码负责循环、并行、等待、阶段切换和结果收集；subagent 仍然负责模糊判断、读代码、跑工具、产出结论。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 860 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Subagents versus workflows">
<style>.box{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.hot{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.3}.t{font:600 14px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}.a{stroke:#9f351e;stroke-width:1.4;fill:none;marker-end:url(#m)}</style>
<defs><marker id="m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9f351e"/></marker></defs>
<rect class="hot" x="55" y="45" width="220" height="70"/><text class="t" x="165" y="75" text-anchor="middle">普通 subagents</text><text class="s" x="165" y="96" text-anchor="middle">计划留在主 agent 上下文</text>
<rect class="box" x="55" y="160" width="95" height="55"/><text class="s" x="102" y="193" text-anchor="middle">agent A</text>
<rect class="box" x="165" y="160" width="95" height="55"/><text class="s" x="212" y="193" text-anchor="middle">agent B</text>
<rect class="box" x="275" y="160" width="95" height="55"/><text class="s" x="322" y="193" text-anchor="middle">agent C</text>
<path class="a" d="M165 115 L102 160 M165 115 L212 160 M165 115 L322 160"/>
<text class="s" x="215" y="255" text-anchor="middle">主 agent 每轮决定下一步，结果不断回到上下文</text>
<rect class="hot" x="500" y="45" width="240" height="70"/><text class="t" x="620" y="75" text-anchor="middle">dynamic workflow</text><text class="s" x="620" y="96" text-anchor="middle">计划变成脚本控制流</text>
<rect class="box" x="512" y="142" width="215" height="55"/><text class="s" x="620" y="175" text-anchor="middle">workflow runtime</text>
<rect class="box" x="455" y="240" width="95" height="55"/><text class="s" x="502" y="273" text-anchor="middle">agent A</text>
<rect class="box" x="575" y="240" width="95" height="55"/><text class="s" x="622" y="273" text-anchor="middle">agent B</text>
<rect class="box" x="695" y="240" width="95" height="55"/><text class="s" x="742" y="273" text-anchor="middle">agent C</text>
<path class="a" d="M620 115 L620 142 M620 197 L502 240 M620 197 L622 240 M620 197 L742 240"/>
</svg>
</div>
<figcaption>FIG 12·2 subagent 是工人；workflow 是用代码写出来的调度器。它调用 subagents，但它自己解决的是控制流问题。</figcaption>
</figure>

抽象成代码，普通 subagent 协调大概是这样：

```ts
while (!done) {
  const next = await model(parentContext);
  const result = await spawnSubagent(next.prompt);
  parentContext.push(result);
}
```

这里的控制流在 `model(parentContext)`。主 agent 每一轮都要从上下文里恢复计划、检查进度、决定下一步。

dynamic workflow 则更像这样：

```ts
const script = await model(parentContext);
const result = await workflowRuntime.execute(script);
parentContext.push(compact(result));
```

workflow runtime 的核心也不神秘：

```ts
async function execute(script) {
  const api = {
    agent: (prompt) => runFreshSubagentSession(prompt),
    parallel: (tasks) => Promise.all(tasks.map((task) => task())),
    phase: (name) => progress.currentPhase = name,
  };

  return runJavaScriptInSandbox(script, api);
}
```

模型负责生成调度程序；程序负责可靠地执行调度；subagents 负责每个子任务里的判断。

:::mental|心智模型
dynamic workflow 的本质，是把“主 agent 在上下文里协调团队”，改成“主 agent 生成一段协调团队的程序”。程序负责可控性，agent 负责模糊判断。
:::

这并不会消灭所有不确定性。workflow 只能降低协调层的不确定性：循环、并发、等待、汇总更可靠了。但主 agent 可能写出糟糕脚本，subagent 也仍然可能看错代码、误判结果、遗漏证据。

以 `pi-dynamic-workflows` 为例，它给 Pi 注册了一个 `workflow` tool。主模型把 JavaScript 脚本传给这个工具；工具用 AST 做元数据校验，再在 Node `vm` sandbox 里执行脚本。脚本能调用 `agent()`、`parallel()`、`pipeline()`、`phase()`、`log()`，但不能直接 `import`、`require`、读 `fs` 或访问网络。每次 `agent()` 会创建一个新的 in-memory Pi subagent session，并给它标准 coding tools。

所以这个 prototype 里：

```text
workflow runtime = workflow tool 里的脚本执行器 + 进度状态 + subagent runner
```

它不是操作系统 daemon。它只是一次 tool call 内部的运行时。成熟产品可以把同一个概念做成后台任务、可暂停运行、可保存 workflow、可在 UI 里看进度，但核心逻辑仍然是“代码化编排 subagents”。

## 扩展选择表

<table>
<thead><tr><th>你要解决的问题</th><th>优先考虑</th><th>原因</th></tr></thead>
<tbody>
<tr><td>接 Jira / Slack / 内部 DB</td><td>MCP 或自定义工具</td><td>外部系统能力暴露</td></tr>
<tr><td>每次编辑后跑 formatter</td><td>hook</td><td>确定性生命周期动作</td></tr>
<tr><td>团队固定 review 流程</td><td>skill / command</td><td>打包知识和步骤</td></tr>
<tr><td>长任务拆成独立调查</td><td>subagent</td><td>隔离上下文、并行</td></tr>
<tr><td>大任务需要分阶段、并行、复核、汇总</td><td>dynamic workflow</td><td>把协调层从上下文挪到代码控制流</td></tr>
<tr><td>只是跑一个 CLI</td><td>shell + README</td><td>不要过早上协议</td></tr>
</tbody>
</table>

## 读源码定位

- Pi: `src/core/extensions/`、`docs/extensions.md`、`examples/extensions/`
- Pi: `docs/skills.md`
- Pi dynamic workflows: `src/workflow.ts`、`src/workflow-tool.ts`、`src/agent.ts`
- Claude Code: MCP、hooks、skills、subagents 文档
- Codex: skills、plugins、hooks、MCP、subagents、AGENTS.md 文档
