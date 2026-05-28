# §6 工具调用不是函数调用

很多入门教程把 tool call 写得像普通函数调用：

```ts
const result = await tools[name](args)
```

这行代码能解释“模型如何请求外部动作”，但解释不了产品级 harness。真实工具调用至少要经过：解析、schema 校验、权限判断、执行隔离、输出截断、错误结构化、session 记录、UI 渲染。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 920 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Tool execution pipeline">
<defs><marker id="a6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9f351e"/></marker></defs>
<style>.b{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.h{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.3}.t{font:600 14px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}.l{stroke:#9f351e;stroke-width:1.3;marker-end:url(#a6)}</style>
<g><rect class="h" x="20" y="85" width="110" height="70"/><text class="t" x="75" y="115" text-anchor="middle">Tool Call</text><text class="s" x="75" y="137" text-anchor="middle">模型提出</text></g>
<line class="l" x1="130" y1="120" x2="160" y2="120"/>
<g><rect class="b" x="160" y="85" width="110" height="70"/><text class="t" x="215" y="115" text-anchor="middle">Validate</text><text class="s" x="215" y="137" text-anchor="middle">schema</text></g>
<line class="l" x1="270" y1="120" x2="300" y2="120"/>
<g><rect class="b" x="300" y="85" width="110" height="70"/><text class="t" x="355" y="115" text-anchor="middle">Policy</text><text class="s" x="355" y="137" text-anchor="middle">allow / ask / deny</text></g>
<line class="l" x1="410" y1="120" x2="440" y2="120"/>
<g><rect class="h" x="440" y="85" width="110" height="70"/><text class="t" x="495" y="115" text-anchor="middle">Execute</text><text class="s" x="495" y="137" text-anchor="middle">runtime</text></g>
<line class="l" x1="550" y1="120" x2="580" y2="120"/>
<g><rect class="b" x="580" y="85" width="110" height="70"/><text class="t" x="635" y="115" text-anchor="middle">Normalize</text><text class="s" x="635" y="137" text-anchor="middle">截断 / 结构化</text></g>
<line class="l" x1="690" y1="120" x2="720" y2="120"/>
<g><rect class="h" x="720" y="85" width="170" height="70"/><text class="t" x="805" y="115" text-anchor="middle">Record + Return</text><text class="s" x="805" y="137" text-anchor="middle">写入 session / 回给模型</text></g>
</svg>
</div>
<figcaption>FIG 6·1 工具调用生命周期。真正复杂的是模型请求之后、工具结果之前的那一段。</figcaption>
</figure>

## 工具要有清楚的输入和输出

一个工具应该像一个小 API。

```ts
type Tool<TInput, TDetails = unknown> = {
  name: string
  description: string
  schema: JSONSchema
  risk: "read" | "write" | "execute" | "network"
  run(input: TInput, ctx: ToolContext): Promise<{
    ok: boolean
    content: string
    details?: TDetails
  }>
}
```

`description` 是写给模型看的，`schema` 是写给模型和校验器看的，`risk` 是写给 policy 看的，`details` 是写给 UI 和后续程序看的。

## 错误也要结构化

坏例子：

```text
failed
```

好一点：

```json
{
  "ok": false,
  "content": "File not found: src/auth/session.ts",
  "details": {
    "kind": "not_found",
    "path": "src/auth/session.ts"
  }
}
```

模型不是人类调试器。你给它一坨模糊字符串，它就会猜；你给它结构化错误，它更容易选择下一步：检查路径、搜索文件名、询问用户，或者停止。

## 工具返回给谁看

同一个工具结果有三类消费者：

- **模型**：需要精简、可继续推理的 observation。
- **用户**：需要可读 UI，比如 diff、命令摘要、风险提示。
- **系统**：需要完整 metadata，比如完整输出路径、耗时、exit code、截断信息。

这三类不要混成一个字符串。Pi 的工具定义里区分了 `content` 和 `details`，并提供 TUI render hooks。这个设计很有代表性：给模型看的和给界面看的不一定一样。

## 工具不是越多越好

工具越多，schema 越多，context 成本越高，模型选择错误工具的机会也越多。Claude Code 文档提到 MCP 工具定义可以 deferred / on demand 加载；Pi 干脆默认只给 `read`、`write`、`edit`、`bash` 四个核心工具。这些都是在保护 context。

更好的原则是：先给原语，再给高频、低歧义、收益明显的专用工具。

<table>
<thead><tr><th>工具</th><th>价值</th><th>风险</th><th>第一版建议</th></tr></thead>
<tbody>
<tr><td>read_file</td><td>理解代码</td><td>泄露敏感文件</td><td>保留，限制 workspace</td></tr>
<tr><td>search</td><td>定位相关文件</td><td>扫太多无关内容</td><td>保留，尊重 ignore</td></tr>
<tr><td>edit / patch</td><td>最小改动</td><td>补丁冲突</td><td>保留，必须可审计</td></tr>
<tr><td>shell</td><td>测试、构建、git</td><td>任意副作用</td><td>保留，但必须有 policy</td></tr>
<tr><td>browser</td><td>前端验证</td><td>环境复杂</td><td>后加</td></tr>
<tr><td>MCP</td><td>外部系统集成</td><td>信任边界变大</td><td>懂工具后再加</td></tr>
</tbody>
</table>

:::warn|常见误区
MCP 不会自动让工具安全。MCP 是协议；安全来自权限策略、沙箱、信任配置、输出处理和审计。
:::

## 练习

给 toy agent 增加一个 `list_files` 工具，但先不要做递归扫描。让它只列出当前目录下的文件，并记录输出行数。然后让模型在一个小项目里先 `list_files` 再 `read_file`，观察工具颗粒度如何改变模型行为。

## 读源码定位

- Pi: `packages/coding-agent/src/core/tools/index.ts`
- Pi: `packages/coding-agent/src/core/tools/tool-definition-wrapper.ts`
- Pi: `packages/agent/src/agent-loop.ts` 的 `prepareToolCall`、`executePreparedToolCall`
- Anthropic / OpenAI tool use 文档：模型如何发起工具请求

