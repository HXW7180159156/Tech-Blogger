const sampleInputs = {
  markdown: {
    label: "Markdown",
    title: "用 RAG 改造团队知识库的 5 个实践",
    content: `# 用 RAG 改造团队知识库的 5 个实践

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

![知识库流程图](rag-flow.png)

## 结论

RAG 项目的 MVP 不是最强模型，而是一个可信、可解释、可迭代的问答闭环。`,
  },
  word: {
    label: "Word",
    title: "把周报整理成技术博客的流程",
    content: `把周报整理成技术博客的流程

摘要：这是一份模拟从 Word 复制出来的技术文章草稿，保留标题、摘要、章节、项目符号、代码片段和图片占位。

一、确定读者和主题

先从周报里挑出一个对外部读者也有价值的主题，例如性能优化、架构升级或工具链改造。

• 写清楚原始问题
• 保留关键指标
• 删除内部项目代号

二、补齐可复用步骤

把团队内部的处理过程整理为可复用的方法，而不是只记录结果。

[代码]
function normalizePost(source) {
  return source.trim().replace(/\\s+/g, " ");
}
[/代码]

三、准备配图

[图片：优化前后链路对比图]

结论

Word 草稿进入统一文章模型后，可以和 Markdown、HTML 一样被预览、改写和导出。`,
  },
  html: {
    label: "HTML",
    title: "用 HTML 草稿生成平台内容",
    content: `<article>
  <h1>用 HTML 草稿生成平台内容</h1>
  <p data-summary="true">这是一篇模拟从 CMS 或网页编辑器导出的 HTML 技术草稿。</p>
  <h2>保留结构化标题</h2>
  <p>导入器会读取标题、段落、列表、代码块和图片，并转换成统一文章模型。</p>
  <ul>
    <li>保留主要层级</li>
    <li>清理脚本和样式</li>
    <li>将图片转换为占位信息</li>
  </ul>
  <h2>保留代码块</h2>
  <pre><code>const platform = "wechat";
console.log(\`export to \${platform}\`);</code></pre>
  <h2>记录图片占位</h2>
  <p><img src="architecture.png" alt="架构示意图"></p>
</article>`,
  },
};

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

const importers = {
  markdown: importMarkdown,
  word: importWord,
  html: importHtml,
};

const modelPresets = {
  mock: {
    label: "离线演示模式",
    endpoint: "",
    model: "local-rule-demo",
    responseFormat: "mock",
  },
  ollama: {
    label: "Ollama 本地模型",
    endpoint: "http://localhost:11434/api/chat",
    model: "llama3.1",
    responseFormat: "ollama",
  },
  lmstudio: {
    label: "LM Studio 本地模型",
    endpoint: "http://localhost:1234/v1/chat/completions",
    model: "local-model",
    responseFormat: "openai",
  },
  "openai-compatible": {
    label: "OpenAI 兼容接口",
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    responseFormat: "openai",
  },
};

const modelStorageKey = "tech-blogger-model-config";

const state = {
  template: "wechat",
  inputFormat: "markdown",
  article: null,
  importError: "",
  pendingImportError: "",
  modelConfig: loadModelConfig(),
};

const elements = {
  title: document.querySelector("#article-title"),
  sourceInput: document.querySelector("#markdown-input"),
  sourceLabel: document.querySelector("#source-label"),
  formatSelect: document.querySelector("#input-format"),
  fileInput: document.querySelector("#file-input"),
  importStatus: document.querySelector("#import-status"),
  articleMeta: document.querySelector("#article-meta"),
  preview: document.querySelector("#preview"),
  wordCount: document.querySelector("#word-count"),
  summary: document.querySelector("#summary-output"),
  suggestions: document.querySelector("#title-suggestions"),
  rewrite: document.querySelector("#rewrite-output"),
  exportOutput: document.querySelector("#export-output"),
  copyStatus: document.querySelector("#copy-status"),
  loadSampleButtons: document.querySelectorAll("[data-sample-format]"),
  summarize: document.querySelector("#summarize"),
  optimizeTitle: document.querySelector("#optimize-title"),
  rewritePlatform: document.querySelector("#rewrite-platform"),
  copyExport: document.querySelector("#copy-export"),
  templateTabs: document.querySelectorAll("[data-template]"),
  modelProvider: document.querySelector("#model-provider"),
  modelEndpoint: document.querySelector("#model-endpoint"),
  modelName: document.querySelector("#model-name"),
  modelApiKey: document.querySelector("#model-api-key"),
  saveModel: document.querySelector("#save-model"),
  testModel: document.querySelector("#test-model"),
  modelStatus: document.querySelector("#model-status"),
};

function loadModelConfig() {
  const fallback = { provider: "mock", ...modelPresets.mock, apiKey: "" };
  try {
    const rawConfig = window.localStorage.getItem(modelStorageKey);
    if (!rawConfig) return fallback;

    const config = JSON.parse(rawConfig);
    const provider = modelPresets[config.provider] ? config.provider : "mock";
    const preset = modelPresets[provider];
    return {
      provider,
      ...preset,
      endpoint: config.endpoint ?? preset.endpoint,
      model: config.model ?? preset.model,
      apiKey: config.apiKey || "",
    };
  } catch (error) {
    console.warn("无法读取模型配置，已回退到离线演示模式。", error);
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createArticle({ title, summary = "", blocks, sourceFormat, warnings = [], metadata = {} }) {
  const cleanedBlocks = blocks.filter((block) => {
    if (block.type === "list") return block.items.length > 0;
    if (block.type === "image") return block.alt || block.src;
    return block.text || block.code;
  });
  const plainText = cleanedBlocks
    .map((block) => {
      if (block.type === "list") return block.items.join(" ");
      if (block.type === "code") return block.code;
      if (block.type === "image") return block.alt;
      return block.text;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const firstParagraph = cleanedBlocks.find((block) => block.type === "paragraph")?.text || "";
  const codeBlocks = cleanedBlocks.filter((block) => block.type === "code");
  const images = cleanedBlocks.filter((block) => block.type === "image");

  return {
    title: title || "未命名技术文章",
    summary: summary || firstParagraph.slice(0, 120),
    blocks: cleanedBlocks,
    codeBlocks,
    images,
    plainText,
    metadata: {
      sourceFormat,
      importedAt: new Date().toISOString(),
      blockCount: cleanedBlocks.length,
      codeBlockCount: codeBlocks.length,
      imagePlaceholderCount: images.length,
      warnings,
      ...metadata,
    },
  };
}

function parseArticle() {
  const source = elements.sourceInput.value.trim();
  if (state.pendingImportError) {
    const message = state.pendingImportError;
    state.pendingImportError = "";
    state.importError = message;
    return createArticle({
      title: elements.title.value.trim(),
      sourceFormat: state.inputFormat,
      blocks: [],
      warnings: [message],
    });
  }

  if (!source) {
    state.importError = `请先粘贴或载入 ${sampleInputs[state.inputFormat].label} 内容。`;
    return createArticle({
      title: elements.title.value.trim(),
      sourceFormat: state.inputFormat,
      blocks: [],
      warnings: [state.importError],
    });
  }

  const importer = importers[state.inputFormat];
  const article = importer(source);
  article.title = elements.title.value.trim() || article.title;
  state.importError = "";
  return article;
}

function importMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const firstHeading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const blocks = [];
  let paragraph = [];
  let listItems = [];
  let inCode = false;
  let codeLanguage = "";
  let codeLines = [];

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  }

  function flushList() {
    if (listItems.length) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const codeFence = line.match(/^```(\w+)?\s*$/);
    if (codeFence) {
      if (inCode) {
        blocks.push({ type: "code", language: codeLanguage, code: codeLines.join("\n") });
        inCode = false;
        codeLanguage = "";
        codeLines = [];
      } else {
        flushParagraph();
        flushList();
        inCode = true;
        codeLanguage = codeFence[1] || "";
      }
      return;
    }

    if (inCode) {
      codeLines.push(rawLine);
      return;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      blocks.push({ type: "image", alt: image[1] || "图片占位", src: image[2] });
      return;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      if (!(level === 1 && heading[2].trim() === firstHeading)) {
        blocks.push({ type: "heading", level, text: heading[2].trim() });
      }
      return;
    }

    const list = line.match(/^[-*+]\s+(.+)$/);
    if (list) {
      flushParagraph();
      listItems.push(list[1].trim());
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    flushList();
    paragraph.push(line.trim());
  });

  flushParagraph();
  flushList();
  if (inCode) {
    blocks.push({ type: "code", language: codeLanguage, code: codeLines.join("\n") });
  }

  return createArticle({
    title: firstHeading || elements.title.value.trim(),
    blocks,
    sourceFormat: "markdown",
  });
}

function importWord(source) {
  if (/<\/?(html|body|article|p|h1|h2|ul|ol|li|pre|img)\b/i.test(source)) {
    const article = importHtml(source, "word");
    article.metadata.warnings.push("已按 Word/富文本粘贴的 HTML 结构解析。");
    return article;
  }

  const lines = source.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim());
  const title = lines.find(Boolean) || elements.title.value.trim();
  const blocks = [];
  let summary = "";
  let listItems = [];
  let codeLines = [];
  let inCode = false;

  function flushList() {
    if (listItems.length) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  }

  function flushCode() {
    if (codeLines.length) {
      blocks.push({ type: "code", language: "js", code: codeLines.join("\n") });
      codeLines = [];
    }
  }

  lines.slice(1).forEach((line) => {
    if (!line) {
      flushList();
      if (!inCode) flushCode();
      return;
    }

    if (line === "[代码]") {
      flushList();
      inCode = true;
      return;
    }

    if (line === "[/代码]") {
      inCode = false;
      flushCode();
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    const image = line.match(/^\[图片[：:]\s*(.+)\]$/);
    if (image) {
      flushList();
      blocks.push({ type: "image", alt: image[1].trim(), src: "" });
      return;
    }

    const summaryMatch = line.match(/^摘要[：:]\s*(.+)$/);
    if (summaryMatch) {
      summary = summaryMatch[1].trim();
      blocks.push({ type: "paragraph", text: summary });
      return;
    }

    const bullet = line.match(/^[•·*-]\s*(.+)$/);
    if (bullet) {
      listItems.push(bullet[1].trim());
      return;
    }

    const heading = line.match(/^((第[一二三四五六七八九十\d]+[章节])|([一二三四五六七八九十\d]+[、.]))\s*(.+)$/);
    if (heading || ["结论", "总结"].includes(line)) {
      flushList();
      blocks.push({ type: "heading", level: 2, text: heading ? heading[0].trim() : line });
      return;
    }

    flushList();
    blocks.push({ type: "paragraph", text: line });
  });

  flushList();
  flushCode();

  return createArticle({
    title,
    summary,
    blocks,
    sourceFormat: "word",
    warnings: ["静态 demo 支持 Word 复制文本/富文本 HTML；直接上传 .doc/.docx 会提示转换策略。"],
  });
}

function importHtml(source, sourceFormat = "html") {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(source, "text/html");
  const root = documentNode.querySelector("article") || documentNode.body;
  const title = root.querySelector("h1")?.textContent.trim() || elements.title.value.trim();
  const summary =
    root.querySelector("[data-summary='true']")?.textContent.trim() ||
    root.querySelector("p")?.textContent.trim() ||
    "";
  const blocks = [];

  function readNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const text = node.textContent.trim();
      if (!(tag === "h1" && text === title)) {
        blocks.push({ type: "heading", level: Number(tag.slice(1)), text });
      }
      return;
    }

    if (tag === "p") {
      const image = node.querySelector("img");
      if (image && node.textContent.trim() === "") {
        blocks.push({
          type: "image",
          alt: image.getAttribute("alt") || "HTML 图片占位",
          src: image.getAttribute("src") || "",
        });
        return;
      }
      blocks.push({ type: "paragraph", text: node.textContent.trim() });
      return;
    }

    if (tag === "ul" || tag === "ol") {
      blocks.push({
        type: "list",
        items: [...node.querySelectorAll(":scope > li")].map((item) => item.textContent.trim()),
      });
      return;
    }

    if (tag === "pre") {
      blocks.push({ type: "code", language: "", code: node.textContent.trim() });
      return;
    }

    if (tag === "img") {
      blocks.push({
        type: "image",
        alt: node.getAttribute("alt") || "HTML 图片占位",
        src: node.getAttribute("src") || "",
      });
      return;
    }

    [...node.children].forEach(readNode);
  }

  [...root.children].forEach(readNode);

  return createArticle({
    title,
    summary,
    blocks,
    sourceFormat,
    metadata: { sanitized: true },
  });
}

function articleToMarkdown(article) {
  const body = article.blocks
    .map((block) => {
      if (block.type === "heading") return `${"#".repeat(Math.min(block.level, 6))} ${block.text}`;
      if (block.type === "paragraph") return block.text;
      if (block.type === "list") return block.items.map((item) => `- ${item}`).join("\n");
      if (block.type === "code") return `\`\`\`${block.language || ""}\n${block.code}\n\`\`\``;
      if (block.type === "image") return `![${block.alt || "图片占位"}](${block.src || "待补充图片地址"})`;
      return "";
    })
    .filter(Boolean)
    .join("\n\n");

  return `# ${article.title}\n\n${body}`.trim();
}

function renderPreview(article) {
  if (!article.blocks.length) {
    elements.preview.className = "preview empty";
    elements.preview.textContent = state.importError || "等待导入 Markdown、Word 或 HTML 内容。";
    return;
  }

  const blocks = [
    `<h1>${escapeHtml(article.title)}</h1>`,
    ...article.blocks.map((block) => {
      if (block.type === "heading") return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
      if (block.type === "paragraph") return `<p>${escapeHtml(block.text).replace(/`([^`]+)`/g, "<code>$1</code>")}</p>`;
      if (block.type === "list") return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      if (block.type === "code") return `<pre><code>${escapeHtml(block.code)}</code></pre>`;
      if (block.type === "image") {
        return `<figure class="image-placeholder"><span>图片占位</span><figcaption>${escapeHtml(block.alt || block.src || "待补充图片")}</figcaption></figure>`;
      }
      return "";
    }),
  ];

  elements.preview.className = "preview";
  elements.preview.innerHTML = blocks.join("");
}

function summarizeArticle() {
  const article = state.article || parseArticle();
  if (!article.blocks.length) return "请先导入或粘贴一篇 Markdown、Word 或 HTML 技术文章。";

  const headings = article.blocks.filter((block) => block.type === "heading").map((block) => block.text);
  const scope = headings.slice(0, 3).join("、") || "核心实践";
  return `这篇《${article.title}》主要围绕 ${scope} 展开。核心价值是把原始素材转换成可编辑、可预览、可导出的技术内容。摘要：${article.summary.slice(0, 120)}...`;
}

function buildTitleSuggestions() {
  const article = state.article || parseArticle();
  return [
    `${article.title}：从输入到发布的完整实践`,
    `我用一篇实战案例讲清楚：${article.title}`,
    `${article.title} 的关键步骤和避坑点`,
  ];
}

function buildPlatformRewrite() {
  const article = state.article || parseArticle();
  const topHeadings = article.blocks.filter((block) => block.type === "heading").slice(0, 4);
  return [
    `平台定位：${platformCopy[state.template].intro}`,
    `开场钩子：如果你正在做「${article.title}」，先别急着堆功能，先跑通一个能验证价值的闭环。`,
    `内容重组：${topHeadings.length ? topHeadings.map((item, index) => `${index + 1}. ${item.text}`).join("；") : "提炼背景、步骤、结果和下一步"}`,
    `素材信息：来源格式 ${sampleInputs[article.metadata.sourceFormat]?.label || article.metadata.sourceFormat}，代码块 ${article.metadata.codeBlockCount} 个，图片占位 ${article.metadata.imagePlaceholderCount} 个。`,
    "行动引导：读者可以直接照着步骤复用，并根据自己的团队场景调整。",
  ].join("\n");
}

function getModelFormConfig() {
  const provider = elements.modelProvider.value;
  const preset = modelPresets[provider] || modelPresets.mock;
  return {
    provider,
    ...preset,
    endpoint: elements.modelEndpoint.value.trim(),
    model: elements.modelName.value.trim() || preset.model,
    apiKey: elements.modelApiKey.value.trim(),
  };
}

function renderModelConfig() {
  elements.modelProvider.value = state.modelConfig.provider;
  elements.modelEndpoint.value = state.modelConfig.endpoint;
  elements.modelName.value = state.modelConfig.model;
  elements.modelApiKey.value = state.modelConfig.apiKey;
  updateModelStatus(`当前使用：${modelPresets[state.modelConfig.provider].label}。`, "success");
}

function updateModelPreset(provider) {
  const preset = modelPresets[provider] || modelPresets.mock;
  elements.modelEndpoint.value = preset.endpoint;
  elements.modelName.value = preset.model;
  elements.modelApiKey.value = "";
  updateModelStatus(`${preset.label} 已载入默认配置，保存后生效。`);
}

function updateModelStatus(message, type = "") {
  elements.modelStatus.className = `model-status ${type}`.trim();
  elements.modelStatus.textContent = message;
}

function saveModelConfig() {
  state.modelConfig = getModelFormConfig();
  window.localStorage.setItem(
    modelStorageKey,
    JSON.stringify({
      provider: state.modelConfig.provider,
      endpoint: state.modelConfig.endpoint,
      model: state.modelConfig.model,
      apiKey: state.modelConfig.apiKey,
    }),
  );
  updateModelStatus(`${modelPresets[state.modelConfig.provider].label} 配置已保存。`, "success");
}

function getArticlePromptContext(article) {
  return [
    `标题：${article.title}`,
    `摘要：${article.summary}`,
    `平台：${platformCopy[state.template].label}`,
    `正文 Markdown：`,
    articleToMarkdown(article).slice(0, 6000),
  ].join("\n");
}

function buildPrompt(action, article) {
  const context = getArticlePromptContext(article);
  const instructions = {
    summarize: "请用中文生成一段 120 字以内的技术博客摘要，突出读者收益和核心实践。",
    titles: "请生成 5 个中文技术博客标题建议。每行一个标题，不要编号，不要解释。",
    rewrite: `请面向${platformCopy[state.template].label}生成平台化改写建议，包含开场钩子、内容结构、表达风格和行动引导。`,
    ping: "请只回复“连接成功”。",
  };
  return `${instructions[action]}\n\n${context}`;
}

async function callModel(prompt) {
  const config = state.modelConfig;
  if (config.responseFormat === "mock") return "";
  if (!config.endpoint) throw new Error("请先填写模型接口地址。");

  if (config.responseFormat === "ollama") {
    return callOllama(prompt, config);
  }

  return callOpenAICompatible(prompt, config);
}

async function callOllama(prompt, config) {
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      stream: false,
      messages: [
        { role: "system", content: "你是技术博客写作助手，输出简洁、可直接使用的中文内容。" },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Ollama 请求失败：${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.message?.content?.trim() || data.response?.trim() || "";
}

async function callOpenAICompatible(prompt, config) {
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: "你是技术博客写作助手，输出简洁、可直接使用的中文内容。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new Error(`模型请求失败：${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function setAiButtonsDisabled(disabled) {
  [elements.summarize, elements.optimizeTitle, elements.rewritePlatform, elements.testModel].forEach((button) => {
    button.disabled = disabled;
  });
}

function ensureArticleForAi() {
  const article = state.article || parseArticle();
  if (!article.blocks.length) throw new Error("请先导入或粘贴一篇 Markdown、Word 或 HTML 技术文章。");
  return article;
}

async function runAiAction(action) {
  setAiButtonsDisabled(true);
  try {
    const article = ensureArticleForAi();
    if (state.modelConfig.responseFormat === "mock") {
      if (action === "summarize") elements.summary.textContent = summarizeArticle();
      if (action === "titles") {
        elements.suggestions.innerHTML = buildTitleSuggestions()
          .map((title) => `<button class="chip" type="button">${escapeHtml(title)}</button>`)
          .join("");
        bindSuggestionClicks();
      }
      if (action === "rewrite") elements.rewrite.textContent = buildPlatformRewrite();
      updateModelStatus("离线演示模式已生成规则化辅助结果。", "success");
      return;
    }

    updateModelStatus(`${modelPresets[state.modelConfig.provider].label} 正在生成...`);
    const result = await callModel(buildPrompt(action, article));
    if (!result) throw new Error("模型返回为空，请检查模型名称或服务日志。");

    if (action === "summarize") elements.summary.textContent = result;
    if (action === "titles") {
      const titles = result
        .split("\n")
        .map((line) => line.replace(/^\s*[-*\d.、]+\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 6);
      elements.suggestions.innerHTML = titles.map((title) => `<button class="chip" type="button">${escapeHtml(title)}</button>`).join("");
      bindSuggestionClicks();
    }
    if (action === "rewrite") elements.rewrite.textContent = result;
    updateModelStatus(`${modelPresets[state.modelConfig.provider].label} 已返回结果。`, "success");
  } catch (error) {
    updateModelStatus(error.message, "error");
  } finally {
    setAiButtonsDisabled(false);
  }
}

async function testModelConnection() {
  saveModelConfig();
  if (state.modelConfig.responseFormat === "mock") {
    updateModelStatus("离线演示模式无需连接外部模型。", "success");
    return;
  }

  setAiButtonsDisabled(true);
  updateModelStatus(`${modelPresets[state.modelConfig.provider].label} 正在测试连接...`);
  try {
    const article = state.article || parseArticle();
    const result = await callModel(buildPrompt("ping", article));
    if (!result) throw new Error("模型返回为空，请检查模型名称或服务日志。");
    updateModelStatus(`连接成功：${result.slice(0, 80)}`, "success");
  } catch (error) {
    updateModelStatus(error.message, "error");
  } finally {
    setAiButtonsDisabled(false);
  }
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
  const outline = article.blocks
    .filter((block) => block.type === "heading")
    .map((heading, index) => `${index + 1}. ${heading.text}`)
    .join("\n");
  return `# ${article.title}

> 导语：${summarizeArticle()}

## 阅读目录
${outline || "1. 背景\n2. 实践步骤\n3. 总结"}

${articleToMarkdown(article).replace(/^# .+\n\n/, "")}

---
适合复制到微信公众号后台后继续微调排版。`;
}

function buildXiaohongshuExport(article) {
  const points = article.blocks
    .filter((block) => block.type === "heading")
    .slice(0, 5)
    .map((heading) => `✅ ${heading.text}`)
    .join("\n");
  return `${article.title}｜技术实践避坑总结

一句话总结：${summarizeArticle().slice(0, 100)}...

${points || "✅ 背景问题\n✅ 实践步骤\n✅ 可复用经验"}

素材说明：来自 ${sampleInputs[article.metadata.sourceFormat]?.label || article.metadata.sourceFormat} 导入，含 ${article.metadata.imagePlaceholderCount} 个图片占位。

#技术写作 #AI工具 #知识管理 #开发者效率`;
}

function buildDouyinExport(article) {
  const steps = article.blocks
    .filter((block) => block.type === "heading")
    .slice(0, 4)
    .map((heading, index) => `镜头 ${index + 2}：展示「${heading.text}」，配屏幕录制或关键词卡片。`)
    .join("\n");
  return `《${article.title}》短视频口播脚本

镜头 1：开场 3 秒
如果你的团队内容素材很多，但每次发布都要重新整理，这条视频给你一个可落地的思路。

${steps || "镜头 2：展示核心问题。\n镜头 3：展示解决步骤。\n镜头 4：展示最终效果。"}

结尾互动：
你现在的技术内容是怎么沉淀和复用的？评论区聊聊，我可以继续拆一个完整 Demo。`;
}

function renderExport() {
  const article = state.article || parseArticle();
  const builders = {
    wechat: buildWechatExport,
    xiaohongshu: buildXiaohongshuExport,
    douyin: buildDouyinExport,
  };
  elements.exportOutput.value = builders[state.template](article);
}

function renderImportStatus(article) {
  const source = sampleInputs[article.metadata.sourceFormat]?.label || article.metadata.sourceFormat;
  const warnings = article.metadata.warnings || [];
  const statusClass = state.importError ? "error" : warnings.length ? "warning" : "success";
  const statusText = state.importError || (warnings[0] || `${source} 已转换为统一文章模型。`);

  elements.importStatus.className = `import-status ${statusClass}`;
  elements.importStatus.textContent = statusText;
  elements.articleMeta.innerHTML = [
    `<span>来源：${escapeHtml(source)}</span>`,
    `<span>结构块：${article.metadata.blockCount}</span>`,
    `<span>代码块：${article.metadata.codeBlockCount}</span>`,
    `<span>图片占位：${article.metadata.imagePlaceholderCount}</span>`,
  ].join("");
}

function updateSourceLabel() {
  const source = sampleInputs[state.inputFormat].label;
  elements.sourceLabel.textContent = `${source} 内容`;
  elements.sourceInput.placeholder = `粘贴 ${source} 技术草稿...`;
}

function updateAll() {
  state.article = parseArticle();
  renderPreview(state.article);
  renderImportStatus(state.article);
  elements.wordCount.textContent = `${state.article.plainText.length} 字`;
  renderExport();
  elements.copyStatus.textContent = "";
}

function loadSample(format = state.inputFormat) {
  state.inputFormat = format;
  elements.formatSelect.value = format;
  elements.sourceInput.value = sampleInputs[format].content;
  elements.title.value = sampleInputs[format].title;
  updateSourceLabel();
  updateAll();
  renderAssists();
}

function inferFormatFromFile(fileName) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) return "markdown";
  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) return "html";
  if (lowerName.endsWith(".txt")) return "word";
  if (lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) return "unsupported-word-binary";
  return "";
}

function handleFileImport(file) {
  const inferredFormat = inferFormatFromFile(file.name);
  if (!inferredFormat) {
    state.pendingImportError = "暂不支持该文件类型。请导入 .md、.html/.htm、.txt，或复制 Word 正文后选择 Word 格式粘贴。";
    elements.sourceInput.value = "";
    updateAll();
    return;
  }

  if (inferredFormat === "unsupported-word-binary") {
    state.pendingImportError = "浏览器静态 demo 暂不直接解压 .doc/.docx。请在 Word 中复制正文粘贴，或另存为 HTML / TXT 后导入。";
    elements.sourceInput.value = "";
    updateAll();
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.inputFormat = inferredFormat;
    elements.formatSelect.value = inferredFormat;
    elements.sourceInput.value = String(reader.result || "");
    elements.title.value = file.name.replace(/\.(md|markdown|html|htm|txt)$/i, "");
    updateSourceLabel();
    updateAll();
    renderAssists();
  });
  reader.addEventListener("error", () => {
    state.pendingImportError = `读取文件失败：${reader.error?.message || "浏览器未返回具体错误"}`;
    updateAll();
  });
  reader.readAsText(file);
}

elements.loadSampleButtons.forEach((button) => {
  button.addEventListener("click", () => loadSample(button.dataset.sampleFormat));
});
elements.formatSelect.addEventListener("change", () => {
  state.inputFormat = elements.formatSelect.value;
  updateSourceLabel();
  updateAll();
  renderAssists();
});
elements.fileInput.addEventListener("change", () => {
  const file = elements.fileInput.files?.[0];
  if (file) handleFileImport(file);
});
elements.sourceInput.addEventListener("input", () => {
  updateAll();
  renderAssists();
});
elements.title.addEventListener("input", () => {
  updateAll();
  renderAssists();
});
elements.modelProvider.addEventListener("change", () => updateModelPreset(elements.modelProvider.value));
elements.saveModel.addEventListener("click", saveModelConfig);
elements.testModel.addEventListener("click", testModelConnection);
elements.summarize.addEventListener("click", () => runAiAction("summarize"));
elements.optimizeTitle.addEventListener("click", () => runAiAction("titles"));
elements.rewritePlatform.addEventListener("click", () => runAiAction("rewrite"));
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

renderModelConfig();
loadSample();
