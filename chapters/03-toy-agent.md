# §3 先做一个能跑的 toy agent

理解 harness 最快的方法不是先读一千页文档，而是写一个很小的版本。这个版本不安全、不聪明、不适合真实项目，但它能让你看见骨架。

第一版只做五件事：

- 接收用户任务。
- 把历史消息和工具 schema 送给模型。
- 允许模型调用 `read_file`、`write_file`、`run_shell`。
- 把工具结果写回消息列表。
- 循环直到模型给出最终回答。

明确不做：权限系统、上下文压缩、并发工具、长期记忆、复杂补丁、MCP、subagent、浏览器、IDE。

:::mental|第一版的价值
toy agent 的目标不是安全完成工作，而是让你亲眼看见：模型通过 tool call 间接改变世界。
:::

## 主循环

核心循环长这样：

```ts
while (true) {
  const response = await model.generate({
    system,
    messages: session.toModelMessages(),
    tools: registry.definitions(),
  })

  session.addAssistant(response)

  if (!response.toolCalls?.length) {
    return response.text
  }

  for (const call of response.toolCalls) {
    const result = await registry.execute(call)
    session.addToolResult(call.id, call.name, result)
  }
}
```

看起来简单，但这就是许多 agent harness 的胚胎。后面所有章节，本质上都在回答：这段循环哪里不够可靠，应该如何补。

## Tool registry

工具不要散落在 `if/else` 里。即使 toy 版，也应该有 registry。

```ts
type Tool = {
  name: string
  description: string
  schema: JSONSchema
  run(input: unknown, ctx: ToolContext): Promise<ToolResult>
}

class ToolRegistry {
  constructor(private tools: Map<string, Tool>, private ctx: ToolContext) {}

  definitions() {
    return [...this.tools.values()].map(({ name, description, schema }) => ({
      name,
      description,
      input_schema: schema,
    }))
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(call.name)
    if (!tool) return { ok: false, content: `unknown tool: ${call.name}` }

    const input = validate(tool.schema, call.input)
    return await tool.run(input, this.ctx)
  }
}
```

关键点不是 class 写得漂亮，而是把三件事固定下来：工具有名字、工具有 schema、工具失败也要结构化返回。

## 三个最小工具

`read_file`：

```ts
const readFileTool: Tool = {
  name: "read_file",
  description: "Read a UTF-8 file from the workspace.",
  schema: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"],
  },
  async run(input, ctx) {
    const path = resolveInsideWorkspace(ctx.cwd, input.path)
    const content = await fs.readFile(path, "utf8")
    return { ok: true, content }
  },
}
```

`write_file`：

```ts
const writeFileTool: Tool = {
  name: "write_file",
  description: "Create or overwrite a file in the workspace.",
  schema: {
    type: "object",
    properties: {
      path: { type: "string" },
      content: { type: "string" },
    },
    required: ["path", "content"],
  },
  async run(input, ctx) {
    const path = resolveInsideWorkspace(ctx.cwd, input.path)
    await fs.writeFile(path, input.content, "utf8")
    return { ok: true, content: `wrote ${input.path}` }
  },
}
```

`run_shell`：

```ts
const shellTool: Tool = {
  name: "run_shell",
  description: "Run a shell command in the workspace.",
  schema: {
    type: "object",
    properties: {
      command: { type: "string" },
      timeoutMs: { type: "number" },
    },
    required: ["command"],
  },
  async run(input, ctx) {
    const result = await runCommand({
      command: input.command,
      cwd: ctx.cwd,
      timeoutMs: input.timeoutMs ?? 30_000,
      maxOutputBytes: 60_000,
    })
    return {
      ok: result.exitCode === 0,
      content: [
        `exit_code: ${result.exitCode}`,
        `stdout:\n${result.stdout}`,
        `stderr:\n${result.stderr}`,
      ].join("\n\n"),
    }
  },
}
```

这个版本已经能完成一些小任务。但它危险得很：`write_file` 会覆盖文件，`run_shell` 能跑任意命令，输出可能撑爆上下文，工具错误可能把循环带歪。

## 第一版 session log

即使是 toy agent，也要记录 trace。

```json
{"type":"user","text":"修登录 bug"}
{"type":"assistant","tool_calls":[{"id":"1","name":"run_shell","input":{"command":"npm test -- login"}}]}
{"type":"tool_result","tool_call_id":"1","ok":false,"content":"exit_code: 1\n..."}
{"type":"assistant","tool_calls":[{"id":"2","name":"read_file","input":{"path":"src/auth.ts"}}]}
```

这份日志以后会变成调试、恢复、评测和产品 UI 的基础。没有 trace，你只能相信模型最后那句话。

## 从 toy 到 usable

toy agent 的每个缺陷都会引出后面的章节。

<table>
<thead><tr><th>Toy 做法</th><th>问题</th><th>后续升级</th></tr></thead>
<tbody>
<tr><td>全历史塞给模型</td><td>上下文爆炸</td><td>context builder + compaction</td></tr>
<tr><td>write_file 覆盖文件</td><td>误删用户改动</td><td>patch / diff / expected old text</td></tr>
<tr><td>任意 shell</td><td>安全风险</td><td>permission policy + sandbox</td></tr>
<tr><td>工具返回字符串</td><td>错误难恢复</td><td>结构化 result + metadata</td></tr>
<tr><td>只看 final answer</td><td>无法证明成功</td><td>tests / lint / git diff / trace</td></tr>
</tbody>
</table>

## 练习

自己实现这个 toy agent 时，不要先做 UI。先把每一轮 messages 打印出来，观察模型为什么选择某个工具。你要能回答：这一轮模型看到了什么？它为什么下一步要读这个文件？工具结果如何影响下一轮？

## 读源码定位

- Medium 那类 “Claude Code from scratch” 教程通常停在本章层级。
- Pi 的核心 loop 在 `packages/agent/src/agent-loop.ts`，但工具、session、provider、UI 已经拆开。
- Anthropic / OpenAI API 的 tool use 文档解释了模型如何发起 tool call，但本章讲的是客户端 harness 如何接住它。

