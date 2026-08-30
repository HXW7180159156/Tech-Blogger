# Tech Blogger MVP Demo

一个可本地运行的技术博客写作 APP 最小演示闭环：导入 Markdown、Word/富文本粘贴或 HTML 技术文章，转换为统一文章模型，编辑内容，执行离线模拟的 AI 辅助动作，并导出微信公众号、小红书、抖音三类平台稿件。

## 运行步骤

1. 在仓库根目录启动静态服务：

   ```bash
   python3 -m http.server 5173
   ```

2. 浏览器打开：

   ```text
   http://localhost:5173
   ```

3. 按页面中的演示流操作：
   - 点击“Markdown 示例”“Word 示例”“HTML 示例”导入三种内置示例。
   - 或通过格式下拉框选择 Markdown / Word / HTML 后粘贴内容。
   - 可导入 `.md`、`.markdown`、`.html`、`.htm`、`.txt` 示例文件。
   - 在编辑区调整标题与正文。
   - 使用“生成摘要”“优化标题”“生成平台改写”完成辅助处理。
   - 选择微信公众号 / 小红书 / 抖音模板并复制导出结果。

## 当前闭环

- 支持 Markdown、Word/富文本粘贴、HTML 三类输入适配器。
- 自动转换为统一文章模型：标题、摘要、正文结构块、代码块、图片占位和导入元数据。
- 自动识别标题、段落、列表、代码块、图片占位等基础结构并展示预览。
- 提供 3 个离线 AI 辅助动作，便于无 API key 环境下演示。
- 一键生成三类平台稿件：
  - 微信公众号：长文结构、导语、目录感、代码块保留。
  - 小红书：标题、短段落、要点、标签。
  - 抖音：口播脚本、分镜提示、结尾互动。
- 支持复制导出内容到剪贴板。

## 统一文章模型

导入适配器都会输出同一份浏览器内存中的 `ArticleDocument`：

```js
{
  title: "文章标题",
  summary: "摘要",
  blocks: [
    { type: "heading", level: 2, text: "章节" },
    { type: "paragraph", text: "正文段落" },
    { type: "list", items: ["要点"] },
    { type: "code", language: "js", code: "..." },
    { type: "image", alt: "图片说明", src: "..." }
  ],
  codeBlocks: [],
  images: [],
  metadata: {
    sourceFormat: "markdown | word | html",
    blockCount: 0,
    codeBlockCount: 0,
    imagePlaceholderCount: 0,
    warnings: []
  }
}
```

编辑预览、摘要/标题/平台改写和三平台导出都只消费这份统一模型，不再直接依赖原始输入格式。

## 导入失败与不支持内容策略

- 空内容：在导入状态区提示先粘贴或载入内容，并保持页面可继续操作。
- 未知文件类型：提示仅支持 `.md`、`.markdown`、`.html`、`.htm`、`.txt`，避免误判格式。
- `.doc` / `.docx`：当前静态 demo 不直接解压二进制 Word 文件；提示用户从 Word 复制正文粘贴，或另存为 HTML / TXT 后导入。
- Word 粘贴内容：支持普通文本、项目符号、`[代码]...[/代码]` 和 `[图片：说明]` 占位；如果粘贴的是 Word/富文本 HTML，则按 HTML 结构解析并记录 warning。

## 示例文件验证

仓库提供三类示例文件，可用于验证它们都会进入同一编辑/预览/导出流程：

- `examples/sample-article.md`
- `examples/sample-word.txt`
- `examples/sample-article.html`

验证步骤：

1. 启动本地服务并打开页面。
2. 分别点击三个内置示例按钮，确认导入状态显示来源格式、结构块数量、代码块数量和图片占位数量。
3. 分别导入 `examples/` 下的三个文件，确认结构化预览、摘要、平台改写和导出内容都能正常刷新。
4. 尝试导入 `.docx` 文件，确认页面给出“复制 Word 正文或另存为 HTML / TXT”的错误提示。

## 已知限制

- AI 能力为本地规则模拟，暂未接入真实模型 API。
- Markdown / Word / HTML 解析覆盖演示所需的标题、摘要、段落、列表、代码块和图片占位，不追求完整排版还原。
- 静态页面暂不直接解析二进制 `.doc/.docx`；上线版本可接入 `mammoth` 等解析库后进入同一模型。
- 不包含账号授权、平台自动发布、图片排版或视频生成。

## 下一步建议

1. 接入真实 LLM 服务，让摘要、标题和平台改写基于模型生成。
2. 增加真实 `.docx` 解析、拖拽上传和导出 `.md` 文件。
3. 引入持久化草稿、版本历史和更多平台模板。
