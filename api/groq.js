// api/groq.js - Vercel Serverless Function
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system, max_tokens = 1000 } = req.body;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, // ✅ Secure - GitHub/Vercel secret
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens,
        messages: system
          ? [{ role: 'system', content: system }, ...messages]
          : messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Backend error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
