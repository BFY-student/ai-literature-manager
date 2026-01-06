export async function fetchAnalysis(apiKey, prompt, contextText, model = 'grok-4.1-fast') {
  if (!apiKey) throw new Error('API Key is required');

  // 注意：如果是 Anthropic 或其他服务，需要修改此 endpoint
  const endpoint = 'https://zenmux.ai/api/v1';
  
  // 截断文本以防止超出 Token 限制 (粗略估计：1字符 ~= 0.5 token, 限制在 30k 字符左右)
  const truncatedContext = contextText.slice(0, 30000);

  const messages = [
    {
      role: 'system',
      content: 'You are a helpful academic research assistant. Analyze the provided literature text strictly based on the user prompt.'
    },
    {
      role: 'user',
      content: `Context (Paper content):\n${truncatedContext}\n\n---\nTask: ${prompt}`
    }
  ];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.3, // 较低温度以获得更准确的提取结果
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || 'No response';
}
