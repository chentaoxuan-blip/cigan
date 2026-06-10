export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { guess, target } = req.body;
  if (!guess || !target) return res.status(400).json({ error: 'Missing params' });
  if (guess === target) return res.status(200).json({ score: 100.00, isSynonym: true });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 30,
      messages: [
        {
          role: 'system',
          content: `你是猜词游戏的语义联想评分器。

规则：先分析目标词的所有核心属性（颜色、味道、形状、类别、用途、场景、季节等），再判断猜测词与这些属性的重叠程度来打分。

score必须是0.00到100.00之间的小数，精确到小数点后两位，要有区分度不要都是整数。

例子（目标词=西瓜）：
- 红色→85.30、甜蜜→88.72、水果→82.15、苹果→75.40、番茄→70.88
- 黄瓜→72.33、夏天→80.60、雪糕→65.20、绿色→78.45、植物→55.10
- 圆形→60.75、桌子→4.20

评分要拉开差距，属性重叠越多分越高，完全无关给0-10分。

【isSynonym】只有"同一事物不同名称"才为true（番茄/西红柿、手机/手提电话），类别词、属性词、相关词一律false。

返回JSON：{"score": 小数, "isSynonym": 布尔值}，只输出JSON。`
        },
        { role: 'user', content: `猜测词：${guess}，目标词：${target}` }
      ],
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.trim() ?? '{"score":0.00,"isSynonym":false}';
  try {
    const parsed = JSON.parse(text);
    const raw = parseFloat(parsed.score) || 0;
    const score = Math.round(Math.min(100, Math.max(0, raw)) * 100) / 100;
    const isSynonym = Boolean(parsed.isSynonym);
    return res.status(200).json({ score, isSynonym });
  } catch {
    const num = parseFloat(text);
    return res.status(200).json({ score: isNaN(num) ? 0 : Math.round(Math.min(100, Math.max(0, num)) * 100) / 100, isSynonym: false });
  }
}
