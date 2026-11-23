(() => {
const C = window.CONFIG, P = document.body.dataset.page, $ = (s, e = document) => e.querySelector(s);
const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }, set: (k, v) => localStorage.setItem(k, JSON.stringify(v)) };
const S = { model: C.defaultModel, temp: .7, persona: C.persona, bg: '', petals: true, blur: 14, ...store.get('settings', {}) };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = t => esc(t).replace(/```\w*\n?([\s\S]*?)```/g, '<pre><code>$1</code></pre>').replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
const uid = () => Math.random().toString(36).slice(2, 10), chats = () => store.get('chats', []);
const isPlaceholder = v => !v || /^PASTE_/.test(v);
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.append(t); setTimeout(() => t.remove(), 2200) }
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text])); a.download = name; a.click() }

// shell: sidebar, background, petals
const NAV = [['index.html', 'Dashboard', '◈', 'dashboard'], ['history.html', 'History', '◷', 'history'], ['tools.html', 'Tools & updates', '✦', 'tools'], ['settings.html', 'Settings', '⚙', 'settings'], ['owner.html', 'Owner', '♛', 'owner']];
document.body.insertAdjacentHTML('afterbegin', `<div id="bg"></div><canvas id="petals"></canvas><aside><div class="brand">${esc(C.botName)}<small>powered by Groq</small></div>${NAV.map(n => `<a href="${n[0]}" class="${n[3] === P ? 'on' : ''}"><i>${n[2]}</i>${n[1]}</a>`).join('')}</aside>`);
if (S.bg) $('#bg').style.backgroundImage = `url("${S.bg.replace(/"/g, '%22')}")`;
document.documentElement.style.setProperty('--blur', S.blur + 'px');
(() => {
  const cv = $('#petals'); if (!S.petals || matchMedia('(prefers-reduced-motion:reduce)').matches) return cv.remove();
  const x = cv.getContext('2d'); let w, h; const rs = () => { w = cv.width = innerWidth; h = cv.height = innerHeight }; rs(); addEventListener('resize', rs);
  const ps = Array.from({ length: 26 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: 4 + Math.random() * 6, v: .4 + Math.random() * .9, s: Math.random() * 6 }));
  (function f() { x.clearRect(0, 0, w, h); for (const p of ps) { p.y += p.v; p.s += .02; p.x += Math.sin(p.s) * .7; if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w } x.save(); x.translate(p.x, p.y); x.rotate(p.s); x.fillStyle = 'rgba(255,170,200,.6)'; x.beginPath(); x.ellipse(0, 0, p.r, p.r * .55, 0, 0, 7); x.fill(); x.restore() } requestAnimationFrame(f) })();
})();

// Groq streaming through our server (the API key never reaches the browser)
async function stream(messages, onText, system = S.persona) {
  const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: system }, ...messages], model: S.model, temperature: S.temp }) });
  if (!r.ok) { let m = r.statusText; try { m = (await r.json()).error } catch {} throw new Error(m) }
  const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', full = '';
  for (;;) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop();
    for (const l of lines) { if (!l.startsWith('data:')) continue; const d = l.slice(5).trim(); if (d === '[DONE]') return full; try { const t = JSON.parse(d).choices[0].delta.content; if (t) { full += t; onText(full) } } catch {} }
  }
  return full;
}

const pages = {
dashboard(m) {
  const all = chats(), q = new URLSearchParams(location.search), st = store.get('stats', { reqs: 0, ms: 0 });
  const cur = all.find(c => c.id === q.get('c')) || { id: uid(), title: 'New chat', ts: Date.now(), messages: [] };
  m.innerHTML = `<header><h1>Welcome back</h1><p class="mute">Ask anything, or pick a starter.</p></header>
  <section class="stats"><div class="card"><b>${all.length}</b>Chats</div><div class="card"><b>${all.reduce((a, c) => a + c.messages.length, 0)}</b>Messages</div><div class="card"><b>${st.reqs ? Math.round(st.ms / st.reqs) + 'ms' : '–'}</b>Avg first token</div><div class="card"><b class="sm">${esc(S.model)}</b>Model</div></section>
  <section class="chat card"><div id="log"></div><div class="starters">${C.starters.map(s => `<button class="chip">${esc(s)}</button>`).join('')}</div><form id="f"><textarea id="in" rows="1" placeholder="Message ${esc(C.botName)}…"></textarea><button>Send</button></form></section>`;
  const log = $('#log'), inp = $('#in'), starters = $('.starters');
  const add = (r, t) => { const d = document.createElement('div'); d.className = 'msg ' + r; d.innerHTML = md(t); log.append(d); log.scrollTop = log.scrollHeight; return d };
  cur.messages.forEach(x => add(x.role, x.content)); if (cur.messages.length) starters.hidden = true;
  async function send(text) {
    if (!text.trim()) return; starters.hidden = true; inp.value = ''; inp.style.height = '';
    cur.messages.push({ role: 'user', content: text }); add('user', text);
    const b = add('assistant', ''); b.classList.add('typing'); const t0 = performance.now(); let first = 0;
    try {
      const out = await stream(cur.messages.slice(-24), full => { if (!first) { first = performance.now() - t0; b.classList.remove('typing') } b.innerHTML = md(full); log.scrollTop = log.scrollHeight });
      cur.messages.push({ role: 'assistant', content: out }); st.reqs++; st.ms += first; store.set('stats', st);
    } catch (e) { b.classList.remove('typing'); b.classList.add('err'); b.textContent = e.message; cur.messages.pop() }
    if (cur.title === 'New chat') cur.title = text.slice(0, 48); cur.ts = Date.now();
    store.set('chats', [cur, ...chats().filter(c => c.id !== cur.id)]);
  }
  $('#f').onsubmit = e => { e.preventDefault(); send(inp.value) };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(inp.value) } };
  inp.oninput = () => { inp.style.height = 'auto'; inp.style.height = inp.scrollHeight + 'px' };
  starters.onclick = e => { if (e.target.tagName === 'BUTTON') send(e.target.textContent) };
  inp.focus();
},

history(m) {
  m.innerHTML = `<header class="row"><div><h1>History</h1><p class="mute">Saved on this device only.</p></div><div><button id="exp">Export all</button> <button id="clr">Clear all</button></div></header><input id="q" placeholder="Search chats…"><div id="list" class="grid" style="grid-template-columns:1fr"></div>`;
  const draw = () => {
    const f = $('#q').value.toLowerCase(), l = chats().filter(c => (c.title + c.messages.map(x => x.content).join(' ')).toLowerCase().includes(f));
    $('#list').innerHTML = l.length ? l.map(c => `<div class="card row"><div><b>${esc(c.title)}</b><div class="mute">${c.messages.length} messages · ${new Date(c.ts).toLocaleString()}</div></div><div><a class="btn go" href="index.html?c=${c.id}">Open</a> <button data-x="${c.id}">Export</button> <button data-d="${c.id}">Delete</button></div></div>`).join('') : `<div class="card mute">${f ? 'No chats match your search.' : 'No chats yet. Start one from the dashboard.'}</div>`;
  };
  $('#q').oninput = draw;
  $('#list').onclick = e => {
    const d = e.target.dataset.d, x = e.target.dataset.x;
    if (d) { store.set('chats', chats().filter(c => c.id !== d)); draw(); toast('Deleted') }
    if (x) { const c = chats().find(c => c.id === x); download(c.title + '.md', `# ${c.title}\n\n` + c.messages.map(m => `**${m.role}:** ${m.content}`).join('\n\n')) }
  };
  $('#exp').onclick = () => download('kiri-history.json', JSON.stringify(chats(), null, 2));
  $('#clr').onclick = () => { if (confirm('Delete all chats on this device?')) { store.set('chats', []); draw() } };
  draw();
},

tools(m) {
  m.innerHTML = `<header><h1>Tools</h1><p class="mute">One-tap helpers. Pick one, paste your text, run.</p></header><div class="grid">${C.tools.map((t, i) => `<div class="card tool" data-i="${i}"><b>${esc(t.name)}</b><div class="mute">${esc(t.desc)}</div></div>`).join('')}</div>
  <section class="card" id="run" hidden><h3 id="tn"></h3><textarea id="ti" rows="5" placeholder="Paste or type here…"></textarea><div class="row" style="margin-top:10px"><button class="go" id="go">Run</button><button id="cp">Copy result</button></div><div class="msg assistant" id="to" style="margin-top:12px;max-width:100%" hidden></div></section>
  <h2>Updates</h2>${C.updates.map(u => `<div class="card"><b>v${esc(u.v)}</b> <span class="mute">${esc(u.date)}</span><ul style="margin:6px 0 0 18px">${u.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('')}`;
  let tool; const out = $('#to');
  m.querySelectorAll('.tool').forEach(el => el.onclick = () => { m.querySelectorAll('.tool').forEach(x => x.classList.remove('on')); el.classList.add('on'); tool = C.tools[el.dataset.i]; $('#tn').textContent = tool.name; $('#run').hidden = false; $('#ti').focus() });
  $('#go').onclick = async () => {
    const v = $('#ti').value.trim(); if (!v) return toast('Add some text first'); out.hidden = false; out.className = 'msg assistant typing'; out.textContent = '';
    try { await stream([{ role: 'user', content: v }], t => { out.classList.remove('typing'); out.innerHTML = md(t) }, tool.system) } catch (e) { out.className = 'msg err'; out.textContent = e.message }
  };
  $('#cp').onclick = () => navigator.clipboard.writeText(out.textContent).then(() => toast('Copied'));
},

settings(m) {
  const bgs = C.backgrounds.filter(b => !isPlaceholder(b[1]) || b[1] === '');
  m.innerHTML = `<header><h1>Settings</h1><p class="mute">Changes save automatically.</p></header><div class="card">
  <label>Model</label><select id="model"><option>${esc(S.model)}</option></select>
  <label>Creativity: <span id="tv">${S.temp}</span></label><input type="range" id="temp" min="0" max="1.5" step=".1" value="${S.temp}">
  <label>Personality</label><textarea id="persona" rows="4">${esc(S.persona)}</textarea>
  <label>Background</label><div class="row" style="justify-content:flex-start">${bgs.map(b => `<button class="chip ${S.bg === b[1] ? 'on' : ''}" data-bg="${esc(b[1])}">${esc(b[0])}</button>`).join('')}</div>
  <input id="bgurl" style="margin-top:8px" placeholder="Or paste an image URL" value="${esc(S.bg)}">
  <label>Glass blur: <span id="bv">${S.blur}</span>px</label><input type="range" id="blur" min="0" max="30" value="${S.blur}">
  <label><input type="checkbox" id="petals" style="width:auto" ${S.petals ? 'checked' : ''}> Falling petals</label>
  <div class="row" style="margin-top:16px;justify-content:flex-start"><button id="reset">Reset to defaults</button></div></div>`;
  const save = () => { store.set('settings', S); toast('Saved') };
  fetch('/api/models').then(r => r.json()).then(l => { $('#model').innerHTML = l.map(x => `<option ${x === S.model ? 'selected' : ''}>${esc(x)}</option>`).join('') }).catch(() => {});
  $('#model').onchange = e => { S.model = e.target.value; save() };
  $('#temp').oninput = e => { S.temp = +e.target.value; $('#tv').textContent = S.temp; save() };
  $('#persona').onchange = e => { S.persona = e.target.value; save() };
  $('#bgurl').onchange = e => { S.bg = e.target.value.trim(); save(); location.reload() };
  $('#blur').oninput = e => { S.blur = +e.target.value; $('#bv').textContent = S.blur; document.documentElement.style.setProperty('--blur', S.blur + 'px'); save() };
  $('#petals').onchange = e => { S.petals = e.target.checked; save(); location.reload() };
  m.querySelectorAll('[data-bg]').forEach(b => b.onclick = () => { S.bg = b.dataset.bg; save(); location.reload() });
  $('#reset').onclick = () => { localStorage.removeItem('settings'); location.reload() };
},

owner(m) {
  const o = C.owner, ok = !isPlaceholder(o.avatar), link = !isPlaceholder(o.channel);
  m.innerHTML = `<section class="card owner">${ok ? `<img src="${esc(o.avatar)}" alt="${esc(o.name)}">` : ''}<div class="avatar" ${ok ? 'hidden' : ''}>${esc(o.name[0] || '?')}</div><h1>${esc(o.name)}</h1><p class="mute">${esc(o.tagline)}</p><p style="margin:14px 0">${esc(o.bio)}</p>${link ? `<a class="btn go" href="${esc(o.channel)}" target="_blank" rel="noopener">${esc(o.channelLabel)}</a>` : `<p class="mute">Set <code>owner.channel</code> in js/config.js</p>`}</section>`;
  const img = $('.owner img'); if (img) img.onerror = () => { img.remove(); $('.avatar').hidden = false };
}
};
pages[P]($('#page'));
})();
