# §4 上下文从哪里来

模型每一轮都只能基于 context window 里的东西工作。它不知道你的磁盘上还有哪些文件，也不会自动看见刚才没塞进去的测试日志。Agent harness 的第一项核心工作，就是决定这一轮到底给模型看什么。

把 context 想成背包。你要带足够的东西进山，但背包容量有限。带太少，模型会瞎猜；带太多，关键事实被淹没，还会烧钱、变慢、触发压缩。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 820 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Context budget">
<style>.seg{stroke:#17130d;stroke-width:1.2}.t{font:600 14px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}</style>
<rect x="70" y="90" width="680" height="70" fill="#fffaf0" stroke="#17130d"/>
<rect class="seg" x="70" y="90" width="110" height="70" fill="#f0e6d2"/><text class="t" x="125" y="122" text-anchor="middle">System</text><text class="s" x="125" y="145" text-anchor="middle">规则</text>
<rect class="seg" x="180" y="90" width="115" height="70" fill="#ead9bb"/><text class="t" x="237" y="122" text-anchor="middle">Project</text><text class="s" x="237" y="145" text-anchor="middle">AGENTS / CLAUDE</text>
<rect class="seg" x="295" y="90" width="105" height="70" fill="#e2cfac"/><text class="t" x="347" y="122" text-anchor="middle">User</text><text class="s" x="347" y="145" text-anchor="middle">目标</text>
<rect class="seg" x="400" y="90" width="150" height="70" fill="#d8c396"/><text class="t" x="475" y="122" text-anchor="middle">Session</text><text class="s" x="475" y="145" text-anchor="middle">最近轨迹</text>
<rect class="seg" x="550" y="90" width="120" height="70" fill="#cdb789"/><text class="t" x="610" y="122" text-anchor="middle">Files</text><text class="s" x="610" y="145" text-anchor="middle">代码片段</text>
<rect class="seg" x="670" y="90" width="80" height="70" fill="#c2aa78"/><text class="t" x="710" y="122" text-anchor="middle">Tools</text><text class="s" x="710" y="145" text-anchor="middle">输出</text>
<text x="410" y="55" text-anchor="middle" class="t">Context window is a budget, not a warehouse</text>
<text x="410" y="210" text-anchor="middle" class="s">工具越多、日志越长、历史越久，真正留给源码和任务的空间越少。</text>
</svg>
</div>
<figcaption>FIG 4·1 上下文预算。把所有东西都塞进去不是工程能力，是缺少选择。</figcaption>
</figure>

## 指令层：谁说了算

指令通常有层级。以 Claude Code 为例，官方文档描述了 enterprise、project、user、local 等记忆/设置范围。Codex 有 `AGENTS.md` 和配置层。Pi 也会加载项目上下文、skills、prompt templates、settings。

层级的目的不是形式主义，而是冲突处理。企业安全策略应该压过项目偏好；用户这轮明确要求应该压过旧的习惯；子目录里的规则只在相关文件范围内生效。

## 仓库上下文：不是全量索引这么简单

coding agent 通常通过几种方式认识仓库：

- 文件树和 git 状态。
- `rg` / `grep` / `find` 搜索。
- 读取具体文件。
- 用户 `@file` 或粘贴片段。
- 语言服务、类型错误、jump to definition。
- 历史 session 的摘要。

不同 harness 的取舍不同。Pi 默认更偏终端原语：读、搜、shell。Claude Code 和 Codex 产品层会提供更多跨界面能力。无论表面如何，核心都是同一个问题：如何在有限 context 里放最相关的证据。

## 工具输出：最容易撑爆背包

测试日志、构建输出、`npm install`、`cargo test`、`pytest -vv` 都可能几十万行。直接塞给模型会让上下文瞬间报废。

产品级 shell tool 至少要处理：

- stdout / stderr 是否分开记录。
- exit code 是否结构化。
- 输出按字节或行截断。
- 完整日志是否写到临时文件。
- 截断时如何告诉模型“这不是完整输出”。

Pi 的 bash tool 就有输出累积和截断逻辑。这个细节看似朴素，却决定了长任务是否能继续推理。

## 压缩不是摘要，是状态迁移

当上下文快满时，harness 会做 compaction：把旧消息压成摘要，保留最近窗口。这里最危险的误解是把它当普通总结。

```ts
if (tokenCount(session.messages) > budget) {
  const summary = await summarize({
    oldMessages: session.messages.slice(0, -recentWindow),
    preserve: [
      "user goal",
      "files read",
      "files changed",
      "commands run",
      "tests passed or failed",
      "permission decisions",
      "open questions",
    ],
  })

  session.replaceOldMessagesWith(summary)
}
```

不能压掉的东西包括：用户明确目标、约束、已经修改过的文件、失败过的方案、权限决定、测试结果、尚未完成的问题。如果压错，模型后面会像接手一份错误交接文档的同事。

:::warn|常见误区
context compaction 不是“写一段摘要省 token”。它是在有限上下文里迁移任务状态。压错状态，比没有压缩更糟。
:::

## Context builder 的设计准则

一个靠谱的 context builder 应该有优先级。

<table>
<thead><tr><th>优先级</th><th>内容</th><th>处理方式</th></tr></thead>
<tbody>
<tr><td>必须保留</td><td>当前用户目标、硬约束、权限决定、修改事实、验证结果</td><td>原文或结构化事实</td></tr>
<tr><td>高价值</td><td>相关文件片段、错误堆栈、最近工具输出</td><td>保留关键片段，截断噪声</td></tr>
<tr><td>可摘要</td><td>早期探索、已关闭分支、重复日志</td><td>压缩成状态摘要</td></tr>
<tr><td>可丢弃</td><td>无关搜索结果、完整依赖输出、重复的成功日志</td><td>不进模型，保留在 trace</td></tr>
</tbody>
</table>

## 读源码定位

- Pi: `packages/coding-agent/src/core/compaction/` 展示 compaction 与 branch summary。
- Pi: `packages/coding-agent/src/core/system-prompt.ts` 展示系统提示和项目上下文如何拼接。
- Claude Code: context window 文档说明 conversation、file contents、command outputs、memory、skills 如何进入 context。
- Codex: AGENTS.md 和 config 文档说明项目指令、配置、权限如何进入运行时。

