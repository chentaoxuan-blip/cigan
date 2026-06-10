export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { guess, target } = req.body;
  if (!guess || !target) return res.status(400).json({ error: 'Missing params' });
  if (guess === target) return res.status(200).json({ score: 100, isSynonym: true });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 30,
      messages: [
        {
          role: 'system',
          content: `你是猜词游戏的语义评分器。给定猜测词和目标词，返回JSON：{"score": 数字, "isSynonym": 布尔值}

【score评分标准】，目标是让玩家能感受到冷热变化，分布要拉开：
- 90-99：目标词的核心特征、最典型属性（西瓜→甜、西瓜→夏天、西瓜→红色果肉）
- 70-89：目标词的直接相关事物（西瓜→水果、西瓜→绿色、西瓜→种子）
- 50-69：目标词的场景或联想（西瓜→沙滩、西瓜→解渴、西瓜→农田）
- 30-49：间接联系（西瓜→植物、西瓜→食物、西瓜→夏季饮料）
- 10-29：很远的联系（西瓜→圆形、西瓜→绿色蔬菜类）
- 0-9：几乎无关

【isSynonym标准】只有"同一事物的不同名称"才为true：
- 番茄/西红柿 → true
- 西瓜/水果 → false（水果是类别）
- 西瓜/寒瓜 → true（西瓜的古称）
- 太阳/自然 → false
- 飞机/航班 → false
- 手机/手提电话 → true

只输出JSON，不要其他任何内容。`
        },
        { role: 'user', content: `猜测词：${guess}，目标词：${target}` }
      ],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim() ?? '{"score":0,"isSynonym":false}';
  try {
    const parsed = JSON.parse(text);
    const score = Math.min(100, Math.max(0, parseInt(parsed.score) || 0));
    const isSynonym = Boolean(parsed.isSynonym);
    return res.status(200).json({ score, isSynonym });
  } catch {
    const num = parseInt(text);
    return res.status(200).json({ score: isNaN(num) ? 0 : Math.min(100, Math.max(0, num)), isSynonym: false });
  }
}
