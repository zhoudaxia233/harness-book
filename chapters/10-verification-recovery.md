# §10 验证与错误恢复：失败不是异常，是主路径

coding agent 最容易给人错觉的一刻，是它写完后说“问题已经修复”。这句话不是证据。证据来自测试、lint、类型检查、截图、日志、diff、git status，或者明确说明为什么无法验证。

验证不是最后一步的礼貌动作，而是 agent loop 的组成部分。

## 验证回路

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 780 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Verification loop">
<defs><marker id="a10" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9f351e"/></marker></defs>
<style>.b{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.h{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.3}.t{font:600 14px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}.l{stroke:#9f351e;stroke-width:1.4;marker-end:url(#a10);fill:none}</style>
<rect class="h" x="70" y="105" width="120" height="70"/><text class="t" x="130" y="135" text-anchor="middle">Patch</text><text class="s" x="130" y="157" text-anchor="middle">修改代码</text>
<path class="l" d="M190 140 L250 140"/>
<rect class="b" x="250" y="105" width="130" height="70"/><text class="t" x="315" y="135" text-anchor="middle">Verify</text><text class="s" x="315" y="157" text-anchor="middle">test / lint / type</text>
<path class="l" d="M380 140 L440 140"/>
<rect class="h" x="440" y="105" width="120" height="70"/><text class="t" x="500" y="135" text-anchor="middle">Observe</text><text class="s" x="500" y="157" text-anchor="middle">通过 / 失败</text>
<path class="l" d="M500 175 C500 250 155 250 130 178"/>
<text x="310" y="252" class="s" text-anchor="middle">失败输出回到上下文，触发下一轮修正</text>
<path class="l" d="M560 140 L625 140"/>
<rect class="b" x="625" y="105" width="100" height="70"/><text class="t" x="675" y="135" text-anchor="middle">Report</text><text class="s" x="675" y="157" text-anchor="middle">基于证据</text>
</svg>
</div>
<figcaption>FIG 10·1 验证回路。失败不是任务外的异常，而是下一轮输入。</figcaption>
</figure>

## 验证命令怎么选

第一选择来自项目指令：`AGENTS.md`、`CLAUDE.md`、README、package scripts、CI 配置。第二选择来自用户明确要求。第三选择来自 agent 对项目结构的判断。

不要默认跑全量测试。大型项目全量测试可能半小时。更好的顺序是：

- 先跑相关最小测试。
- 再跑受影响 package 的 lint/typecheck。
- 如果改动范围大，再跑更广的 suite。
- 如果无法验证，明确说明原因和替代证据。

## 失败分类

<table>
<thead><tr><th>失败</th><th>常见原因</th><th>harness 应该提供什么</th></tr></thead>
<tbody>
<tr><td>命令 exit 1</td><td>测试失败、语法错、依赖缺失</td><td>exit code、stdout/stderr、截断信息</td></tr>
<tr><td>命令超时</td><td>测试挂住、交互式命令、死循环</td><td>timeout 标记、部分输出、进程清理</td></tr>
<tr><td>工具参数非法</td><td>模型填错 schema</td><td>validation error，提示字段</td></tr>
<tr><td>patch 冲突</td><td>oldText 不匹配、用户改动</td><td>冲突原因、当前片段</td></tr>
<tr><td>上下文不足</td><td>读错文件、日志被截断</td><td>搜索/读取下一步建议</td></tr>
<tr><td>权限不足</td><td>需要用户批准或被策略禁止</td><td>记录 decision，避免重复请求</td></tr>
</tbody>
</table>

## 自动修复循环

一个简单修复循环可以是：

```ts
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const result = await runVerification()
  session.addVerification(result)

  if (result.ok) return success()

  const diagnosis = await model.generate({
    messages: session.recentWith(result),
    tools,
  })

  await executeToolCalls(diagnosis.toolCalls)
}

return fail("verification still failing after max attempts")
```

这里的 `maxAttempts` 很重要。没有上限，agent 可能在错误上下文里反复撞墙。Claude Code 官方文档也提到自动压缩 thrashing 时会停止，避免无限循环。这个原则适用于很多自动恢复逻辑。

## “无法验证”也是一种结果

如果项目没有测试，依赖装不上，或者验证需要外部服务，agent 应该诚实汇报：

- 尝试了什么。
- 为什么没法验证。
- 现在有哪些静态证据。
- 用户下一步应如何确认。

“没有跑测试但看起来应该对”是最差汇报。

:::mental|本章心智模型
agent 是否可靠，不看 final answer 自不自信，而看它能不能把结果接到可复现的验证证据上。
:::

## 练习

设计 5 个小任务作为 eval：修一个空指针、改一个断言、补一个边界条件、修一个 lint、更新一个 README。每次改 harness 后都跑这 5 个任务，看误改文件、跑错命令、丢上下文的次数是否下降。

## 读源码定位

- Pi: `test/suite/`、`test/agent-session-*.test.ts`
- Codex docs: evals、agent improvement loop、iterative repair loop cookbooks
- Claude Code docs: common workflows、best practices、give Claude something to verify against

