# §13 做出差异化

到这一步，你已经知道最小 coding agent 怎么跑，也知道产品级 harness 会补哪些层。最后的问题是：如果自己做一个，差异化在哪里？

最常见的错误答案是：“支持更多工具。”工具多不等于强。强是指在某类任务上失败更少：少误改文件、少跑错命令、少丢上下文、少需要用户反复纠正、能更稳定验证结果。

:::mental|本书的最后一条心智模型
差异化不是支持更多工具，而是在固定任务集上更少失败。
:::

## 五条路线

### 路线 A：小而稳

只做 Python / TypeScript bugfix agent。不要追求全语言、全框架。把搜索、patch、测试、错误恢复做到稳定。

适合练习：

- 自动定位失败测试。
- 只修改最少文件。
- 每次修改后跑最小相关测试。
- 无法验证时清楚汇报。

### 路线 B：交互更好

很多 agent 失败不是因为模型不会，而是 UI 让用户无法有效参与。你可以做更好的 plan/review/confirm 界面。

差异化点：

- 计划和执行状态分开。
- diff review 清楚展示风险。
- 权限弹窗显示 cwd、命令、风险原因。
- 用户能中断、改方向、回到某个 trace 节点。

### 路线 C：安全更强

面向企业或敏感 repo，安全策略就是产品核心。

差异化点：

- 路径 profile：哪些目录可读、可写、禁止。
- 命令分类器：allow / ask / deny。
- 网络默认关闭。
- secrets 检测。
- 每个 permission decision 可审计。

### 路线 D：上下文更强

如果你的 agent 老是读错文件、忘记约束、重复探索，就该做 context。

差异化点：

- repo index。
- symbol search。
- 文件摘要缓存。
- 最近改动优先。
- trace-aware compaction。
- 对 monorepo package 边界敏感。

### 路线 E：评测更强

最容易被忽略、但最能拉开差距的是 eval。

准备 20 个真实小任务，每次改 harness 都跑：

- 修一个 failing test。
- 补一个边界条件。
- 改一个 API 调用。
- 更新一个类型。
- 改一个前端样式并截图验证。

记录指标：

- 是否改对。
- 改了多少无关文件。
- 跑了哪些命令。
- 是否验证。
- 是否违反权限。
- 是否需要人工纠正。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 820 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Agent improvement loop">
<defs><marker id="a13" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9f351e"/></marker></defs>
<style>.b{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.h{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.3}.t{font:600 14px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}.l{stroke:#9f351e;stroke-width:1.4;marker-end:url(#a13);fill:none}</style>
<rect class="h" x="90" y="80" width="130" height="70"/><text class="t" x="155" y="111" text-anchor="middle">Eval Tasks</text><text class="s" x="155" y="133" text-anchor="middle">固定任务集</text>
<path class="l" d="M220 115 L295 115"/>
<rect class="b" x="295" y="80" width="130" height="70"/><text class="t" x="360" y="111" text-anchor="middle">Run Agent</text><text class="s" x="360" y="133" text-anchor="middle">产生 trace</text>
<path class="l" d="M425 115 L500 115"/>
<rect class="h" x="500" y="80" width="130" height="70"/><text class="t" x="565" y="111" text-anchor="middle">Score</text><text class="s" x="565" y="133" text-anchor="middle">误改 / 验证 / 成功</text>
<path class="l" d="M565 150 C565 240 170 240 155 154"/>
<text x="360" y="235" text-anchor="middle" class="s">根据失败 trace 改工具、上下文、权限、UI，再跑同一批任务。</text>
</svg>
</div>
<figcaption>FIG 13·1 Agent improvement loop。没有固定任务集，你很难知道 harness 是否真的变强。</figcaption>
</figure>

## 不要一上来做什么

- 不要一上来做长期记忆。先把当前 session 做可靠。
- 不要一上来做多 agent。先让单 agent 的 trace 可解释。
- 不要一上来接十个 MCP。先把 shell、文件、patch、权限做好。
- 不要用 prompt 花样掩盖工具设计问题。
- 不要把“能跑一个 demo”当成“能处理真实 repo”。

## 你可以从哪里开始

一个务实路线：

1. 用本书第 3 章 toy loop 跑起来。
2. 加 session JSONL。
3. 把 `write_file` 换成 `edit_file`。
4. 给 shell 加 timeout / truncation / cwd。
5. 加 permission policy。
6. 准备 10 个小 eval。
7. 每次只优化一个失败类型。

这条路不炫，但最接近真实工程。

## 读源码定位

- Pi: examples/extensions 里有 permission、git checkpoint、custom compaction、structured output 等差异化例子
- Codex: cookbooks / evals / agent improvement loop 文档
- Claude Code: Agent SDK、subagents、hooks、skills 文档

