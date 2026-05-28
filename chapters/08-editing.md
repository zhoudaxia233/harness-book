# §8 代码编辑策略：从全文重写到局部补丁

让模型“生成一个完整文件”很容易。让它在一个真实 repo 里做最小、可审计、不覆盖用户改动的修改，很难。

这就是编辑工具的门道。

## 三种编辑方式

<table>
<thead><tr><th>方式</th><th>做法</th><th>优点</th><th>风险</th></tr></thead>
<tbody>
<tr><td>全文重写</td><td>模型给出整个文件内容</td><td>实现简单</td><td>容易误删、改动巨大、冲突难检测</td></tr>
<tr><td>文本替换</td><td>`oldText -> newText`</td><td>局部、可检测旧内容</td><td>oldText 不唯一或匹配失败</td></tr>
<tr><td>unified diff / patch</td><td>生成标准补丁</td><td>可审计、接近 git 工作流</td><td>解析和失败恢复更复杂</td></tr>
<tr><td>AST edit</td><td>按语法树改节点</td><td>结构可靠</td><td>语言相关，覆盖面有限</td></tr>
</tbody>
</table>

第一版可以从 `oldText -> newText` 做起，但要加约束：oldText 必须唯一，不能为空，多个 edit 不能重叠，失败时返回清楚错误。

## 为什么 patch 更安全

patch 的价值不只是“看起来像 git diff”。它提供了三个安全边界：

- **预期旧内容**：如果文件已被用户改过，patch 应该失败，而不是覆盖。
- **最小改动**：用户可以 review。
- **可回滚**：配合 checkpoint 或 git，可以撤销。

一个教学版 edit tool 可以长这样：

```ts
type EditInput = {
  path: string
  edits: Array<{
    oldText: string
    newText: string
  }>
}

async function applyEdits(input: EditInput, cwd: string) {
  const path = resolveInsideWorkspace(cwd, input.path)
  const original = await readFile(path, "utf8")

  for (const edit of input.edits) {
    const count = countOccurrences(original, edit.oldText)
    if (count !== 1) {
      throw new Error(`oldText must match exactly once, found ${count}`)
    }
  }

  const next = applyNonOverlappingReplacements(original, input.edits)
  const diff = createUnifiedDiff(input.path, original, next)
  await writeFile(path, next, "utf8")
  return { ok: true, content: "edit applied", details: { diff } }
}
```

Pi 的 `edit` 工具就非常值得读：它支持多个替换、要求唯一匹配、处理换行、生成 diff 和 patch，还用 mutation queue 避免同一个文件的并发写入互相踩。

## 编辑预览

产品界面里，编辑不应该等执行完才展示。模型 streaming 出工具参数时，UI 可以尝试预览 diff。如果 oldText 找不到，提前显示错误；如果能匹配，提前让用户看到将要发生什么。

这就是 Claude Code、Codex 这类工具里 diff review 的意义。它不是装饰，而是把高风险副作用变成人能判断的对象。

<figure class="fig">
<div class="svg-scroll">
<svg viewBox="0 0 820 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Patch workflow">
<defs><marker id="a8" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9f351e"/></marker></defs>
<style>.b{fill:#fffaf0;stroke:#17130d;stroke-width:1.2}.h{fill:#f0e6d2;stroke:#9f351e;stroke-width:1.3}.t{font:600 14px serif;fill:#17130d}.s{font:12px sans-serif;fill:#665a49}.l{stroke:#9f351e;stroke-width:1.3;marker-end:url(#a8)}</style>
<rect class="b" x="40" y="95" width="120" height="70"/><text class="t" x="100" y="124" text-anchor="middle">Read File</text><text class="s" x="100" y="146" text-anchor="middle">原文</text>
<line class="l" x1="160" y1="130" x2="195" y2="130"/>
<rect class="h" x="195" y="95" width="135" height="70"/><text class="t" x="262" y="124" text-anchor="middle">Match oldText</text><text class="s" x="262" y="146" text-anchor="middle">唯一 / 非重叠</text>
<line class="l" x1="330" y1="130" x2="365" y2="130"/>
<rect class="b" x="365" y="95" width="120" height="70"/><text class="t" x="425" y="124" text-anchor="middle">Preview Diff</text><text class="s" x="425" y="146" text-anchor="middle">给人看</text>
<line class="l" x1="485" y1="130" x2="520" y2="130"/>
<rect class="h" x="520" y="95" width="120" height="70"/><text class="t" x="580" y="124" text-anchor="middle">Apply</text><text class="s" x="580" y="146" text-anchor="middle">写文件</text>
<line class="l" x1="640" y1="130" x2="675" y2="130"/>
<rect class="b" x="675" y="95" width="110" height="70"/><text class="t" x="730" y="124" text-anchor="middle">Verify</text><text class="s" x="730" y="146" text-anchor="middle">format / test</text>
<text x="410" y="225" class="s" text-anchor="middle">任一环节失败，都应该返回结构化错误，而不是悄悄改写整个文件。</text>
</svg>
</div>
<figcaption>FIG 8·1 局部编辑流程。安全来自“旧内容匹配 + diff 预览 + 验证”。</figcaption>
</figure>

## 格式化也是编辑策略的一部分

agent 改完代码后，可能需要跑 formatter。但 formatter 会扩大 diff，甚至改到用户没要求的文件。默认策略可以是：

- 只格式化被修改文件。
- formatter 失败时返回错误，不要继续假装成功。
- 对 lockfile、generated file、migration file 更谨慎。
- 格式化前后都保留 diff。

## 用户改动保护

在真实项目里，工作区可能本来就是脏的。agent 应该避免覆盖用户改动。至少要做：

- 修改前记录文件 hash。
- 应用 patch 前检查旧内容仍然匹配。
- 如果同一文件被外部修改，停止并询问。
- 不要擅自 revert 用户未提交改动。

:::warn|常见误区
“生成完整文件”在 demo 里很漂亮，在真实 repo 里很危险。越接近生产，越要偏向最小补丁和可审计 diff。
:::

## 练习

把 toy agent 的 `write_file` 替换为 `edit_file`。要求 oldText 必须唯一。然后构造一个 oldText 出现两次的文件，确认工具失败，并让模型学会补更多上下文。

## 读源码定位

- Pi: `packages/coding-agent/src/core/tools/edit.ts`
- Pi: `packages/coding-agent/src/core/tools/edit-diff.ts`
- Codex: `codex-rs/apply-patch/` 和 apply patch 工具说明
- Claude Code / Codex: diff review、checkpoint、permissions 相关文档

