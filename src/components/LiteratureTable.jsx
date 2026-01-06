import React, { useState, useEffect } from 'react';
import { extractPdfData } from '../lib/pdfUtils';

// --- 简单的本地存储封装 (使用 localStorage) ---
// 注意：localStorage 有 5MB 限制。如果存储大量 PDF 缩略图可能会满。
// 生产环境建议用 IndexedDB，但为了代码简洁，这里做了自动降级处理（只存最近的）。
const LOCAL_STORAGE_KEY = 'ai_lit_manager_data';

const LiteratureTable = () => {
  // --- 1. 状态管理与初始化 ---
  
  // 从本地存储加载初始状态
  const loadState = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load saved data", e);
    }
    return null;
  };

  const initialState = loadState() || {};

  const [config, setConfig] = useState(initialState.config || {
    provider: 'openai',
    apiKey: '',
    openaiBaseUrl: 'https://api.openai.com/v1/chat/completions',
    openaiModel: 'gpt-4o-mini',
    googleModel: 'gemini-1.5-flash',
  });
  
  const [showSettings, setShowSettings] = useState(!initialState.config?.apiKey); // 如果有Key默认折叠

  // 默认列定义：增加了"翻译成中文"和"无格式"的要求
  const defaultColumns = [
    { id: 'citation', title: '基本信息', prompt: '请生成标准的 APA 格式引文。请用中文回答，不要使用Markdown格式，仅纯文本。' },
    { id: 'researchObject', title: '研究对象', prompt: '这篇论文的主要研究对象、数据集或核心问题是什么？请用中文回答，不要使用Markdown格式，简练概括。' },
    { id: 'keyFindings', title: '核心发现', prompt: '用一句话总结这篇论文最重要的研究发现。请用中文回答，不要使用Markdown格式。' },
  ];

  const [columns, setColumns] = useState(initialState.columns || defaultColumns);
  const [rows, setRows] = useState(initialState.rows || []);
  const [loading, setLoading] = useState(false);

  // --- 2. 自动保存逻辑 (Effect) ---
  useEffect(() => {
    const dataToSave = {
      config,
      columns,
      rows: rows.map(r => ({
        ...r,
        // 为了防止 localStorage 溢出，我们可以选择性地不保存过大的字段
        // 但为了体验，我们先尝试保存所有。如果遇到 QuotaExceededError 再处理。
      }))
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert("本地存储空间已满，旧的文献缩略图可能无法保存。建议清理一些旧条目。");
      }
    }
  }, [config, columns, rows]);

  // --- 3. AI 核心逻辑 ---
  const callAiApi = async (prompt, contextText) => {
    // 强制添加系统级指令：中文、无格式
    const systemInstruction = "请务必使用中文回答。直接输出纯文本内容，严禁使用Markdown格式（如**加粗**、*斜体*、# 标题等）。";
    const fullPrompt = `Context:\n${contextText.slice(0, 30000)}\n\n---\nSystem Requirement: ${systemInstruction}\nTask: ${prompt}`;

    console.log(`[Mode: ${config.provider}] Sending request...`);

    if (config.provider === 'google') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.googleModel}:generateContent?key=${config.apiKey}`;
      const payload = { contents: [{ parts: [{ text: fullPrompt }] }] };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Google API Error: ${response.status}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    } else {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant. Answer in Chinese. No Markdown.' },
        { role: 'user', content: fullPrompt }
      ];

      const response = await fetch(config.openaiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.openaiModel,
          messages: messages,
          temperature: 0.3,
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response';
    }
  };

  // --- 4. 交互处理函数 ---
  
  // 上传并分析
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!config.apiKey) { alert("Please enter your API Key first."); return; }

    setLoading(true);
    const newRowId = Date.now();
    
    // 初始化新行，保存提取后的文本(pdfText)以便后续重新分析
    const initialRow = { id: newRowId, pdfText: '', thumbnail: null };
    columns.forEach(col => initialRow[col.id] = '解析中...');
    setRows(prev => [...prev, initialRow]);

    try {
      const { text, thumbnail } = await extractPdfData(file);
      
      // 更新该行的文本和缩略图
      setRows(prev => prev.map(row => 
        row.id === newRowId ? { 
          ...row, 
          pdfText: text, // 保存文本！
          thumbnail, 
          ...Object.fromEntries(columns.map(c => [c.id, '等待分析...'])) 
        } : row
      ));

      // 逐列分析
      for (const col of columns) {
        setRows(prev => prev.map(row => row.id === newRowId ? { ...row, [col.id]: '分析中...' } : row));
        try {
          const result = await callAiApi(col.prompt, text);
          setRows(prev => prev.map(row => row.id === newRowId ? { ...row, [col.id]: result } : row));
        } catch (err) {
          setRows(prev => prev.map(row => row.id === newRowId ? { ...row, [col.id]: `❌ ${err.message}` } : row));
        }
      }
    } catch (error) {
      console.error(error);
      alert(`Error: ${error.message}`);
      setRows(prev => prev.filter(r => r.id !== newRowId));
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  // 重新生成某一格 (点击单元格时触发，或添加新列后自动触发)
  const regenerateCell = async (rowId, colId) => {
    const row = rows.find(r => r.id === rowId);
    const col = columns.find(c => c.id === colId);
    if (!row || !col || !row.pdfText) return;

    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colId]: '刷新中...' } : r));
    try {
      const result = await callAiApi(col.prompt, row.pdfText);
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colId]: result } : r));
    } catch (err) {
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, [colId]: `Error: ${err.message}` } : r));
    }
  };

  // 添加新列
  const handleAddColumn = () => {
    const name = prompt("请输入新列的标题 (例如: '研究方法', '不足之处')");
    if (!name) return;
    
    const newColId = `col_${Date.now()}`;
    const newCol = { 
      id: newColId, 
      title: name, 
      prompt: `请分析这篇论文的${name}。请用中文回答，不要使用Markdown格式。` 
    };
    
    setColumns(prev => [...prev, newCol]);
    
    // 自动为所有已存在的行生成这一列的内容
    rows.forEach(row => {
        if(row.pdfText) regenerateCell(row.id, newColId);
    });
  };

  // 删除行
  const handleDeleteRow = (id) => {
    if (window.confirm("确定要删除这条文献记录吗？")) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  };

  // 删除列 (可选功能)
  const handleDeleteColumn = (colId) => {
      if(window.confirm("确定要删除这一列吗？")) {
          setColumns(prev => prev.filter(c => c.id !== colId));
      }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', color: '#333' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📑 AI 文献管理工具
        </h1>
        <div style={{display: 'flex', gap: '10px'}}>
             <button 
                onClick={() => setShowSettings(!showSettings)}
                style={{ padding: '8px 16px', background: '#f1f3f5', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
            >
                {showSettings ? '收起设置' : '⚙️ 设置 API'}
            </button>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e9ecef' }}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', marginRight: '10px' }}>AI 服务商:</label>
            <select 
              value={config.provider}
              onChange={(e) => setConfig({...config, provider: e.target.value})}
              style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ced4da' }}
            >
              <option value="openai">OpenAI / 国内中转 (DeepSeek 等)</option>
              <option value="google">Google Gemini</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>API Key</label>
              <input 
                type="password" 
                value={config.apiKey} 
                onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                placeholder={config.provider === 'google' ? "AIza..." : "sk-..."}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            {config.provider === 'openai' ? (
              <div>
                 <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>模型名称</label>
                 <input 
                  type="text" 
                  value={config.openaiModel} 
                  onChange={(e) => setConfig({...config, openaiModel: e.target.value})}
                  placeholder="gpt-4o-mini"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>
            ) : (
              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Google 模型</label>
                <input 
                  type="text" 
                  value={config.googleModel} 
                  onChange={(e) => setConfig({...config, googleModel: e.target.value})}
                  placeholder="gemini-1.5-flash"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          id="file-upload"
          accept="application/pdf" 
          onChange={handleFileUpload} 
          disabled={loading || !config.apiKey}
          style={{ display: 'none' }}
        />
        <label 
            htmlFor="file-upload" 
            style={{ 
                cursor: loading ? 'not-allowed' : 'pointer', 
                padding: '10px 24px', 
                background: loading ? '#6c757d' : '#228be6', 
                color: 'white', 
                borderRadius: '6px', 
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
        >
          {loading ? '📄 处理中...' : '➕ 上传新文献 (PDF)'}
        </label>
        {!config.apiKey && <span style={{ color: '#e03131', marginLeft: '15px', fontSize: '14px' }}>⚠️ 请先配置 API Key</span>}
      </div>

      {/* Main Table */}
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #dee2e6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', width: '90px' }}>封面</th>
              {columns.map(col => (
                <th key={col.id} style={{ padding: '12px 16px', textAlign: 'left', width: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ width: '90%' }}>
                        <div style={{fontWeight: '600', color: '#495057', marginBottom: '4px'}}>{col.title}</div>
                        <input 
                           type="text" 
                           value={col.prompt}
                           onChange={(e) => {
                             const newCols = columns.map(c => c.id === col.id ? {...c, prompt: e.target.value} : c);
                             setColumns(newCols);
                           }}
                           placeholder="输入 Prompt..."
                           style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid #ced4da', borderRadius: '3px', width: '100%', color: '#666' }}
                           title="修改此列的 Prompt"
                        />
                    </div>
                    <button 
                        onClick={() => handleDeleteColumn(col.id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#adb5bd', fontSize: '16px', padding: '0 0 0 5px' }}
                        title="删除列"
                    >
                        ×
                    </button>
                  </div>
                </th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', width: '60px', verticalAlign: 'middle' }}>
                <button 
                    onClick={handleAddColumn}
                    style={{ 
                        width: '30px', height: '30px', borderRadius: '50%', border: '1px dashed #adb5bd', 
                        background: 'white', cursor: 'pointer', color: '#228be6', fontSize: '18px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    title="添加新列"
                >
                    +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
                <tr>
                    <td colSpan={columns.length + 2} style={{ padding: '60px', textAlign: 'center', color: '#adb5bd' }}>
                        暂无数据，请上传 PDF 文献
                    </td>
                </tr>
            ) : rows.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                <td style={{ padding: '16px' }}>
                  {row.thumbnail ? (
                    <img src={row.thumbnail} alt="Cover" style={{ width: '70px', borderRadius: '4px', border: '1px solid #dee2e6', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} />
                  ) : (
                    <div style={{ width: '70px', height: '100px', background: '#f8f9fa', borderRadius: '4px' }} />
                  )}
                </td>
                {columns.map(col => (
                  <td key={col.id} style={{ padding: '16px', verticalAlign: 'top', fontSize: '14px', lineHeight: '1.6', color: '#212529', position: 'relative' }}>
                    <div 
                        title="双击重新生成"
                        onDoubleClick={() => regenerateCell(row.id, col.id)}
                        style={{ whiteSpace: 'pre-wrap', cursor: 'text' }}
                    >
                        {row[col.id]}
                    </div>
                  </td>
                ))}
                <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <button 
                        onClick={() => handleDeleteRow(row.id)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.5, transition: 'opacity 0.2s' }}
                        title="删除此行"
                        onMouseOver={(e) => e.target.style.opacity = 1}
                        onMouseOut={(e) => e.target.style.opacity = 0.5}
                    >
                        🗑️
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiteratureTable;
