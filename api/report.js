// FILE 2: api/report.js
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { system, prompt } = req.body;

  try {
    const res = await fetch('/api/chat', {   // relative URL - same domain
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemPrompt: systemPrompt,
    messages: messages
  })
});
const d = await res.json();
const reply = d.reply;
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No report generated.';
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
