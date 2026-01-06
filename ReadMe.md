# 📑 AI Literature Manager (AI 文献管理工具)

一个基于浏览器的、高度可定制的 AI 文献阅读与管理工具。它运行在纯前端环境中，保护你的隐私，支持自定义 Prompt 以提取特定的研究信息。

![Project Screenshot](https://via.placeholder.com/800x400?text=Screenshot+Here) 
*(建议后续截图你的工具界面并替换此链接)*

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
