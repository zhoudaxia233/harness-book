# §11 产品化界面：Claude Code / Codex / Pi 的可观察差异

到这里，我们已经有了共同骨架：context、tools、session、policy、workspace、UI。现在再看 Claude Code、Codex、Pi，就不会陷入“哪个更聪明”的泛泛讨论。更好的问题是：它们把复杂度放在哪里？

注意：Claude Code 和 Codex 有闭源产品部分，本章只基于官方文档、开源仓库和可观察行为讨论，不声称知道内部实现。

## 三种姿态

<table>
<thead><tr><th>维度</th><th>Pi</th><th>Claude Code</th><th>Codex</th></tr></thead>
<tbody>
<tr><td>产品姿态</td><td>minimal terminal coding harness</td><td>多表面产品化 agentic coding tool</td><td>OpenAI 生态里的 CLI / app / IDE / web / SDK coding agent</td></tr>
<tr><td>默认工具</td><td>默认四件套：read、write、edit、bash</td><td>文件、搜索、执行、web、代码智能、subagent 等产品工具</td><td>本地 CLI、app、IDE、web、SDK，强调 sandbox / approvals / AGENTS.md</td></tr>
<tr><td>扩展哲学</td><td>把功能留给 TypeScript extensions、skills、packages</td><td>MCP、hooks、skills、subagents、Agent SDK 等内置产品路径</td><td>AGENTS.md、config、permissions、hooks、skills、plugins、MCP、SDK</td></tr>
<tr><td>适合当什么</td><td>显微镜：看懂 harness 原语</td><td>成熟产品参照：看产品化体验</td><td>治理和自动化参照：看 OpenAI 生态里的本地/云端工作流</td></tr>
</tbody>
</table>

Pi 不是“功能少所以弱”，而是“默认假设少”。Claude Code / Codex 不是“复杂所以不纯粹”，而是把更多工作流、权限、跨界面体验打包进产品。

## 不要做排行榜

这类系统的差异通常不是线性的强弱，而是取舍。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 760 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Agent harness tradeoff triangle">
<style>.axis{stroke:#17130d;stroke-width:1.3}.pt{fill:#9f351e}.t{font:600 15px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}</style>
<polygon points="380,40 120,350 640,350" fill="#fffaf0" stroke="#17130d" stroke-width="1.3"/>
<text x="380" y="28" text-anchor="middle" class="t">Turnkey Product</text>
<text x="95" y="374" text-anchor="middle" class="t">Hackability</text>
<text x="665" y="374" text-anchor="middle" class="t">Governance</text>
<circle class="pt" cx="210" cy="300" r="7"/><text x="230" y="306" class="t">Pi</text><text x="230" y="325" class="s">小核心 / 可改</text>
<circle class="pt" cx="405" cy="120" r="7"/><text x="425" y="126" class="t">Claude Code</text><text x="425" y="145" class="s">产品表面 / 协作体验</text>
<circle class="pt" cx="520" cy="230" r="7"/><text x="540" y="236" class="t">Codex</text><text x="540" y="255" class="s">OpenAI 生态 / sandbox / workflow</text>
<text x="380" y="400" text-anchor="middle" class="s">位置是教学用取舍示意，不是评分。</text>
</svg>
</div>
<figcaption>FIG 11·1 三角图比排行榜更诚实。不同 harness 在可改性、即用产品、治理能力之间取舍。</figcaption>
</figure>

## Claude Code 的产品化信号

Claude Code 官方文档强调几件事：agentic loop、内置工具、context window、session resume/fork、checkpoint、permissions、MCP、skills、hooks、subagents，以及 terminal / IDE / desktop / web / Slack / CI/CD 等表面。

这说明它不只是一个 CLI while loop。它把用户协作、长期任务、跨设备、团队集成、权限治理都产品化了。

从 harness 角度看，Claude Code 的价值不只是“模型好”，还在于：

- 多表面的同一 agent loop。
- 上下文和 session 管理。
- 权限、checkpoint、plan mode 这类可控性。
- MCP / skills / hooks / subagents 的扩展体系。
- 面向用户的 diff、interrupt、resume、review 体验。

## Codex 的产品化信号

OpenAI 官方把 Codex 描述为一系列 coding tools，可在浏览器、CLI、IDE、web/mobile、CI/CD SDK 等界面里使用。Codex CLI 仓库开源，README 明确它是在本机运行的 coding agent；官方文档还覆盖 AGENTS.md、permissions、sandboxing、hooks、skills、plugins、subagents、MCP、SDK、app server 等。

从 harness 角度看，Codex 的重点是：

- 本地 CLI 和云端/app/IDE/workflow 的组合。
- AGENTS.md 与配置体系。
- sandbox / approvals / managed configuration。
- 开源 CLI 让你能读一部分实现。
- 与 OpenAI 模型和 Responses / tools 生态更紧。

## Pi 的产品化信号

Pi 自称 minimal terminal coding harness。它明确跳过 subagents、plan mode、permission popups、MCP、todos、background bash 这些内置功能，但允许通过 extensions、skills、prompt templates、themes、packages 加回来。

从 harness 学习角度看，这很有价值：它把“agent 运行壳”的骨架暴露得比较清楚。你能看到 agent loop、tools、session、compaction、provider registry、TUI、extensions 是怎么分层的。

Pi 的哲学可以概括成：

```text
核心只保留稳定原语。
工作流由用户和扩展组合。
终端、shell、README、CLI 本来就是开发者的工具生态。
```

:::warn|常见误区
不要写“Pi 更安全”或“商业产品更安全”。安全取决于默认权限、部署环境、sandbox、配置、用户习惯和组织策略，不是产品名本身。
:::

## 读源码定位

- Pi: README 的 Philosophy、`src/core/tools/`、`src/core/extensions/`、`src/core/agent-session.ts`
- Codex: `README.md`、`docs/agents_md.md`、`docs/config.md`、`docs/sandbox.md`
- Claude Code: overview、how it works、settings、permissions、MCP、skills、subagents 文档

