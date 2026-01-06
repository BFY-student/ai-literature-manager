# 📑 AI Literature Manager (AI 文献管理工具)

一个基于浏览器的、高度可定制的 AI 文献阅读与管理工具。它运行在纯前端环境中，保护你的隐私，支持自定义 Prompt 以提取特定的研究信息。

<img width="1494" height="794" alt="截屏2026-01-06 11 26 16 (1)" src="https://github.com/user-attachments/assets/81aa6d66-f579-4037-97c8-2560579e8528" />


## ✨ 主要功能

*   **本地 PDF 处理**：直接在浏览器解析 PDF，提取文本和缩略图（文件不上传服务器）。
*   **AI 智能提取**：自定义表格列（如“研究发现”、“方法论”），AI 自动填表。
*   **多模型支持**：支持 OpenAI (GPT-4o) 和 Google Gemini (Flash/Pro) 等模型。
*   **数据持久化**：自动保存 API Key、Prompt 设置和已分析的文献记录到本地浏览器，刷新不丢失。
*   **高度可定制**：随时添加/删除列，修改 Prompt，双击单元格重新生成。

## 🛠 环境条件 (Prerequisites)

要运行或开发此项目，你需要满足以下环境要求：

1.  **操作系统**：Windows, macOS, 或 Linux 均可。
2.  **Node.js**：需要安装 Node.js 环境（建议版本 **v18.0.0** 或更高）。
    *   [下载 Node.js](https://nodejs.org/)
3.  **浏览器**：建议使用 Chrome, Edge, Firefox 或 Safari 的最新版本。
4.  **API Key**：你需要拥有以下任一服务的 API Key：
    *   **Google Gemini** (推荐，免费额度高): [获取 Key](https://aistudio.google.com/app/apikey)
    *   **OpenAI** (或兼容接口，如 DeepSeek): 需要有效的 `sk-...` Key。

## 🚀 快速开始 (Installation & Usage)

### 1. 安装依赖

打开终端，进入项目目录并运行：
```bash
git clone https://github.com/BFY-student/ai-literature-manager.git
cd ai-literature-manager
npm install
```

### 2. 启动项目

```bash
npm run dev
```

启动后，终端会显示本地访问地址。(通常是: http://localhost:5173
)在浏览器中打开该地址即可。

### 3. 使用方法
（1）配置 API：
* 点击右上角的 "⚙️ 设置 API"。
* 选择服务商（推荐 Google Gemini）。
* 填入你的 API Key。
* 设置完成后，配置会自动保存。

（2）上传文献：
* 点击 "➕ 上传新文献 (PDF)" 按钮。
* 选择本地的 PDF 论文文件。
* 系统会自动解析并开始填写表格。

（3）自定义分析：
* 添加列：点击表头最右侧的 + 号，输入你想分析的维度（例如：“不足之处”）。
* 修改 Prompt：直接在表头的输入框中修改 Prompt，下次分析时生效。
* 重新生成：对不满意的单元格，双击内容即可让 AI 重新生成。

（4）删除数据：
* 点击行末的垃圾桶图标删除单条记录。

### 🔒 隐私说明
本项目是一个 纯前端应用 (Client-side App)。
* 你的 PDF 文件仅在本地浏览器中通过 pdf.js 解析，不会上传到任何服务器。
* 只有从 PDF 中提取的纯文本内容会被发送给 AI 服务商（Google/OpenAI）进行分析。
* 你的 API Key 仅存储在本地浏览器的 localStorage 中。
