import * as pdfjsLib from 'pdfjs-dist';

// 修复后的代码
// 我们使用 unpkg CDN，并明确指向 .mjs 版本（新版 pdfjs-dist 的标准）
// 如果无法获取版本号，就默认使用一个兼容的稳定版本 (4.x)
const pdfjsVersion = pdfjsLib.version || '4.0.189';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

export async function extractPdfData(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    
    // 1. 提取全文 (用于发给 AI)
    // 为了节省 Token，你可以限制提取的页数，比如只提取前 5 页
    const maxPages = Math.min(pdf.numPages, 10); 
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    // 2. 生成首页缩略图
    let thumbnail = null;
    if (pdf.numPages > 0) {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 }); // 缩略图不需要太高清
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;
      thumbnail = canvas.toDataURL('image/png');
    }

    return { text: fullText.trim(), thumbnail };

  } catch (error) {
    console.error('Error extracting PDF data:', error);
    throw new Error('Failed to process PDF file.');
  }
}
