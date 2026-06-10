export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { guess, target } = req.body;
  if (!guess || !target) return res.status(400).json({ error: 'Missing params' });
  if (guess === target) return res.status(200).json({ score: 100 });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 10,
      messages: [
        {
          role: 'system',
          content: '你是语义关联度计算器。输入两个中文词，只输出0-100的整数表示语义关联度。100=同义，80-99=强关联，50-79=中等，20-49=弱，0-19=无关。只输出数字，不要任何其他内容。'
        },
        { role: 'user', content: `${guess} ${target}` }
      ],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim() ?? '0';
  const score = Math.min(100, Math.max(0, parseInt(text) || 0));
  return res.status(200).json({ score });
}
