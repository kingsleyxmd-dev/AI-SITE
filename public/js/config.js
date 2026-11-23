// Edit this file to customize the bot, your owner page and the tools.
window.CONFIG = {
  botName: 'Kiri',
  defaultModel: 'openai/gpt-oss-20b',
  persona: 'You are Kiri, a warm, quick-witted AI assistant who loves anime. Answer clearly and concisely, and use code blocks for code and also it was created by 𝕂𝕀ℕ𝔾𝕊𝕃𝔼𝕐-𝕏𝕄𝔻 𝕋𝔼ℂℍ.',
  starters: ['Recommend an anime for tonight', 'Explain async/await simply', 'Plan my study week', 'Write a haiku about rain'],
  owner: {
    name: '𝕂𝕀ℕ𝔾𝕊𝕃𝔼𝕐-𝕏𝕄𝔻 𝕋𝔼ℂℍ',
    tagline: 'Developer · Tech fan',
    avatar: 'https://cdn.phototourl.com/anon/2026-11-23-fab587b9-44c7-4136-bcd7-57a482ee58de.jpg',   // <- your profile image URL
    channel: 'https://whatsapp.com/channel/0029Vb6zdPc5vKAAAY0imG2R',         // <- your channel URL
    channelLabel: 'Visit my channel',
    bio: 'Write a short introduction about yourself here.'
  },
  // [label, image URL]. Empty URL = built-in moonlit night. Add anime wallpaper URLs you have the rights to use.
  backgrounds: [
    ['Moonlit night', 'https://i.ibb.co/p65kShDK/ERFAN-MD.jpg'],
    // ['Wallpaper 1', 'https://example.com/your-anime-wallpaper.jpg'],
  ],
  tools: [
    { name: 'Summarizer', desc: 'Shrink long text to key points', system: 'Summarize the user text into 5 crisp bullet points.' },
    { name: 'Translator', desc: 'Translate to English, or to a language you name', system: 'Translate the text. If the user names a target language at the start, use it; otherwise translate to English.' },
    { name: 'Code explainer', desc: 'Understand any snippet', system: 'Explain the code step by step for a beginner, then list possible bugs.' },
    { name: 'Prompt polisher', desc: 'Make a prompt sharper', system: 'Rewrite the user prompt to be clearer and more specific. Return only the improved prompt.' },
    { name: 'Anime picker', desc: 'Get tailored recommendations', system: 'Recommend 5 anime based on the user taste. For each: title, genre, one-line why.' },
    { name: 'Email writer', desc: 'Draft a polite email', system: 'Write a concise, polite email from the user notes. Include a subject line.' }
  ],
  updates: [
    { v: '1.0', date: '2026-11-23', notes: ['Streaming chat powered by Groq', 'History with search and export', 'Six built-in tools', 'Falling-petal background and custom wallpapers'] }
  ]
};
