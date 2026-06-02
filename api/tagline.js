// api/tagline.js — Vercel Serverless Function  
// Generates smart taglines using Claude API
// No rate limit on tagline (fast, cheap, small output)

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { system, messages } = req.body;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Fallback to Gemini if no Claude key
  if (!apiKey) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) return res.status(500).json({ error: 'No API key configured.' });

    try {
      const userMsg = messages?.[0]?.content || '';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: system + '\n\n' + userMsg }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 80 }
          })
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.json({ content: [{ text }] });
    } catch (err) {
      return res.status(500).json({ error: 'Tagline generation failed.' });
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        system: system || 'Generate a tagline.',
        messages: messages || []
      })
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error('Tagline error:', err);
    res.status(500).json({ error: 'Tagline generation failed.' });
  }
};
