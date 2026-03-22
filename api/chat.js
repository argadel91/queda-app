export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, lang = 'es', context = '' } = req.body || {};
  if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'API key not configured' });

  const systemPrompt = `You are the AI assistant for queda., a group plan coordination app. Your name is "queda AI".

Your job:
- Help users plan events: suggest restaurants, bars, activities, routes
- Answer questions about how the app works
- Give recommendations based on location, budget, group size
- Be friendly, concise, and helpful
- Respond in the same language the user writes in (default: ${lang})
- Keep responses short (2-3 sentences max unless the user asks for more detail)
- Use emojis sparingly, match the app's style

Context about the current plan (if available): ${context}

You do NOT have access to create or modify plans. You can only suggest and advise.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\nUser: ' + message }] }
          ],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
}
