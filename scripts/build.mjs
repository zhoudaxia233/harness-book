import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const chaptersDir = join(root, "chapters");
const files = (await readdir(chaptersDir)).filter((name) => name.endsWith(".md")).sort();

const chapters = [];
for (const file of files) {
  const markdown = await readFile(join(chaptersDir, file), "utf8");
  chapters.push({ file, markdown });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inline(value) {
  let out = escapeHtml(value);
  out = out.replace(/`([^`]+)`/g, "<code class=\"inl\">$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a class=\"link\" href=\"$2\">$1</a>");
  return out;
}

function slugFromTitle(title, index) {
  return `ch${String(index).padStart(2, "0")}-${title
    .replace(/^§\d+\s*/, "")
    .toLowerCase()
    .replace(/[`"'：:，,。/\\]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40)}`;
}

function renderMarkdown(markdown, chapterIndex) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;
  let inCode = false;
  let codeLang = "";
  let code = [];
  let inList = false;
  let inCallout = false;
  let calloutKind = "";
  let calloutTitle = "";
  let calloutLines = [];

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  const flushCallout = () => {
    if (!inCallout) return;
    const body = calloutLines
      .join("\n")
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => `<p>${inline(part.replace(/\n+/g, " "))}</p>`)
      .join("");
    html.push(`<div class="callout ${calloutKind}"><span class="label">${inline(calloutTitle)}</span>${body}</div>`);
    inCallout = false;
    calloutKind = "";
    calloutTitle = "";
    calloutLines = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inCode) {
      if (trimmed.startsWith("```")) {
        html.push(`<div class="code"><div class="label"><span>${escapeHtml(codeLang || "code")}</span></div><pre><code>${escapeHtml(code.join("\n"))}</code></pre></div>`);
        inCode = false;
        codeLang = "";
        code = [];
      } else {
        code.push(line);
      }
      i++;
      continue;
    }

    if (inCallout) {
      if (trimmed === ":::") {
        flushCallout();
      } else {
        calloutLines.push(line);
      }
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      closeList();
      inCode = true;
      codeLang = trimmed.slice(3).trim();
      i++;
      continue;
    }

    if (trimmed.startsWith(":::")) {
      closeList();
      const parts = trimmed.slice(3).trim().split("|");
      calloutKind = parts[0]?.trim() || "note";
      calloutTitle = parts[1]?.trim() || "Note";
      inCallout = true;
      calloutLines = [];
      i++;
      continue;
    }

    if (trimmed.startsWith("<figure") || trimmed.startsWith("<table")) {
      closeList();
      const raw = [];
      const endTag = trimmed.startsWith("<table") ? "</table>" : "</figure>";
      while (i < lines.length) {
        raw.push(lines[i]);
        if (lines[i].trim() === endTag) break;
        i++;
      }
      html.push(raw.join("\n"));
      i++;
      continue;
    }

    if (trimmed === "") {
      closeList();
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      closeList();
      const title = trimmed.slice(2).trim();
      const id = slugFromTitle(title, chapterIndex);
      html.push(`<section class="chapter" id="${id}"><div class="chapter-head"><span class="chapter-num">§ ${chapterIndex}</span><h2>${inline(title.replace(/^§\d+\s*/, ""))}</h2></div>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      closeList();
      html.push(`<h3 class="section">${inline(trimmed.slice(3).trim())}</h3>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      closeList();
      html.push(`<h4 class="sub">${inline(trimmed.slice(4).trim())}</h4>`);
      i++;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        html.push("<ul class=\"list\">");
        inList = true;
      }
      html.push(`<li>${inline(trimmed.slice(2))}</li>`);
      i++;
      continue;
    }

    closeList();
    html.push(`<p>${inline(trimmed)}</p>`);
    i++;
  }

  closeList();
  flushCallout();
  html.push("</section>");

  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(/^§\d+\s*/, "") : `Chapter ${chapterIndex}`;
  const id = slugFromTitle(titleMatch ? titleMatch[1] : title, chapterIndex);
  return { title, id, body: html.join("\n") };
}

const rendered = chapters.map((chapter, index) => renderMarkdown(chapter.markdown, index));

const toc = rendered
  .map((chapter, index) => `<li><a href="#${chapter.id}"><span>§${index}</span>${inline(chapter.title)}</a></li>`)
  .join("\n");

const css = `
:root{--bg:#f8f4ea;--paper:#fffaf0;--ink:#17130d;--muted:#665a49;--soft:#e9dec8;--line:#cbbd9d;--accent:#9f351e;--blue:#263d55;--green:#465a3a;--code:#211d18;--codefg:#eee3cf;--mono:"JetBrains Mono","SFMono-Regular",ui-monospace,monospace;--serif:"Noto Serif SC","Songti SC","STSong",serif;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--serif);font-size:18px;line-height:1.78;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;background-image:radial-gradient(rgba(120,90,40,.045) 1px,transparent 1px);background-size:22px 22px}
a{color:var(--accent);text-decoration:none;border-bottom:1px solid rgba(159,53,30,.25)}a:hover{border-bottom-color:var(--accent)}
.cover{min-height:92vh;display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);gap:48px;align-items:center;padding:7vh clamp(24px,7vw,112px);border-bottom:1px solid var(--line)}
.imprint{font-family:var(--sans);font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:2rem}.seal{display:inline-block;width:12px;height:12px;background:var(--accent);margin-right:.55rem;vertical-align:-1px}
h1{font-size:clamp(2.6rem,6vw,5.2rem);line-height:1.05;margin:0 0 1rem;font-weight:600;letter-spacing:-.02em}.subtitle{font-size:1.18rem;color:var(--muted);max-width:36em}.cover-card{background:var(--paper);border:1px solid var(--line);box-shadow:5px 7px 0 var(--soft);padding:1.6rem}.cover-card h2{font-size:1.2rem;margin:0 0 .7rem;color:var(--accent)}.cover-card ol{margin:.3rem 0 0;padding-left:1.4rem}.cover-card li{margin:.25rem 0}
.shell{display:grid;grid-template-columns:280px minmax(0,780px);gap:56px;align-items:start;max-width:1220px;margin:0 auto;padding:48px 28px 84px}
.toc{position:sticky;top:20px;font-family:var(--sans);font-size:.9rem;color:var(--muted);max-height:calc(100vh - 40px);overflow:auto}.toc h2{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-family:var(--sans)}.toc ol{list-style:none;margin:0;padding:0}.toc li{margin:.25rem 0}.toc a{display:grid;grid-template-columns:40px 1fr;gap:8px;border:0;color:var(--muted);padding:.24rem 0}.toc span{font-family:var(--mono);color:var(--accent);font-size:.78rem}
.manuscript{min-width:0}.chapter{margin:0 0 5rem}.chapter-head{border-bottom:1px solid var(--line);padding-bottom:1rem;margin-bottom:1.8rem}.chapter-num{font-family:var(--mono);font-size:.76rem;color:var(--accent);letter-spacing:.08em}.chapter h2{font-size:clamp(1.9rem,4vw,3rem);line-height:1.18;margin:.4rem 0 0;font-weight:600}.section{font-size:1.45rem;margin:2.1rem 0 .7rem;color:var(--blue);line-height:1.35}.sub{font-size:1.08rem;margin:1.4rem 0 .45rem;color:var(--green)}
p{margin:.85rem 0}.chapter>p:first-of-type{font-size:1.06rem}.inl{font-family:var(--mono);font-size:.88em;background:rgba(159,53,30,.08);padding:.08em .3em;border-radius:3px;color:#5e2518}
.list{padding-left:1.4rem;margin:.7rem 0 1.1rem}.list li{margin:.34rem 0}.list li::marker{color:var(--accent)}
.callout{margin:1.4rem 0;padding:1rem 1.1rem;background:var(--paper);border:1px solid var(--line);border-left:4px solid var(--accent);box-shadow:2px 3px 0 var(--soft)}.callout .label{display:block;font-family:var(--sans);font-size:.78rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:.4rem}.callout.mental{border-left-color:var(--blue)}.callout.warn{border-left-color:var(--green)}.callout.source{border-left-color:var(--accent)}
.code{margin:1.2rem 0;background:var(--code);color:var(--codefg);border:1px solid #40382d;box-shadow:2px 3px 0 var(--soft);overflow:hidden}.code .label{font-family:var(--mono);font-size:.72rem;color:#caa56b;border-bottom:1px solid #40382d;padding:.45rem .8rem;text-transform:uppercase;letter-spacing:.08em}.code pre{margin:0;padding:1rem;overflow:auto;line-height:1.55;font-size:.86rem}
figure.fig{margin:2rem 0;padding:1rem;background:var(--paper);border:1px solid var(--line);box-shadow:3px 5px 0 var(--soft)}figure.fig svg{display:block;max-width:100%;height:auto;margin:0 auto}figcaption{font-family:var(--sans);font-size:.86rem;color:var(--muted);text-align:center;border-top:1px dashed var(--line);margin-top:.8rem;padding-top:.65rem}.svg-scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse;margin:1.2rem 0;background:var(--paper);border:1px solid var(--line);font-family:var(--sans);font-size:.92rem}th,td{padding:.68rem .8rem;border-bottom:1px solid var(--soft);vertical-align:top;text-align:left}th{color:var(--accent);background:#f0e6d2}tr:last-child td{border-bottom:0}
footer{max-width:780px;margin:4rem auto;padding:2rem 28px;border-top:1px solid var(--line);color:var(--muted);text-align:center;font-style:italic}
@media(max-width:900px){.cover{grid-template-columns:1fr;min-height:auto}.shell{display:block}.toc{position:relative;top:auto;max-height:none;margin-bottom:2.2rem}.toc ol{columns:2}.cover-card{box-shadow:3px 4px 0 var(--soft)}}@media(max-width:620px){body{font-size:16px}.cover{padding:38px 20px}.shell{padding:30px 18px 60px}.toc ol{columns:1}h1{font-size:2.25rem}.chapter h2{font-size:1.7rem}.section{font-size:1.25rem}.code pre{font-size:.76rem}.svg-scroll svg{min-width:620px;max-width:none}}
`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Agent Harness：拆开编码代理</title>
<style>${css}</style>
</head>
<body>
<header class="cover">
  <div>
    <div class="imprint"><span class="seal"></span>Harness Book · First Draft</div>
    <h1>Agent Harness<br />拆开编码代理</h1>
    <p class="subtitle">从零理解 Claude Code、Codex、Pi 这类系统的运行骨架：模型如何变成会读仓库、调工具、改文件、跑测试、受权限约束的工程执行壳。</p>
  </div>
  <aside class="cover-card">
    <h2>这本书讲什么</h2>
    <ol>
      <li>一次用户请求如何变成经过验证的代码变更。</li>
      <li>模型、上下文、工具、session、权限、UI 如何分工。</li>
      <li>toy agent 和产品级 harness 之间到底差在哪。</li>
      <li>如何 dig deeper，做出自己的差异化。</li>
    </ol>
  </aside>
</header>
<div class="shell">
  <nav class="toc"><h2>目录</h2><ol>${toc}</ol></nav>
  <main class="manuscript">${rendered.map((chapter) => chapter.body).join("\n")}</main>
</div>
<footer>模型不是 agent。模型提出下一步，harness 决定它能看到什么、能做什么、怎么记录、如何恢复。</footer>
</body>
</html>
`;

await writeFile(join(root, "index.html"), html, "utf8");
console.log(`Built index.html from ${files.length} chapters.`);
