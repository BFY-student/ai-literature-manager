import React, { useState, useEffect } from 'react';
import { extractPdfData } from '../lib/pdfUtils';

const LOCAL_STORAGE_KEY = 'ai_lit_manager_data';

const LiteratureTable = () => {
  // --- 1. 状态管理 ---
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
    localBaseUrl: 'http://localhost:11434/v1/chat/completions',
    localModel: 'llama3',
  });
  
  const [showSettings, setShowSettings] = useState(!initialState.config?.apiKey);

  const defaultColumns = [
    { id: 'citation', title: '基本信息', prompt: '请生成标准的 APA 格式引文。请用中文回答，不要使用Markdown格式，仅纯文本。' },
    { id: 'researchObject', title: '研究对象', prompt: '这篇论文的主要研究对象、数据集或核心问题是什么？请用中文回答，不要使用Markdown格式，简练概括。' },
    { id: 'keyFindings', title: '核心发现', prompt: '用一句话总结这篇论文最重要的研究发现。请用中文回答，不要使用Markdown格式。' },
  ];

  const [columns, setColumns] = useState(initialState.columns || defaultColumns);
  const [rows, setRows] = useState(initialState.rows || []);
  const [loading, setLoading] = useState(false);

  // --- 2. 自动保存 ---
  useEffect(() => {
    // 这里我们只保存文本数据，完全不用担心 5MB 限制了
    const dataToSave = { config, columns, rows };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [config, columns, rows]);

  // --- 3. AI 逻辑 ---
  const callAiApi = async (prompt, contextText) => {
    const systemInstruction = "请务必使用中文回答。直接输出纯文本内容，严禁使用Markdown格式。";
    const fullPrompt = `Context:\n${contextText.slice(0, 30000)}\n\n---\nSystem Requirement: ${systemInstruction}\nTask: ${prompt}`;

    console.log(`[Mode: ${config.provider}] Sending request...`);

    // Google Mode
    if (config.provider === 'google') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.googleModel}:generateContent?key=${config.apiKey}`;
      const payload = { contents: [{ parts: [{ text: fullPrompt }] }] };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Google API Error: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    } 
    
    // OpenAI / Local Mode
    else {
      let targetUrl = config.provider === 'local' ? config.localBaseUrl : config.openaiBaseUrl;
      let targetModel = config.provider === 'local' ? config.localModel : config.openaiModel;

      const messages = [
        { role: 'system', content: 'You are a helpful assistant. Answer in Chinese. No Markdown.' },
        { role: 'user', content: fullPrompt }
      ];

      const headers = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: targetModel,
          messages: messages,
          temperature: 0.3
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response';
    }
  };

  // --- 4. 交互处理 ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    if (config.provider !== 'local' && !config.apiKey) { 
        alert("Please enter your API Key first."); return; 
    }

    setLoading(true);
    const newRowId = Date.now();
    
    // 不再初始化 thumbnail 字段，改为 fileName
    const initialRow = { id: newRowId, fileName: file.name, pdfText: '' };
    columns.forEach(col => initialRow[col.id] = '解析中...');
    setRows(prev => [...prev, initialRow]);

    try {
      // 这里的 extractPdfData 依然会返回 thumbnail，但我们在解构时直接忽略它
      const { text } = await extractPdfData(file);
      
      setRows(prev => prev.map(row => 
        row.id === newRowId ? { 
          ...row, 
          pdfText: text, 
          ...Object.fromEntries(columns.map(c => [c.id, '等待分析...'])) 
        } : row
      ));

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

  const handleAddColumn = () => {
    const name = prompt("请输入新列的标题 (例如: '研究方法')");
    if (!name) return;
    const newColId = `col_${Date.now()}`;
    const newCol = { id: newColId, title: name, prompt: `请分析这篇论文的${name}。请用中文回答，不要使用Markdown格式。` };
    setColumns(prev => [...prev, newCol]);
    rows.forEach(row => { if(row.pdfText) regenerateCell(row.id, newColId); });
  };

  const handleDeleteRow = (id) => {
    if (window.confirm("确定要删除这条文献记录吗？")) setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleDeleteColumn = (colId) => {
    if(window.confirm("确定要删除这一列吗？")) setColumns(prev => prev.filter(c => c.id !== colId));
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', fontFamily: '-apple-system, sans-serif', color: '#333' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>📑 AI 文献管理工具</h1>
        <button 
            onClick={() => setShowSettings(!showSettings)}
            style={{ padding: '8px 16px', background: '#f1f3f5', border: '1px solid #dee2e6', borderRadius: '6px', cursor: 'pointer' }}
        >
            {showSettings ? '收起设置' : '⚙️ 设置 API'}
        </button>
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
              <option value="openai">OpenAI / Commercial Proxy</option>
              <option value="google">Google Gemini</option>
              <option value="local">Local AI / Custom (Ollama, LM Studio)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>
                API Key {config.provider === 'local' && '(可选)'}
              </label>
              <input 
                type="password" 
                value={config.apiKey} 
                onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                placeholder={config.provider === 'google' ? "AIza..." : "sk-..."}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
              />
            </div>

            {config.provider === 'openai' && (
              <div>
                 <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>OpenAI Model</label>
                 <input 
                  type="text" 
                  value={config.openaiModel} 
                  onChange={(e) => setConfig({...config, openaiModel: e.target.value})}
                  placeholder="gpt-4o-mini"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>
            )}

            {config.provider === 'google' && (
              <div>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Google Model</label>
                <input 
                  type="text" 
                  value={config.googleModel} 
                  onChange={(e) => setConfig({...config, googleModel: e.target.value})}
                  placeholder="gemini-1.5-flash"
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                />
              </div>
            )}

            {config.provider === 'local' && (
              <>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Local Base URL</label>
                  <input 
                    type="text" 
                    value={config.localBaseUrl} 
                    onChange={(e) => setConfig({...config, localBaseUrl: e.target.value})}
                    placeholder="http://localhost:11434/v1/chat/completions"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: '600', display: 'block', marginBottom: '6px', fontSize: '13px' }}>Local Model Name</label>
                  <input 
                    type="text" 
                    value={config.localModel} 
                    onChange={(e) => setConfig({...config, localModel: e.target.value})}
                    placeholder="llama3"
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                  />
                </div>
              </>
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
          disabled={loading || (config.provider !== 'local' && !config.apiKey)}
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
                display: 'inline-flex', alignItems: 'center', fontWeight: '500', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
        >
          {loading ? '📄 处理中...' : '➕ 上传新文献 (PDF)'}
        </label>
      </div>

      {/* Main Table */}
      <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #dee2e6', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              {/* 改为了文件名列 */}
              <th style={{ padding: '12px 16px', textAlign: 'left', width: '150px' }}>文献文件</th>
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
                           style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid #ced4da', borderRadius: '3px', width: '100%', color: '#666' }}
                        />
                    </div>
                    <button onClick={() => handleDeleteColumn(col.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#adb5bd', fontSize: '16px' }}>×</button>
                  </div>
                </th>
              ))}
              <th style={{ padding: '12px', textAlign: 'center', width: '60px' }}>
                <button onClick={handleAddColumn} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px dashed #adb5bd', background: 'white', cursor: 'pointer', color: '#228be6', fontSize: '18px' }}>+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
                <tr><td colSpan={columns.length + 2} style={{ padding: '60px', textAlign: 'center', color: '#adb5bd' }}>暂无数据，请上传 PDF 文献</td></tr>
            ) : rows.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                {/* 文件名列 */}
                <td style={{ padding: '16px', fontSize: '13px', color: '#495057', fontWeight: '500', wordBreak: 'break-word' }}>
                  📄 {row.fileName || "Unknown PDF"}
                </td>
                {columns.map(col => (
                  <td key={col.id} style={{ padding: '16px', verticalAlign: 'top', fontSize: '14px', lineHeight: '1.6', color: '#212529' }}>
                    <div onDoubleClick={() => regenerateCell(row.id, col.id)} style={{ whiteSpace: 'pre-wrap', cursor: 'text' }}>{row[col.id]}</div>
                  </td>
                ))}
                <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleDeleteRow(row.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.5 }}>🗑️</button>
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
