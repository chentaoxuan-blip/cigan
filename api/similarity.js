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
          content: `你是猜词游戏的语义联想评分器。

规则：先分析目标词的所有核心属性（颜色、味道、形状、类别、用途、场景、季节等），再判断猜测词与这些属性的重叠程度来打分。

例子（目标词=西瓜）：
西瓜的属性：红色果肉、绿色外皮、甜、多汁、夏天、水果、圆形、大、有籽
- 红色→85（西瓜最明显的颜色特征）
- 甜蜜→88（西瓜的核心味道）
- 水果→82（西瓜的类别）
- 苹果→75（同是甜的红色水果）
- 番茄→70（同是红色圆形食物）
- 黄瓜→72（同是瓜类蔬菜）
- 夏天→80（西瓜的季节）
- 雪糕→65（同是夏天吃的甜食）
- 绿色→78（西瓜外皮颜色）
- 植物→55（大类别）
- 圆形→60（形状）
- 桌子→5（无关）

评分要拉开差距，属性重叠越多分越高，完全无关给0-10分。

【isSynonym】只有"同一事物不同名称"才为true（番茄/西红柿、手机/手提电话），类别词、属性词、相关词一律false。

返回JSON：{"score": 数字, "isSynonym": 布尔值}，只输出JSON。`
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
