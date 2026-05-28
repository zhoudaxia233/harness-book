# §7 Shell、文件系统与工作区

coding agent 之所以像“会干活”，很大程度来自 shell。测试、构建、搜索、git、包管理器、脚本、代码生成，全都在 shell 后面。

但 shell 也是最危险的工具。它能读秘密、删文件、联网、安装依赖、改 git 历史、启动长进程。一个 harness 如果只会把命令字符串扔给 `child_process.exec`，它迟早会出事故。

## Shell tool 的最小要求

教学版 shell 可以这样定义：

```ts
type ShellInput = {
  command: string
  timeoutMs?: number
}

type ShellResult = {
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  truncated: boolean
  cwd: string
}
```

至少要记录 `cwd`。很多 agent bug 不是模型不会，而是命令跑错目录。`npm test` 在 monorepo 根目录和 package 子目录里，含义完全不同。

## 普通 pipe 还是 PTY

大多数测试、lint、build 命令用普通 pipe 就够。PTY 适合需要终端特性的命令，比如交互式程序、彩色输出、全屏 TUI。但 PTY 会带来更多控制问题：输入怎么处理、窗口宽度如何设置、进程树如何清理。

第一版不要急着做交互式 shell。先支持非交互命令，把超时、截断、退出码做好。

## 输出截断

shell 输出要同时服务模型和人。

```ts
const result = await runCommand({
  command: "npm test",
  cwd: workspaceRoot,
  timeoutMs: 30_000,
  maxOutputBytes: 60_000,
})
```

截断时不要悄悄丢。应该明确返回：

```json
{
  "exitCode": 1,
  "stdout": "...last relevant lines...",
  "stderr": "...",
  "truncated": true,
  "fullOutputPath": ".agent/logs/cmd-123.txt"
}
```

模型需要知道自己没看到完整输出，否则它会把缺失信息当作不存在。

## 工作区边界

工作区是 agent 的活动范围。最小规则：

- 相对路径都解析到 workspace root。
- 禁止 `../..` 跳出工作区，除非用户明确授权。
- 默认不读 `.env`、私钥、token 文件。
- 写文件前检查父目录、文件存在状态、git dirty 状态。
- shell 命令在固定 cwd 跑，不继承所有敏感环境变量。

这也是 Codex、Claude Code 等工具反复强调 sandbox / permissions 的原因。只要 agent 能跑命令，就必须讨论工作区边界。

## Git 是第二个工作区状态

coding agent 改文件时，git 状态就是安全网。

- `git status` 告诉你哪些文件已经脏了。
- `git diff` 告诉你 agent 到底改了什么。
- commit / branch / worktree 让任务可以隔离。
- reset / checkout 这类命令非常危险，默认应该要求确认。

:::warn|常见误区
不要让 agent 随便“清理工作区”。用户未提交的改动可能不是噪声，而是正在进行的真实工作。
:::

## 文件工具的安全细节

文件读取工具要处理编码、二进制文件、超大文件、路径不存在。文件写入工具要处理父目录、不覆盖用户改动、换行风格、BOM。搜索工具要尊重 `.gitignore`，否则模型会扫进 `node_modules`、构建产物、缓存目录。

Pi 的 `read`、`grep`、`find`、`ls`、`edit`、`write` 拆得比较清楚。Claude Code / Codex 产品层也会把文件操作、搜索、命令执行区分开，因为它们的权限和 UI 展示方式不同。

## Shell 风险表

<table>
<thead><tr><th>命令类型</th><th>例子</th><th>默认策略</th></tr></thead>
<tbody>
<tr><td>只读查询</td><td>`pwd`, `git status`, `rg foo`</td><td>可自动允许</td></tr>
<tr><td>测试构建</td><td>`npm test`, `pytest`</td><td>通常允许，但限制超时</td></tr>
<tr><td>安装依赖</td><td>`npm install`, `pip install`</td><td>询问，说明网络和 lockfile 风险</td></tr>
<tr><td>删除文件</td><td>`rm`, `git clean`</td><td>询问或拒绝</td></tr>
<tr><td>改 git 历史</td><td>`git reset --hard`, `git push --force`</td><td>默认拒绝</td></tr>
<tr><td>读取秘密</td><td>`cat .env`, `printenv`</td><td>默认拒绝或红线提示</td></tr>
<tr><td>联网执行</td><td>`curl ... | sh`</td><td>默认拒绝</td></tr>
</tbody>
</table>

## 练习

给 toy shell 加三件事：固定 `cwd`、30 秒超时、输出最多 60KB。然后运行一个故意失败的测试，确认 session 里能看到 exit code、stderr、truncated 标记。

## 读源码定位

- Pi: `packages/coding-agent/src/core/tools/bash.ts`
- Pi: `packages/coding-agent/src/utils/shell.ts`
- Codex: `docs/sandbox.md` 指向官方 sandbox / approvals 文档
- Claude Code: permissions、sandbox environments、Bash sandbox 文档

