export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { answer, type } = req.body;
  if (!answer) return res.status(400).json({ error: 'Missing answer' });

  // type: 'category' = 简单模式开场分类提示, 'clue' = 一般模式30次后线索
  const prompt = type === 'category'
    ? `给我这个词的【大分类】，用一句话说明，不超过10字，不能说出这个词本身或同义词。例如：这是一种植物、这是一种情绪、这是一个动作。只输出这句话。词：${answer}`
    : `给我一个关于这个词的隐晦提示，不超过20字，不能直接说出这个词或同义词，但要让人能联想到。只输出提示句。词：${answer}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 60,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  const data = await response.json();
  const hint = data?.choices?.[0]?.message?.content?.trim() ?? '继续加油';
  return res.status(200).json({ hint });
}
