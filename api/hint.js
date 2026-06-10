export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { answer } = req.body;
  if (!answer) return res.status(400).json({ error: 'Missing answer' });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 60,
      messages: [
        {
          role: 'system',
          content: '你是一个猜词游戏的提示生成器。给你一个词，生成一句不超过20字的隐晦提示，不能直接说出这个词或其同义词，但要让人能联想到。只输出提示句，不要任何解释。'
        },
        { role: 'user', content: answer }
      ],
    }),
  });

  const data = await response.json();
  const hint = data?.choices?.[0]?.message?.content?.trim() ?? '这个词与日常生活密切相关';
  return res.status(200).json({ hint });
}
