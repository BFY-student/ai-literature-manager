# 📑 AI Literature Manager (AI 文献管理工具)

A browser-based, highly customizable AI literature reading and management tool. **No installation required** - just open the HTML file and start using!

![AI Literature Manager](https://github.com/user-attachments/assets/81aa6d66-f579-4037-97c8-2560579e8528)

## ✨ Features

- 🚀 **Zero Installation**: Single HTML file, works offline (after first load)
- 📄 **Local PDF Processing**: Extract text directly in browser (no upload to servers)
- 🤖 **AI-Powered Analysis**: Automatically extract key information from papers
- 🔄 **Multi-Model Support**: OpenAI, Google Gemini, or Local AI (Ollama, LM Studio)
- 💾 **Auto-Save**: All data persists locally in browser storage
- 🎨 **Fully Customizable**: Add columns, edit prompts, regenerate any cell
- 🔒 **Privacy First**: All PDF processing happens locally, only text sent to AI

## 🚀 Quick Start (3 Steps)

1. **Download**: Download `standalone.html` from this repository
2. **Open**: Double-click the file to open in your browser
3. **Configure**: Click "⚙️ 设置 API", enter your API key, and upload PDFs!

That's it! No `npm install`, no build process, no servers.

## 🛠️ Requirements

- **Browser**: Chrome 61+, Firefox 60+, Safari 11+, or Edge 79+
- **API Key**: One of the following:
  - [Google Gemini](https://aistudio.google.com/app/apikey) (Free tier available)
  - [OpenAI](https://platform.openai.com/api-keys) (Paid)
  - Local AI (Ollama, LM Studio) - No key needed

## 📖 How to Use

### 1. Configure API Settings

Click the **"⚙️ 设置 API"** button and choose your AI provider:

**Option A: Google Gemini (Recommended - Free)**
- Select "Google Gemini"
- Get API key from: https://aistudio.google.com/app/apikey
- Paste your `AIza...` key
- Default model: `gemini-1.5-flash`

**Option B: OpenAI**
- Select "OpenAI / Commercial Proxy"
- Enter your `sk-...` API key
- Default model: `gpt-4o-mini`

**Option C: Local AI (100% Offline)**
- Install [Ollama](https://ollama.ai/) or [LM Studio](https://lmstudio.ai/)
- Select "Local AI / Custom"
- Configure Base URL (default: `http://localhost:11434/v1/chat/completions`)
- Enter model name (e.g., `llama3`, `mistral`)
- API key is optional

### 2. Upload PDFs

Click **"➕ 上传新文献 (PDF)"** and select a PDF file.

The tool will:
1. Extract text from the first 10 pages
2. Automatically analyze using default columns:
   - **基本信息** (Citation): APA format citation
   - **研究对象** (Research Object): Main research subject/dataset
   - **核心发现** (Key Findings): Most important research findings

### 3. Customize Your Analysis

**Add Custom Columns:**
- Click the **+** button in the table header
- Enter column name (e.g., "研究方法", "不足之处")
- AI will automatically analyze all existing papers for this new dimension

**Edit Prompts:**
- Each column has an editable prompt field in the header
- Modify the prompt to change how AI analyzes papers
- Changes are auto-saved

**Regenerate Cells:**
- Double-click any cell to regenerate its content
- Useful if you're not satisfied with the initial result

**Delete Data:**
- Click the 🗑️ icon to delete rows
- Click the × button to delete columns

## 🔒 Privacy & Security

This is a **pure client-side application**:

✅ **What stays local:**
- Your PDF files (processed entirely in browser)
- Your API keys (stored in browser localStorage only)
- All literature data and settings

⚠️ **What gets sent to AI providers:**
- Extracted text from PDFs (for analysis)
- Your custom prompts

🔐 **Best practices:**
- Don't use on public/shared computers (or clear browser data after)
- API keys are stored in plaintext in localStorage
- Only upload PDFs you're comfortable having analyzed by AI

## 💡 Tips & Tricks

### 1. Efficient Token Usage
The tool only extracts the first 10 pages of each PDF to save API costs. For most papers, this covers the abstract, introduction, and methodology - enough for comprehensive analysis.

### 2. Offline Usage
After the first load (when PDF.js is cached), you can:
- View and edit existing data offline
- Use Local AI for completely offline analysis

### 3. Data Backup
Your data is stored in browser localStorage. To backup:

```javascript
// Open browser console (F12) and run:
const data = localStorage.getItem('ai_lit_manager_data');
const blob = new Blob([data], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'literature_backup.json';
a.click();
```

### 4. Restore from Backup
```javascript
// Paste your backup data, then run in console:
localStorage.setItem('ai_lit_manager_data', 'YOUR_BACKUP_DATA_HERE');
location.reload();
```

## 🆚 Why This Tool?

| Feature | AI Lit Manager | Traditional Tools |
|---------|---------------|-------------------|
| Installation | ❌ None needed | ✅ Complex setup |
| Cost | 💰 Pay-per-use or free | 💰💰 Subscription |
| Privacy | 🔒 Local processing | ☁️ Cloud upload |
| Customization | ✅ Unlimited prompts | ⚠️ Fixed fields |
| AI Models | 🤖 Your choice | 🤖 Vendor lock-in |
| Offline | ✅ Yes (with Local AI) | ❌ No |

## 🔧 Technical Details

### File Structure
- **Single HTML file** (~24 KB)
- Embedded CSS styling
- Vanilla JavaScript (ES6+)
- PDF.js loaded from CDN (unpkg.com)

### Browser APIs Used
- **localStorage**: Data persistence
- **FileReader**: PDF file reading
- **Fetch API**: AI API calls
- **ES Modules**: PDF.js import

### Data Storage
All data is stored in localStorage under key `ai_lit_manager_data`:
```json
{
  "config": {
    "provider": "openai",
    "apiKey": "sk-...",
    "openaiModel": "gpt-4o-mini"
  },
  "columns": [
    {
      "id": "citation",
      "title": "基本信息",
      "prompt": "请生成标准的 APA 格式引文..."
    }
  ],
  "rows": [
    {
      "id": 1234567890,
      "fileName": "paper.pdf",
      "pdfText": "...",
      "citation": "Smith, J. (2024)..."
    }
  ]
}
```

## ❓ FAQ

### Q: Does this work without internet?
**A:** Partially. After first load (when PDF.js is cached):
- ✅ You can view/edit existing data offline
- ✅ You can use Local AI for completely offline analysis
- ❌ Cloud AI providers (OpenAI, Google) require internet

### Q: How much does it cost?
**A:** The tool is free. You only pay for AI API usage:
- **Google Gemini**: Free tier (60 requests/min)
- **OpenAI**: ~$0.15 per 1M tokens (GPT-4o-mini)
- **Local AI**: Free (runs on your computer)

### Q: What if I don't have an API key?
**A:** Use Local AI:
1. Install Ollama: `brew install ollama` (macOS) or download from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3`
3. Configure tool to use `http://localhost:11434/v1/chat/completions`

### Q: Can I analyze papers in other languages?
**A:** Yes! Edit the column prompts to request output in your preferred language. The default prompts request Chinese output, but you can change them.

### Q: How secure is my API key?
**A:** Your API key is stored in browser localStorage and never sent anywhere except directly to your chosen AI provider. However:
- It's stored in plaintext (browser limitation)
- Anyone with access to your computer can read it
- Use incognito mode or clear data on shared computers

### Q: What PDF formats are supported?
**A:** Standard PDF files with extractable text. Scanned PDFs (images) won't work well as the text extraction relies on embedded text content.

### Q: The AI response is in the wrong language!
**A:** Edit the column prompt in the table header. Add explicit language instructions like "请用英文回答" (answer in English) or "请用中文回答" (answer in Chinese).

## 🐛 Troubleshooting

### PDF upload fails
- ✅ Ensure PDF is not password-protected
- ✅ Check browser console (F12) for errors
- ✅ Try a different PDF file
- ✅ Verify internet connection (for first-time PDF.js load)

### API errors
- ✅ Verify API key is correct
- ✅ Check API provider status page
- ✅ Ensure you have available quota
- ✅ For Local AI, confirm service is running

### Data disappeared
- ✅ Check if you're in incognito/private mode (localStorage disabled)
- ✅ Verify you didn't clear browser data
- ✅ Check if localStorage is full (5MB limit)

### Slow performance
- ✅ Large PDFs (>50 pages) may be slow - only first 10 pages are processed
- ✅ Try closing other browser tabs
- ✅ Use a faster AI model (Gemini Flash, GPT-4o-mini)

## 🤝 Contributing

Found a bug or have a feature request?
- **Issues**: [GitHub Issues](https://github.com/BFY-student/ai-literature-manager/issues)
- **Pull Requests**: Welcome!

## 📜 License

MIT License - Free to use, modify, and distribute.

## 🙏 Acknowledgments

- **PDF.js** by Mozilla - PDF rendering engine
- **OpenAI, Google, Ollama** - AI providers
- **Community** - Thanks for using and improving this tool!

## 📞 Support

- **Documentation**: This README
- **Issues**: [Report bugs](https://github.com/BFY-student/ai-literature-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BFY-student/ai-literature-manager/discussions)

---

**Made with ❤️ for researchers who value privacy, customization, and simplicity.**

**⭐ Star this repo if you find it useful!**
