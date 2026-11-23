import express from 'express';
const app = express(), KEY = process.env.GROQ_API_KEY, API = 'https://api.groq.com/openai/v1';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public', { maxAge: '1h' }));

// tiny in-memory rate limit: 30 requests / minute / IP
const hits = new Map();
const limit = (req, res, next) => {
  const now = Date.now(), h = (hits.get(req.ip) || []).filter(t => now - t < 60000);
  if (h.length >= 30) return res.status(429).json({ error: 'Too many requests. Wait a minute and try again.' });
  h.push(now); hits.set(req.ip, h); next();
};

app.get('/health', (_, res) => res.send('ok'));

let modelCache = { t: 0, list: [] };
app.get('/api/models', async (_, res) => {
  if (!KEY) return res.json([DEFAULT_MODEL]);
  if (Date.now() - modelCache.t > 600000) {
    try {
      const r = await fetch(`${API}/models`, { headers: { Authorization: `Bearer ${KEY}` } });
      const j = await r.json();
      modelCache = { t: Date.now(), list: j.data.map(m => m.id).filter(id => !/whisper|guard|tts|playai/i.test(id)).sort() };
    } catch { /* keep old cache */ }
  }
  res.json(modelCache.list.length ? modelCache.list : [DEFAULT_MODEL]);
});

app.post('/api/chat', limit, async (req, res) => {
  if (!KEY) return res.status(500).json({ error: 'GROQ_API_KEY is not set on the server.' });
  const { messages, model, temperature } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'No messages sent.' });
  try {
    const r = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model || DEFAULT_MODEL, messages: messages.slice(-30), temperature: Math.min(Math.max(+temperature || 0.7, 0), 1.5), stream: true })
    });
    if (!r.ok) {
      let msg = 'Groq error ' + r.status;
      try { msg = (await r.json()).error.message; } catch {}
      return res.status(r.status).json({ error: msg });
    }
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
    for await (const chunk of r.body) res.write(chunk);
    res.end();
  } catch (e) {
    if (!res.headersSent) res.status(502).json({ error: 'Could not reach Groq.' }); else res.end();
  }
});

app.listen(process.env.PORT || 3000, () => console.log('Kiri is live'));
