import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const chaptersDir = join(root, "chapters");
const chapterFiles = (await readdir(chaptersDir)).filter((name) => name.endsWith(".md")).sort();
const index = await readFile(join(root, "index.html"), "utf8");

const required = [
  "Agent Harness",
  "Claude Code",
  "Codex",
  "Pi",
  "tool call",
  "context",
  "session",
  "sandbox",
  "MCP",
  "subagents",
  "eval",
];

const failures = [];
if (chapterFiles.length !== 15) failures.push(`expected 15 chapters, found ${chapterFiles.length}`);
for (const term of required) {
  if (!index.includes(term)) failures.push(`missing term: ${term}`);
}
const figureCount = (index.match(/<figure class="fig">/g) || []).length;
if (figureCount < 8) failures.push(`expected at least 8 figures, found ${figureCount}`);
const codeCount = (index.match(/<div class="code">/g) || []).length;
if (codeCount < 8) failures.push(`expected at least 8 code blocks, found ${codeCount}`);
if (!index.includes("不要说“模型执行了 bash”")) failures.push("missing wording guard about bash execution");
if (!index.includes("差异化不是支持更多工具")) failures.push("missing differentiation thesis");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`OK: ${chapterFiles.length} chapters, ${figureCount} figures, ${codeCount} code blocks.`);

