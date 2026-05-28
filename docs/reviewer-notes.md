# Reviewer Notes

这份书稿先由五个角色各自审了一轮写作方向，再合并成当前结构。

- Pi 作者视角：把 Pi 当作显微镜，强调 minimal harness、四个默认工具、extension-first，而不是把功能少等同于弱。
- Claude Code 作者视角：把重点放在产品化 harness：session、context、tools、permissions、MCP、hooks、skills、subagents 如何形成用户能使用的边界。
- 初级读者 A：要求第一章先跑完整 trace，少讲抽象词，多讲“一个请求到底怎样走完”。
- 初级读者 B：要求每个概念都落到最小实现：loop、tool registry、shell tool、patch edit、permission gate、compaction。
- 编辑视角：要求别替闭源产品脑补内部实现；先建立共同骨架，再比较产品取舍，最后讲如何做差异化。

合并后的写作原则：

- 第一遍读完要知道 agent harness 的主循环。
- 第二遍读完要能写一个 toy coding agent。
- 第三遍读完要知道 Claude Code / Codex / Pi 的差异不只是模型，而是上下文、工具、权限、session、扩展层和产品界面的取舍。
- 所有闭源产品描述都限定在官方文档、公开源码和可观察行为层面。
