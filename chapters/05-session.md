# §5 Session：代理真正“记住”的东西

模型本身不会记住你上一个终端会话。它每一轮看到什么，取决于 harness 把哪些历史重新送进上下文。所谓 agent 的“记忆”，在工程上通常分成三类：当前 session 的事件日志、被压缩后的任务状态、跨 session 的持久规则或偏好。

本章只讲第一类：session。

## Session 是事件流

一个 session 不应该只是聊天数组。它更像事件日志。

```ts
type SessionEvent =
  | { type: "user_message"; text: string; at: number }
  | { type: "assistant_message"; content: AssistantContent[]; at: number }
  | { type: "tool_call"; id: string; name: string; input: unknown; at: number }
  | { type: "tool_result"; id: string; ok: boolean; output: string; at: number }
  | { type: "permission_decision"; toolCallId: string; allowed: boolean; reason: string; at: number }
  | { type: "file_patch"; path: string; diff: string; at: number }
  | { type: "verification"; command: string; exitCode: number; at: number }
```

用事件流的好处是明显的：你可以回放、导出、调试、分支、压缩、审计。UI 也能从事件里渲染出时间线、工具卡片、diff、测试结果。

## Trace 示例

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 760 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Trace timeline">
<style>.line{stroke:#9f351e;stroke-width:2}.dot{fill:#9f351e}.card{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.t{font:600 14px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}.m{font:11px monospace;fill:#9f351e}</style>
<line class="line" x1="80" y1="50" x2="80" y2="370"/>
<g><circle class="dot" cx="80" cy="70" r="6"/><rect class="card" x="120" y="45" width="540" height="52"/><text class="m" x="140" y="67">01 user_message</text><text class="s" x="140" y="86">“修登录接口 500，跑测试确认”</text></g>
<g><circle class="dot" cx="80" cy="135" r="6"/><rect class="card" x="120" y="110" width="540" height="52"/><text class="m" x="140" y="132">02 tool_call: shell</text><text class="s" x="140" y="151">npm test -- login</text></g>
<g><circle class="dot" cx="80" cy="200" r="6"/><rect class="card" x="120" y="175" width="540" height="52"/><text class="m" x="140" y="197">03 tool_result</text><text class="s" x="140" y="216">exit 1, TypeError in auth/session.ts</text></g>
<g><circle class="dot" cx="80" cy="265" r="6"/><rect class="card" x="120" y="240" width="540" height="52"/><text class="m" x="140" y="262">04 file_patch</text><text class="s" x="140" y="281">src/auth/session.ts changed, null guard added</text></g>
<g><circle class="dot" cx="80" cy="330" r="6"/><rect class="card" x="120" y="305" width="540" height="52"/><text class="m" x="140" y="327">05 verification</text><text class="s" x="140" y="346">npm test -- login, exit 0</text></g>
</svg>
</div>
<figcaption>FIG 5·1 一条 session trace。final answer 只是这条轨迹的压缩汇报。</figcaption>
</figure>

## Branch 与 resume

真实工作不是线性的。你可能在一个方案上走错路，需要回到早一点的位置；也可能想从当前状态开一个新分支尝试重构。Pi 的 session 文件采用 JSONL + tree 结构，支持 `/tree`、fork、clone、branch summary。Claude Code 官方文档也说明了 resume、fork、branch 这类 session 操作。

session tree 的意义不是酷炫，而是把 agent 的试错变成可管理对象。没有分支，你只能线性撤回；有了分支，你可以保存失败路径、总结它为什么失败，再把经验带回主线。

## 什么该进入模型，什么只留在日志

session log 可以很全，但不代表每条事件都要进模型上下文。

<table>
<thead><tr><th>事件</th><th>进入模型？</th><th>理由</th></tr></thead>
<tbody>
<tr><td>用户目标和约束</td><td>必须</td><td>这是任务定义</td></tr>
<tr><td>最近工具结果</td><td>通常</td><td>影响下一步决策</td></tr>
<tr><td>完整长日志</td><td>不一定</td><td>可留 trace，摘要进 context</td></tr>
<tr><td>权限拒绝</td><td>必须</td><td>防止模型反复请求被禁止动作</td></tr>
<tr><td>旧的无关探索</td><td>摘要或丢弃</td><td>减少干扰</td></tr>
<tr><td>UI 展开/折叠状态</td><td>不进</td><td>这是界面状态，不是任务状态</td></tr>
</tbody>
</table>

## Session 也是审计边界

如果 agent 跑过 `curl | sh`、读过 `.env`、推过远端分支，你必须能查到是谁允许的、什么时候发生的、命令输出是什么。很多安全问题不是“能不能阻止”，而是“事后能不能说清楚”。

这也是为什么权限决策要成为 session 事件，而不是 UI 上一闪而过的弹窗。

:::mental|本章心智模型
agent 的记忆不是脑子，是可回放状态。模型每轮只看到 context；harness 才保存完整 trace。
:::

## 练习

给 toy agent 加一个 `session.jsonl`。每轮至少写入 user、assistant、tool_result 三种事件。然后故意让 shell 命令失败，观察你能不能只凭 session 文件还原模型为什么走到下一步。

## 读源码定位

- Pi: `packages/coding-agent/docs/session-format.md`
- Pi: `packages/coding-agent/src/core/session-manager.ts`
- Claude Code: How Claude Code works 里的 JSONL session、checkpoint、resume/fork 描述
- Codex: app / CLI / SDK 文档中的 task、worktree、session、non-interactive mode

