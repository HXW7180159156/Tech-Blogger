const sampleMarkdown = `# 用 RAG 改造团队知识库的 5 个实践

很多团队已经积累了文档、会议纪要和代码片段，但真正需要答案时，信息仍然分散在不同工具里。RAG（Retrieval-Augmented Generation）适合先做一个轻量闭环：把可信内容检索出来，再交给模型组织答案。

## 1. 先收敛知识源

- 优先选择高频访问的产品文档、FAQ 和技术方案。
- 给每条文档保留来源、更新时间和负责人。
- 暂缓接入低质量聊天记录，避免噪音污染召回。

## 2. 切分策略要能解释

文档切分不只是固定长度。技术内容可以按照标题、列表和代码块分段，让召回结果更容易被用户理解。

\`\`\`ts
type KnowledgeChunk = {
  title: string;
  source: string;
  content: string;
  updatedAt: string;
};
\`\`\`

## 3. 评估比模型选择更早

先准备 20 个真实问题，记录期望答案、必需引用和不可接受回答。这样每次调整 embedding、chunk 或 prompt 都能看到是否变好。

## 4. 从可追踪答案开始

第一版不必追求全自动。只要能回答问题、展示引用、允许用户反馈“有用/无用”，团队就能开始积累真实改进数据。

## 结论

RAG 项目的 MVP 不是最强模型，而是一个可信、可解释、可迭代的问答闭环。`;

const platformCopy = {
  wechat: {
    label: "微信公众号",
    intro: "适合技术长文发布，保留结构、背景、步骤和代码块。",
  },
  xiaohongshu: {
    label: "小红书",
    intro: "适合经验卡片和避坑总结，突出短句、要点和标签。",
  },
  douyin: {
    label: "抖音",
    intro: "适合口播脚本和分镜提示，强调开场钩子、节奏和互动。",
  },
};

const state = {
  template: "wechat",
};

const elements = {
  title: document.querySelector("#article-title"),
  markdown: document.querySelector("#markdown-input"),
  preview: document.querySelector("#preview"),
  wordCount: document.querySelector("#word-count"),
  summary: document.querySelector("#summary-output"),
  suggestions: document.querySelector("#title-suggestions"),
  rewrite: document.querySelector("#rewrite-output"),
  exportOutput: document.querySelector("#export-output"),
  copyStatus: document.querySelector("#copy-status"),
  loadSample: document.querySelector("#load-sample"),
  summarize: document.querySelector("#summarize"),
  optimizeTitle: document.querySelector("#optimize-title"),
  rewritePlatform: document.querySelector("#rewrite-platform"),
  copyExport: document.querySelector("#copy-export"),
  templateTabs: document.querySelectorAll("[data-template]"),
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseArticle() {
  const markdown = elements.markdown.value.trim();
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = elements.title.value.trim() || firstHeading || "未命名技术文章";
  const body = markdown.replace(/^#\s+.+$/m, "").trim();
  const headings = [...markdown.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const paragraphs = body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return { title, markdown, body, headings, paragraphs, plainText };
}

function renderMarkdown(markdown) {
  if (!markdown.trim()) {
    elements.preview.className = "preview empty";
    elements.preview.textContent = "等待导入 Markdown 内容。";
    return;
  }

  const html = markdown
    .split(/(```[\s\S]*?```)/g)
    .map((block) => {
      if (block.startsWith("```")) {
        const code = block.replace(/^```\w*\n?/, "").replace(/```$/, "");
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
      }

      return renderMarkdownLines(block);
    })
    .join("");

  elements.preview.className = "preview";
  elements.preview.innerHTML = html;
}

function renderMarkdownLines(block) {
  let html = "";
  let inList = false;

  block.split("\n").forEach((line) => {
    if (/^-\s+/.test(line)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${escapeHtml(line.replace(/^-\s+/, ""))}</li>`;
      return;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (/^#\s+/.test(line)) html += `<h1>${escapeHtml(line.replace(/^#\s+/, ""))}</h1>`;
    else if (/^##\s+/.test(line)) html += `<h2>${escapeHtml(line.replace(/^##\s+/, ""))}</h2>`;
    else if (line.trim()) html += `<p>${escapeHtml(line).replace(/`([^`]+)`/g, "<code>$1</code>")}</p>`;
  });

  return html + (inList ? "</ul>" : "");
}

function summarizeArticle() {
  const article = parseArticle();
  if (!article.markdown) return "请先导入或粘贴一篇 Markdown 技术文章。";

  const firstPoint = article.paragraphs.find((part) => !part.startsWith("```")) || article.plainText;
  const scope = article.headings.slice(0, 3).join("、") || "核心实践";
  return `这篇《${article.title}》主要围绕 ${scope} 展开。核心价值是把分散经验整理成可执行步骤，适合沉淀为面向技术读者的实践型长文。摘要：${firstPoint.replace(/^#+\s*/, "").slice(0, 120)}...`;
}

function buildTitleSuggestions() {
  const { title } = parseArticle();
  return [
    `${title}：从问题到落地的完整实践`,
    `我用一篇实战案例讲清楚：${title}`,
    `${title} 的 5 个关键步骤和避坑点`,
  ];
}

function buildPlatformRewrite() {
  const article = parseArticle();
  const topHeadings = article.headings.slice(0, 4);
  return [
    `平台定位：${platformCopy[state.template].intro}`,
    `开场钩子：如果你正在做「${article.title}」，先别急着堆功能，先跑通一个能验证价值的闭环。`,
    `内容重组：${topHeadings.length ? topHeadings.map((item, index) => `${index + 1}. ${item}`).join("；") : "提炼背景、步骤、结果和下一步"}`,
    "行动引导：读者可以直接照着步骤复用，并根据自己的团队场景调整。",
  ].join("\n");
}

function renderAssists() {
  elements.summary.textContent = summarizeArticle();
  elements.suggestions.innerHTML = buildTitleSuggestions()
    .map((title) => `<button class="chip" type="button">${escapeHtml(title)}</button>`)
    .join("");
  elements.rewrite.textContent = buildPlatformRewrite();
  bindSuggestionClicks();
}

function bindSuggestionClicks() {
  elements.suggestions.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      elements.title.value = chip.textContent;
      updateAll();
    });
  });
}

function buildWechatExport(article) {
  const outline = article.headings.map((heading, index) => `${index + 1}. ${heading}`).join("\n");
  return `# ${article.title}

> 导语：${summarizeArticle()}

## 阅读目录
${outline || "1. 背景\n2. 实践步骤\n3. 总结"}

${article.body}

---
适合复制到微信公众号后台后继续微调排版。`;
}

function buildXiaohongshuExport(article) {
  const points = article.headings.slice(0, 5).map((heading) => `✅ ${heading}`).join("\n");
  return `${article.title}｜技术实践避坑总结

一句话总结：${summarizeArticle().slice(0, 100)}...

${points || "✅ 背景问题\n✅ 实践步骤\n✅ 可复用经验"}

适合人群：技术作者、开发团队、正在做知识沉淀的同学。

#技术写作 #AI工具 #知识管理 #开发者效率`;
}

function buildDouyinExport(article) {
  const steps = article.headings.slice(0, 4).map((heading, index) => `镜头 ${index + 2}：展示「${heading}」，配屏幕录制或关键词卡片。`).join("\n");
  return `《${article.title}》短视频口播脚本

镜头 1：开场 3 秒
如果你的团队文档很多，但每次找答案还要翻半天，这条视频给你一个可落地的思路。

${steps || "镜头 2：展示核心问题。\n镜头 3：展示解决步骤。\n镜头 4：展示最终效果。"}

结尾互动：
你现在的技术内容是怎么沉淀和复用的？评论区聊聊，我可以继续拆一个完整 Demo。`;
}

function renderExport() {
  const article = parseArticle();
  const builders = {
    wechat: buildWechatExport,
    xiaohongshu: buildXiaohongshuExport,
    douyin: buildDouyinExport,
  };
  elements.exportOutput.value = builders[state.template](article);
}

function updateAll() {
  const article = parseArticle();
  renderMarkdown(article.markdown);
  elements.wordCount.textContent = `${article.plainText.length} 字`;
  renderExport();
  elements.copyStatus.textContent = "";
}

function loadSample() {
  elements.markdown.value = sampleMarkdown;
  elements.title.value = "用 RAG 改造团队知识库的 5 个实践";
  renderAssists();
  updateAll();
}

elements.loadSample.addEventListener("click", loadSample);
elements.markdown.addEventListener("input", updateAll);
elements.title.addEventListener("input", updateAll);
elements.summarize.addEventListener("click", () => {
  elements.summary.textContent = summarizeArticle();
});
elements.optimizeTitle.addEventListener("click", () => {
  elements.suggestions.innerHTML = buildTitleSuggestions()
    .map((title) => `<button class="chip" type="button">${escapeHtml(title)}</button>`)
    .join("");
  bindSuggestionClicks();
});
elements.rewritePlatform.addEventListener("click", () => {
  elements.rewrite.textContent = buildPlatformRewrite();
});
elements.templateTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.template = tab.dataset.template;
    elements.templateTabs.forEach((item) => item.classList.toggle("active", item === tab));
    elements.rewrite.textContent = buildPlatformRewrite();
    renderExport();
  });
});
elements.copyExport.addEventListener("click", async () => {
  await navigator.clipboard.writeText(elements.exportOutput.value);
  elements.copyStatus.textContent = `${platformCopy[state.template].label}稿件已复制。`;
});

loadSample();
