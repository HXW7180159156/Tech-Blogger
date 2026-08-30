const builtInTemplates = {
  wechat: {
    label: "微信公众号",
    exportName: "HTML / 富文本",
    style: "深度长文、清晰层级、适合收藏转发",
    titleRule: "保留技术关键词，前置收益点，控制在 24 字以内",
    summaryRule: "用 2-3 句解释问题、方案和读者收益",
    tagRule: "3-5 个技术栈或场景标签",
    codeRule: "保留完整代码块，添加语言标题，使用浅色背景便于复制",
    imageRatio: "封面 2.35:1，正文配图 16:9",
    extensionPoint: "后续可接入公众号样式主题、代码高亮和图床上传",
  },
  xiaohongshu: {
    label: "小红书",
    exportName: "图文结构",
    style: "卡片化、强钩子、步骤清晰、适合滑动阅读",
    titleRule: "使用结果导向标题，建议加入 emoji 和数字",
    summaryRule: "首屏说明痛点和立即可获得的实践结果",
    tagRule: "8-12 个场景、技术、成长类话题标签",
    codeRule: "把代码块压缩为代码卡片摘要，避免大段复制代码",
    imageRatio: "封面 3:4，正文卡片 4:5",
    extensionPoint: "后续可接入长图切片、封面模板和敏感词检查",
  },
  douyin: {
    label: "抖音",
    exportName: "文案 / 脚本结构",
    style: "短视频口播、3 秒钩子、镜头节奏明确",
    titleRule: "用疑问或反差制造点击动机，控制在 18 字以内",
    summaryRule: "转成 30-60 秒口播主线：问题、演示、结论",
    tagRule: "5-8 个技术、效率、AI、程序员话题标签",
    codeRule: "把代码块改写成镜头提示和关键变量讲解",
    imageRatio: "视频 9:16，封面 3:4",
    extensionPoint: "后续可接入分镜导出、字幕 SRT 和 TTS 配音",
  },
};

const sampleArticle = {
  title: "用本地知识库给技术博客加一个 AI 助手",
  summary:
    "这篇文章演示如何把 Markdown 技术笔记整理为可检索的本地知识库，并用一个简单的检索增强流程生成博客初稿。",
  tags: ["AI", "RAG", "Markdown", "知识库", "技术写作"],
  imageHint: "一个开发者工作台，左侧是 Markdown 笔记，右侧是 AI 生成的文章大纲",
  body: `## 为什么要做
技术博客经常卡在资料整理阶段。把历史笔记变成可检索知识库后，选题、提纲和示例代码都可以复用。

## 实现步骤
1. 收集 Markdown 笔记，按主题拆分。
2. 为每个片段生成摘要和标签。
3. 写一个检索函数，按关键词取回最相关片段。
4. 把片段交给模型生成博客草稿。

\`\`\`js
function searchNotes(notes, keyword) {
  return notes
    .filter((note) => note.title.includes(keyword) || note.tags.includes(keyword))
    .slice(0, 5);
}
\`\`\`

## 结果
同一份素材可以生成长文、图文卡片和短视频脚本，减少重复改写成本。`,
};

function cloneTemplates(templates) {
  return JSON.parse(JSON.stringify(templates));
}

const state = {
  templates: cloneTemplates(builtInTemplates),
  selectedPlatform: "wechat",
  drafts: {},
};

const elements = {
  title: document.querySelector("#articleTitle"),
  summary: document.querySelector("#articleSummary"),
  tags: document.querySelector("#articleTags"),
  imageHint: document.querySelector("#articleImageHint"),
  body: document.querySelector("#articleBody"),
  loadSample: document.querySelector("#loadSample"),
  generateAll: document.querySelector("#generateAll"),
  presetList: document.querySelector("#presetList"),
  presetForm: document.querySelector("#presetForm"),
  platformSelect: document.querySelector("#platformSelect"),
  presetStyle: document.querySelector("#presetStyle"),
  presetTitleRule: document.querySelector("#presetTitleRule"),
  presetSummaryRule: document.querySelector("#presetSummaryRule"),
  presetTagRule: document.querySelector("#presetTagRule"),
  presetCodeRule: document.querySelector("#presetCodeRule"),
  presetImageRatio: document.querySelector("#presetImageRatio"),
  outputCards: document.querySelector("#outputCards"),
  status: document.querySelector("#statusMessage"),
};

function getArticleFromForm() {
  return {
    title: elements.title.value.trim(),
    summary: elements.summary.value.trim(),
    tags: elements.tags.value
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    imageHint: elements.imageHint.value.trim(),
    body: elements.body.value.trim(),
  };
}

function setArticleForm(article) {
  elements.title.value = article.title;
  elements.summary.value = article.summary;
  elements.tags.value = article.tags.join(", ");
  elements.imageHint.value = article.imageHint;
  elements.body.value = article.body;
}

function splitMarkdown(markdown) {
  const codeBlocks = [];
  const withoutCode = markdown.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, language = "text", code) => {
    codeBlocks.push({ language, code: code.trim() });
    return `\n[代码块 ${codeBlocks.length}: ${language}]\n`;
  });
  const sections = withoutCode
    .split(/\n(?=##\s+)/)
    .map((section) => section.trim())
    .filter(Boolean);

  return { sections, codeBlocks };
}

function getSectionLines(section) {
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("[代码块 "));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphToHtml(line) {
  if (line.startsWith("## ")) {
    return `<h2>${escapeHtml(line.slice(3))}</h2>`;
  }

  if (/^\d+\.\s/.test(line)) {
    return `<p class="step">${escapeHtml(line)}</p>`;
  }

  if (line.startsWith("[代码块 ")) {
    return "";
  }

  return `<p>${escapeHtml(line)}</p>`;
}

function buildWechatDraft(article, template, parsed) {
  const bodyHtml = parsed.sections
    .join("\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(paragraphToHtml)
    .filter(Boolean)
    .join("\n");

  const codeHtml = parsed.codeBlocks
    .map(
      (block) => `<section class="code-card">
  <p>${escapeHtml(block.language.toUpperCase())} 代码</p>
  <pre><code>${escapeHtml(block.code)}</code></pre>
</section>`,
    )
    .join("\n");

  return `<article class="wechat-draft">
  <h1>${escapeHtml(article.title)}</h1>
  <blockquote>${escapeHtml(article.summary)}</blockquote>
  <p><strong>标签：</strong>${article.tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</p>
  <p><strong>配图建议：</strong>${escapeHtml(article.imageHint)}；${escapeHtml(template.imageRatio)}</p>
  ${bodyHtml}
  ${codeHtml}
</article>`;
}

function buildXiaohongshuDraft(article, template, parsed) {
  const cards = [
    `封面卡：${article.title}\n副标题：${article.summary}`,
    ...parsed.sections.map((section, index) => {
      const lines = getSectionLines(section);
      const heading = lines[0].replace(/^##\s*/, "");
      const content = lines.slice(1).join(" ").slice(0, 120);
      return `第 ${index + 1} 张：${heading}\n要点：${content}`;
    }),
    ...parsed.codeBlocks.map(
      (block, index) =>
        `代码卡 ${index + 1}：${block.language.toUpperCase()}\n展示关键逻辑，正文提示读者到公众号或仓库复制完整代码。\n核心片段：${block.code
          .split("\n")
          .slice(0, 3)
          .join(" ")}`,
    ),
  ];

  return [
    `标题建议：${article.title} 🚀`,
    `首屏文案：${article.summary}`,
    `图片比例：${template.imageRatio}`,
    `配图提示：${article.imageHint}`,
    "",
    "图文结构：",
    ...cards.map((card) => `- ${card}`),
    "",
    `标签：${article.tags.map((tag) => `#${tag}`).join(" ")} #程序员 #AI工具 #技术成长`,
  ].join("\n");
}

function buildDouyinDraft(article, template, parsed) {
  const beats = parsed.sections.map((section, index) => {
    const lines = getSectionLines(section);
    const heading = lines[0].replace(/^##\s*/, "");
    return `${index + 1}. 镜头：展示「${heading}」\n   口播：${lines.slice(1).join(" ").slice(0, 96)}`;
  });

  const codeBeats = parsed.codeBlocks.map(
    (block, index) =>
      `代码镜头 ${index + 1}：放大 ${block.language.toUpperCase()} 关键逻辑，强调输入、过滤条件和输出结果。`,
  );

  return [
    `短视频标题：${article.title}`,
    `3 秒钩子：如果你的技术笔记越写越多，却很难复用，可以试试这个 AI 博客工作流。`,
    `视频比例：${template.imageRatio}`,
    "",
    "脚本结构：",
    ...beats,
    ...codeBeats,
    "",
    `收尾 CTA：保存这条，下次写技术博客前先跑一遍这个流程。`,
    `发布标签：${article.tags.map((tag) => `#${tag}`).join(" ")} #AI #程序员 #效率工具`,
  ].join("\n");
}

const exporters = {
  wechat: buildWechatDraft,
  xiaohongshu: buildXiaohongshuDraft,
  douyin: buildDouyinDraft,
};

function generateDrafts() {
  const article = getArticleFromForm();
  const parsed = splitMarkdown(article.body);

  state.drafts = Object.fromEntries(
    Object.entries(state.templates).map(([platform, template]) => [
      platform,
      exporters[platform](article, template, parsed),
    ]),
  );

  renderOutputs();
  elements.status.textContent = `已生成 ${Object.keys(state.drafts).length} 个平台草稿。`;
}

function renderPresetOptions() {
  elements.platformSelect.innerHTML = Object.entries(state.templates)
    .map(([key, template]) => `<option value="${key}">${template.label}</option>`)
    .join("");
  elements.platformSelect.value = state.selectedPlatform;
  loadSelectedTemplateForm();
}

function renderPresetList() {
  elements.presetList.innerHTML = Object.values(state.templates)
    .map(
      (template) => `<article class="preset-card">
  <h3>${template.label}</h3>
  <dl>
    <dt>风格</dt><dd>${template.style}</dd>
    <dt>标题</dt><dd>${template.titleRule}</dd>
    <dt>摘要</dt><dd>${template.summaryRule}</dd>
    <dt>标签</dt><dd>${template.tagRule}</dd>
    <dt>代码</dt><dd>${template.codeRule}</dd>
    <dt>图片</dt><dd>${template.imageRatio}</dd>
    <dt>扩展</dt><dd>${template.extensionPoint}</dd>
  </dl>
</article>`,
    )
    .join("");
}

function loadSelectedTemplateForm() {
  const template = state.templates[state.selectedPlatform];
  elements.presetStyle.value = template.style;
  elements.presetTitleRule.value = template.titleRule;
  elements.presetSummaryRule.value = template.summaryRule;
  elements.presetTagRule.value = template.tagRule;
  elements.presetCodeRule.value = template.codeRule;
  elements.presetImageRatio.value = template.imageRatio;
}

function renderOutputs() {
  elements.outputCards.innerHTML = Object.entries(state.templates)
    .map(([platform, template]) => {
      const draft = state.drafts[platform] || "点击“一键生成三平台草稿”后显示。";
      return `<article class="output-card">
  <div class="output-header">
    <h3>${template.label}</h3>
    <p>${template.exportName}</p>
  </div>
  <div class="output-meta">
    <span>排版风格：${template.style}</span>
    <span>代码处理：${template.codeRule}</span>
    <span>图片建议：${template.imageRatio}</span>
  </div>
  <pre class="output-content" id="output-${platform}">${escapeHtml(draft)}</pre>
  <div class="output-actions">
    <button class="copy-button" type="button" data-platform="${platform}">复制草稿</button>
  </div>
</article>`;
    })
    .join("");
}

async function copyDraft(platform) {
  const template = state.templates[platform];
  const draft = state.drafts[platform];

  if (!draft) {
    elements.status.textContent = `请先生成 ${template.label} 草稿。`;
    return;
  }

  await navigator.clipboard.writeText(draft);
  elements.status.textContent = `${template.label} ${template.exportName} 已复制。`;
}

elements.loadSample.addEventListener("click", () => {
  setArticleForm(sampleArticle);
  generateDrafts();
});

elements.generateAll.addEventListener("click", generateDrafts);

elements.platformSelect.addEventListener("change", (event) => {
  state.selectedPlatform = event.target.value;
  loadSelectedTemplateForm();
});

elements.presetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const template = state.templates[state.selectedPlatform];
  state.templates[state.selectedPlatform] = {
    ...template,
    style: elements.presetStyle.value.trim(),
    titleRule: elements.presetTitleRule.value.trim(),
    summaryRule: elements.presetSummaryRule.value.trim(),
    tagRule: elements.presetTagRule.value.trim(),
    codeRule: elements.presetCodeRule.value.trim(),
    imageRatio: elements.presetImageRatio.value.trim(),
  };
  renderPresetList();
  generateDrafts();
  elements.status.textContent = `${template.label} 模板字段已保存，并重新生成草稿。`;
});

elements.outputCards.addEventListener("click", (event) => {
  const button = event.target.closest("[data-platform]");
  if (button) {
    copyDraft(button.dataset.platform);
  }
});

setArticleForm(sampleArticle);
renderPresetOptions();
renderPresetList();
generateDrafts();
