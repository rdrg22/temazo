(() => {
'use strict';

/* ================= configuración ================= */
const STEPS = [0.5, 1, 2, 4, 8, 16];          // segundos audibles en cada intento
const POINTS = [100, 80, 60, 40, 25, 10];
const MAX = STEPS.length;
const CATS = [
  { id: 'exitos', name: 'Éxitos' },
  { id: 'pop', name: 'Pop' },
  { id: 'rock', name: 'Rock' },
  { id: 'hiphop', name: 'Hip hop' },
  { id: 'electronica', name: 'Electrónica' },
  { id: 'espanol', name: 'En español' },
  { id: 'cine', name: 'Bandas sonoras' },
];
const CATALOG = window.CATALOG || {};
const KEY = 'tarareo:v1';
const EPOCH = Date.UTC(2026, 0, 1);

/* ================= utilidades ================= */
const $ = (s) => document.querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k);
  return e;
}
const strip = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ');
function norm(s) {
  const base = strip(String(s));
  const a = base.replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/ - .*$/, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  return a || base.replace(/[^a-z0-9]+/g, ' ').trim();
}
const fmtS = (s) => (s < 1 ? String(s).replace('.', ',') : String(s)) + ' s';
const todayNum = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5) + 1; };
const dayDate = (n) => new Date(EPOCH + (n - 1) * 864e5);
const fmtDate = (n, long) => dayDate(n).toLocaleDateString('es-ES', long ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (s) => [...s].reduce((a, c) => Math.imul(a ^ c.charCodeAt(0), 16777619), 2166136261) | 0;

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

let jsonpN = 0;
function jsonp(url) {
  return new Promise((res, rej) => {
    const cb = '__trr' + (jsonpN++), s = document.createElement('script');
    const done = (fn, v) => { clearTimeout(to); delete window[cb]; s.remove(); fn(v); };
    const to = setTimeout(() => { window[cb] = () => {}; done(rej, new Error('timeout')); }, 5000);
    window[cb] = (d) => done(res, d);
    s.onerror = () => done(rej, new Error('red'));
    s.src = url + (url.includes('?') ? '&' : '?') + 'output=jsonp&callback=' + cb;
    document.head.append(s);
  });
}

/* ================= almacenamiento ================= */
const defaults = () => ({ settings: { theme: 'auto', vol: 0.8, hints: true, auto: true }, daily: {}, endless: {}, seenHelp: false, cat: 'exitos' });
let store = defaults();
try { const raw = JSON.parse(localStorage.getItem(KEY)); if (raw) store = { ...store, ...raw, settings: { ...store.settings, ...raw.settings } }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {} };
const rec = (cat, day) => store.daily[cat]?.[day];
function setRec(cat, day, r) { (store.daily[cat] ||= {})[day] = r; save(); }

/* ================= selección de canción ================= */
function dailyEntry(cat, day, offset = 0) {
  const list = CATALOG[cat]; const n = list.length;
  const cycle = Math.floor((day - 1) / n), r = rng(hash(cat) + cycle * 7919);
  const idx = list.map((_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return list[idx[((day - 1) % n + offset) % n]];
}
const recent = [];
function randomEntry(cat) {
  const list = CATALOG[cat]; let e;
  do { e = list[Math.floor(Math.random() * list.length)]; } while (recent.includes(e.id));
  recent.push(e.id); if (recent.length > Math.min(30, list.length - 1)) recent.shift();
  return e;
}

/* ================= audio ================= */
const audio = {
  ctx: null, gain: null, buffer: null, el: null, src: null, peaks: null, duration: 30,
  playing: false, startedAt: 0, limit: 0, raf: 0,
  ensure() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C(); this.gain = this.ctx.createGain(); this.gain.connect(this.ctx.destination); this.gain.gain.value = store.settings.vol; }
    return this.ctx;
  },
  reset() { this.stop(); this.buffer = null; this.el = null; this.peaks = null; this.duration = 30; },
  async load(bytesPromise, url, seed) {
    this.reset();
    const tok = this.tok = (this.tok || 0) + 1, stale = () => { if (tok !== this.tok) throw new Error('obsoleta'); };
    try {
      const ab = (await bytesPromise).slice(0); // decodeAudioData consume el buffer: se decodifica una copia
      stale();
      const buf = await this.ensure().decodeAudioData(ab);
      stale();
      this.buffer = buf; this.duration = buf.duration;
      const ch = buf.getChannelData(0), per = Math.floor(buf.sampleRate * 0.05), n = Math.floor(ch.length / per), p = new Float32Array(n);
      let top = 0;
      for (let i = 0; i < n; i++) { let m = 0; for (let j = i * per, e = j + per; j < e; j += 16) { const v = Math.abs(ch[j]); if (v > m) m = v; } p[i] = m; if (m > top) top = m; }
      if (top > 0) for (let i = 0; i < n; i++) p[i] /= top;
      this.peaks = p;
    } catch {
      stale();
      // Sin CORS o sin Web Audio: reproducimos con <audio> y una onda de adorno
      this.el = new Audio(url); this.el.preload = 'auto';
      const r = rng(seed), p = new Float32Array(600);
      for (let i = 0; i < p.length; i++) p[i] = 0.25 + r() * 0.75;
      this.peaks = p;
      await new Promise((res, rej) => { this.el.oncanplay = res; this.el.onerror = () => rej(new Error('audio')); setTimeout(res, 6000); });
    }
  },
  get ready() { return !!(this.buffer || this.el); },
  position() {
    if (!this.playing) return 0;
    return this.buffer ? this.ctx.currentTime - this.startedAt : this.el.currentTime;
  },
  play(limit) {
    if (!this.ready) return;
    this.stop(); this.limit = Math.min(limit, this.duration);
    if (this.buffer) {
      this.ctx.resume();
      const s = this.ctx.createBufferSource(); s.buffer = this.buffer; s.connect(this.gain);
      // pequeño fundido para que los cortes no hagan «clic»
      const t = this.ctx.currentTime, v = store.settings.vol;
      this.gain.gain.cancelScheduledValues(t); this.gain.gain.setValueAtTime(v, t);
      this.gain.gain.setValueAtTime(v, t + Math.max(0, this.limit - 0.04)); this.gain.gain.linearRampToValueAtTime(0.0001, t + this.limit);
      s.start(0, 0, this.limit); s.onended = () => { if (this.src === s) this.stop(); };
      this.src = s; this.startedAt = t;
    } else {
      this.el.volume = store.settings.vol; this.el.currentTime = 0; this.el.play().catch(() => this.stop());
    }
    this.playing = true; onPlayState(); this.tick();
  },
  tick() {
    cancelAnimationFrame(this.raf);
    const loop = () => {
      if (!this.playing) return;
      if (this.position() >= this.limit) return this.stop();
      drawWave(); this.raf = requestAnimationFrame(loop);
    };
    loop();
  },
  stop() {
    cancelAnimationFrame(this.raf);
    if (this.src) { const s = this.src; this.src = null; try { s.stop(); } catch {} }
    if (this.el) this.el.pause();
    if (this.gain) { this.gain.gain.cancelScheduledValues(this.ctx.currentTime); this.gain.gain.setValueAtTime(store.settings.vol, this.ctx.currentTime); }
    const was = this.playing; this.playing = false;
    if (was) onPlayState();
    drawWave();
  },
};

/* ================= estado de la partida ================= */
let mode = 'daily';
let cat = CATALOG[store.cat] ? store.cat : 'exitos';
let archiveDay = null;
let game = null;
let loadSeq = 0;

const allowed = () => (game.done ? audio.duration : STEPS[Math.min(game.guesses.length, MAX - 1)]);
const fails = () => game.guesses.filter((g) => g.r !== 'ok').length;

/* ---- caché y precarga: la ficha de Deezer y el mp3 de cada canción se piden una sola vez ---- */
const metaCache = new Map(), bytesCache = new Map();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function getMeta(id) {
  if (!metaCache.has(id)) {
    const p = (async () => {
      for (let i = 0; ; i++) {
        try {
          const m = await jsonp('https://api.deezer.com/track/' + id);
          if (m.error?.code === 4 && i < 3) { await wait(1200); continue; } // límite de peticiones de Deezer: esperar y repetir
          return m;
        } catch (e) { if (i >= 1) throw e; }
      }
    })();
    p.catch(() => metaCache.delete(id));
    metaCache.set(id, p);
  }
  return metaCache.get(id);
}
function getBytes(id) {
  if (!bytesCache.has(id)) {
    const p = getMeta(id).then(async (m) => {
      if (!m.preview) throw new Error('sin preview');
      const r = await fetch(m.preview); if (!r.ok) throw new Error('http ' + r.status);
      return r.arrayBuffer();
    });
    p.catch(() => bytesCache.delete(id));
    bytesCache.set(id, p);
    if (bytesCache.size > 40) bytesCache.delete(bytesCache.keys().next().value);
  }
  return bytesCache.get(id);
}
const prefetch = (entry) => getBytes(entry.id).catch(() => {});
const queued = {}; // siguiente canción de Infinito, ya descargada
let prefetchSeq = 0;
async function prefetchAround() {
  const seq = ++prefetchSeq;
  if (mode === 'endless') { queued[cat] ||= randomEntry(cat); return prefetch(queued[cat]); }
  if (mode !== 'daily') return;
  const today = todayNum();
  for (const c of CATS) { // las demás categorías de hoy, de una en una y sin estorbar
    if (seq !== prefetchSeq) return;
    if (c.id !== cat) await prefetch(dailyEntry(c.id, today));
  }
}

async function startGame() {
  const seq = ++loadSeq; audio.reset();
  if (mode === 'archive' && archiveDay == null) { game = null; return render(); }
  const day = mode === 'daily' ? todayNum() : mode === 'archive' ? archiveDay : null;
  const saved = day ? rec(cat, day) : null;
  game = { mode, cat, day, entry: null, meta: null, guesses: saved ? saved.g.slice() : [], done: !!saved?.done, won: !!saved?.won, state: 'loading' };
  const enablePlay = () => { if (seq === loadSeq) { const b = $('#play'); if (b) b.disabled = false; drawWave(); } };
  if (saved?.done && saved.s) {
    // Día ya jugado: el resultado sale al instante de lo guardado en el navegador; el audio llega después
    const s = saved.s;
    game.entry = { id: s.id, a: s.a, t: s.t, f: s.f };
    game.meta = { release_date: s.y || '', album: { title: s.al, cover_medium: s.c }, link: s.l, title_short: s.t, artist: { name: s.a } };
    game.state = 'ready'; render(); loadCover();
    getMeta(s.id).then((m) => { if (seq === loadSeq) return audio.load(getBytes(s.id), m.preview, s.id).then(enablePlay); }).catch(() => {});
    prefetchAround();
    return;
  }
  render();
  for (let attempt = 0; attempt < 4; attempt++) {
    let entry;
    if (day) entry = dailyEntry(cat, day, attempt);
    else { entry = queued[cat] || randomEntry(cat); queued[cat] = null; }
    let meta;
    try { meta = await getMeta(entry.id); } catch { break; } // sin red: no cambiamos de canción, mostramos el error
    if (seq !== loadSeq) return;
    if (meta.error || !meta.preview) continue;             // canción retirada de Deezer: probamos la siguiente
    game.entry = entry; game.meta = meta;
    const loading = audio.load(getBytes(entry.id), meta.preview, entry.id);
    if (game.done) { // partida ya terminada: el resultado no tiene que esperar al audio
      game.state = 'ready'; render(); loadCover();
      loading.then(enablePlay, () => {});
    } else {
      try { await loading; } catch { if (seq === loadSeq) break; return; }
      if (seq !== loadSeq) return;
      game.state = 'ready'; render(); loadCover();
    }
    prefetchAround();
    return;
  }
  game.state = 'error'; render();
}

function evaluate(item) {
  const e = game.entry, m = game.meta;
  const gt = norm(item.t), ga = norm(item.a);
  const titles = [norm(e.t), norm(m.title_short || m.title)], artists = [norm(e.a), norm(m.artist.name)];
  const tOk = titles.includes(gt);
  const aOk = artists.some((a) => a === ga || a.includes(ga) || ga.includes(a));
  return tOk && aOk ? 'ok' : aOk ? 'artist' : 'bad';
}

function commit(g) {
  if (!game || game.done || game.state !== 'ready') return;
  game.guesses.push(g);
  if (g.r === 'ok') { game.done = true; game.won = true; }
  else if (game.guesses.length >= MAX) game.done = true;
  if (game.day) {
    const prev = rec(cat, game.day);
    const e = game.entry, m = game.meta;
    const s = game.done ? { id: e.id, a: e.a, t: e.t, f: e.f, al: m.album?.title, y: (m.release_date || '').slice(0, 4), c: m.album?.cover_medium, l: m.link } : undefined;
    setRec(cat, game.day, { g: game.guesses, done: game.done, won: game.won, late: prev?.late ?? game.mode === 'archive', s });
  } else if (game.done) {
    const s = (store.endless[cat] ||= { streak: 0, best: 0, played: 0, won: 0 });
    s.played++; if (game.won) { s.won++; s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
    save();
  }
  audio.stop(); render(); loadCover();
  if (game.done) audio.play(audio.duration);
  else if (store.settings.auto) audio.play(allowed());
  if (!game.done) $('#q')?.focus();
}
const skip = () => commit({ r: 'skip' });
function guess(item) {
  if (game.guesses.some((g) => g.a && norm(g.a) === norm(item.a) && norm(g.t) === norm(item.t))) return toast('Esa ya la has probado');
  commit({ r: evaluate(item), a: item.a, t: item.t });
}

/* ================= buscador ================= */
const localIndex = (() => {
  const seen = new Set(), out = [];
  for (const list of Object.values(CATALOG)) for (const e of list) {
    const k = norm(e.a) + '|' + norm(e.t); if (seen.has(k)) continue; seen.add(k);
    out.push({ a: e.a, t: e.t, f: e.f, k, n: norm(e.t) + ' ' + norm(e.a) + (e.f ? ' ' + norm(e.f) : '') });
  }
  return out;
})();
let sugg = [], suggSel = 0, suggSeq = 0, suggT;

function localSearch(q) {
  const toks = norm(q).split(' ').filter(Boolean); if (!toks.length) return [];
  return localIndex.filter((s) => toks.every((t) => s.n.includes(t)))
    .sort((a, b) => (b.n.startsWith(toks[0]) - a.n.startsWith(toks[0])) || a.t.localeCompare(b.t)).slice(0, 6);
}
function onType(q) {
  const seq = ++suggSeq; clearTimeout(suggT);
  sugg = localSearch(q); suggSel = 0; renderSugg(q);
  if (q.trim().length < 2) return;
  suggT = setTimeout(async () => {
    try {
      const d = await jsonp('https://api.deezer.com/search?limit=12&q=' + encodeURIComponent(q.trim()));
      if (seq !== suggSeq || !d.data) return;
      const have = new Set(sugg.map((s) => s.k));
      for (const t of d.data) {
        const it = { a: t.artist.name, t: t.title_short || t.title }; it.k = norm(it.a) + '|' + norm(it.t);
        if (have.has(it.k) || !norm(it.t)) continue; have.add(it.k); sugg.push(it);
        if (sugg.length >= 9) break;
      }
      renderSugg(q);
    } catch {}
  }, 220);
}
function renderSugg(q) {
  const box = $('#sugg'); if (!box) return;
  box.replaceChildren(); box.hidden = !q.trim();
  if (!sugg.length) { box.append(h('li', { class: 'empty' }, q.trim().length < 2 ? 'Sigue escribiendo…' : 'Buscando…')); return; }
  sugg.forEach((s, i) => box.append(h('li', { role: 'option', 'aria-selected': String(i === suggSel), onmousedown: (e) => { e.preventDefault(); pick(i); } }, h('b', null, s.t), h('span', null, s.f ? `${s.a} · ${s.f}` : s.a))));
}
function pick(i) { const s = sugg[i]; if (!s) return; sugg = []; $('#q').value = ''; $('#sugg').hidden = true; guess(s); }
function onKey(e) {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!sugg.length) return; e.preventDefault();
    suggSel = (suggSel + (e.key === 'ArrowDown' ? 1 : -1) + sugg.length) % sugg.length; renderSugg(e.target.value);
    $('#sugg').children[suggSel]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') { e.preventDefault(); if (sugg.length) pick(suggSel); }
  else if (e.key === 'Escape') { e.target.value = ''; $('#sugg').hidden = true; }
  else if (e.key === 'Tab' && !e.shiftKey && !e.target.value) { e.preventDefault(); skip(); }
}

/* ================= dibujo ================= */
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function drawWave() {
  const c = $('#wave'); if (!c || !game) return;
  const dpr = window.devicePixelRatio || 1, W = c.clientWidth, H = c.clientHeight;
  if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; }
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const view = game.done ? audio.duration : STEPS[MAX - 1], lim = game.state === 'ready' ? allowed() : 0, pos = audio.position();
  const bw = 3, gap = 2, n = Math.floor(W / (bw + gap)), p = audio.peaks;
  const cAcc = css('--accent'), cInk = css('--ink'), cOff = css('--line');
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * view, t1 = ((i + 1) / n) * view;
    let v = 0.12;
    if (p) { const a = Math.floor(t0 / audio.duration * p.length), b = Math.max(a + 1, Math.floor(t1 / audio.duration * p.length)); for (let j = a; j < b && j < p.length; j++) if (p[j] > v) v = p[j]; }
    else v = 0.2 + 0.15 * Math.sin(i * 0.5 + performance.now() / 300);
    const open = t0 < lim;
    const bh = Math.max(3, (open ? v : 0.18 + v * 0.12) * (H - 4));
    g.fillStyle = audio.playing && t1 <= pos + 0.001 ? cAcc : open ? cInk : cOff;
    g.beginPath(); g.roundRect(i * (bw + gap), (H - bh) / 2, bw, bh, 1.5); g.fill();
  }
  if (!game.done) { // marcas de cada tramo
    g.fillStyle = css('--muted');
    for (const s of STEPS.slice(0, -1)) g.fillRect(Math.round(s / view * W) - 0.5, 0, 1, 5);
  }
}

let coverImg = null;
function loadCover() {
  if (!game?.meta) return;
  const url = game.meta.album?.cover_medium; if (!url) return;
  if (coverImg?.src === url) return drawCover();
  coverImg = new Image(); coverImg.onload = drawCover; coverImg.src = url;
}
function drawCover() {
  const c = $('#cover'); if (!c || !coverImg?.complete || !game) return;
  const f = fails(), g = c.getContext('2d'), S = c.width;
  const blocks = game.done ? 0 : !store.settings.hints || f < 3 ? -1 : f === 3 ? 5 : f === 4 ? 9 : 14;
  c.hidden = blocks < 0; if (blocks < 0) return;
  g.imageSmoothingEnabled = blocks === 0;
  if (blocks === 0) return g.drawImage(coverImg, 0, 0, S, S);
  g.drawImage(coverImg, 0, 0, blocks, blocks);
  g.drawImage(c, 0, 0, blocks, blocks, 0, 0, S, S);
}
function onPlayState() {
  $('#disc')?.classList.toggle('playing', audio.playing);
  const b = $('#play'); if (b) { b.innerHTML = audio.playing ? ICON.stop : ICON.play; b.setAttribute('aria-label', audio.playing ? 'Parar' : 'Reproducir'); }
}
const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.500v15a1 1 0 0 0 1.500.86l13-7.500a1 1 0 0 0 0-1.720l-13-7.500A1 1 0 0 0 7 4.500z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2.500"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
};

/* ================= render ================= */
function renderChrome() {
  document.querySelectorAll('.modes button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  const today = todayNum();
  $('#cats').replaceChildren(...CATS.map((c) => {
    const r = mode === 'daily' ? rec(c.id, today) : null;
    return h('button', { class: 'cat', role: 'tab', 'aria-selected': String(c.id === cat), onclick: () => { cat = c.id; store.cat = cat; save(); archiveDay = null; startGame(); } },
      mode === 'daily' && h('span', { class: 'mark ' + (r?.done ? (r.won ? 'won' : 'lost') : ''), title: r?.done ? (r.won ? 'Acertada' : 'Fallada') : 'Sin jugar' }), c.name);
  }));
}

function render() {
  renderChrome();
  const view = $('#view'); view.replaceChildren();
  const catName = CATS.find((c) => c.id === cat).name;
  if (!game) return renderArchive(view, catName);

  const kLeft = game.mode === 'daily' ? `Diario n.º ${game.day} · ${fmtDate(game.day, true)}`
    : game.mode === 'archive' ? `Archivo n.º ${game.day} · ${fmtDate(game.day, true)}`
    : `Infinito · racha ${store.endless[cat]?.streak || 0}`;
  view.append(h('div', { class: 'kicker' }, h('span', null, kLeft),
    game.mode === 'archive' ? h('button', { onclick: () => { archiveDay = null; startGame(); } }, '← Archivo') : h('span', null, catName)));

  if (game.state === 'error') {
    view.append(h('div', { class: 'notice' }, 'No se ha podido cargar la canción. Comprueba la conexión.', h('br'), h('button', { class: 'btn', onclick: startGame }, 'Reintentar')));
    return;
  }
  const loading = game.state === 'loading';
  const n = game.guesses.length, f = fails();
  const title = loading ? 'Cargando…' : game.done ? (game.won ? '¡La tienes!' : 'Se acabó') : `Intento ${n + 1} de ${MAX}`;

  // pistas
  const hintsOn = store.settings.hints && !loading && !game.done;
  const year = (game.meta?.release_date || '').slice(0, 4);
  const artist = game.entry?.a || '';
  const initial = artist.replace(/[^\s]/g, (ch, i) => (i === 0 ? ch : /[\p{L}\p{N}]/u.test(ch) ? '·' : ch));
  const hints = hintsOn && h('div', { class: 'hints' },
    year && h('span', { class: 'hint' + (f >= 2 ? ' on' : '') }, f >= 2 ? `Disco de ${year}` : 'Año · 2 fallos'),
    h('span', { class: 'hint' + (f >= 3 ? ' on' : '') }, f >= 3 ? 'Portada en el vinilo' : 'Portada · 3 fallos'),
    h('span', { class: 'hint' + (f >= 4 ? ' on' : '') }, f >= 4 ? `Artista: ${initial}` : 'Inicial · 4 fallos'));

  const view16 = game.done ? Math.round(audio.duration) : STEPS[MAX - 1];
  view.append(h('div', { class: 'stage' },
    h('div', { class: 'disc' + (game.done ? ' big-label' : '') + (audio.playing ? ' playing' : ''), id: 'disc' },
      h('div', { class: 'disc-label' }, '?', h('canvas', { id: 'cover', width: 240, height: 240, hidden: true }))),
    h('div', { class: 'panel' },
      h('div', { class: 'status' }, h('h1', null, title), !loading && h('span', { class: 'len' }, game.done ? 'Fragmento completo' : `Suenan ${fmtS(allowed())}`)),
      h('div', { class: 'wave-wrap' }, h('canvas', { class: 'wave', id: 'wave', 'aria-hidden': 'true' })),
      h('div', { class: 'ticks' }, h('span', null, '0 s'), h('span', null, view16 + ' s')),
      h('div', { class: 'controls' },
        h('button', { class: 'play', id: 'play', disabled: loading || !audio.ready, 'aria-label': 'Reproducir', html: audio.playing ? ICON.stop : ICON.play, onclick: togglePlay }),
        hints))));

  if (!game.done) {
    const next = STEPS[Math.min(n + 1, MAX - 1)] - STEPS[Math.min(n, MAX - 1)];
    view.append(h('div', { class: 'guess' },
      h('div', { class: 'field' },
        h('span', { html: ICON.search }),
        h('input', { id: 'q', type: 'text', placeholder: cat === 'cine' ? 'Busca tema, artista o película…' : 'Busca canción o artista…', autocomplete: 'off', spellcheck: 'false', disabled: loading, role: 'combobox', 'aria-controls': 'sugg', 'aria-expanded': 'false',
          oninput: (e) => onType(e.target.value), onkeydown: onKey, onblur: () => { $('#sugg').hidden = true; }, onfocus: (e) => { if (e.target.value) renderSugg(e.target.value); } }),
        h('ul', { class: 'sugg', id: 'sugg', role: 'listbox', hidden: true })),
      h('button', { class: 'btn', disabled: loading, onclick: skip }, n === MAX - 1 ? 'Rendirse' : 'Saltar', n < MAX - 1 && h('small', null, '+' + fmtS(next)))));
  } else view.append(renderResult());

  const rows = h('ol', { class: 'rows' });
  for (let i = 0; i < MAX; i++) {
    const g = game.guesses[i];
    if (!g) { if (game.done) break; rows.append(h('li', { class: 'row' + (i === n ? ' next' : '') }, h('span', { class: 'n' }, i + 1), h('span', { class: 'what muted' }, i === n ? `Escucha ${fmtS(STEPS[i])} y prueba suerte` : fmtS(STEPS[i])))); continue; }
    const cls = { ok: 'ok', artist: 'artist', bad: 'bad', skip: 'skip' }[g.r];
    const tag = { ok: 'Correcta', artist: 'Mismo artista', bad: 'No es', skip: 'Saltado' }[g.r];
    rows.append(h('li', { class: 'row filled ' + cls }, h('span', { class: 'n' }, i + 1),
      h('span', { class: 'what' }, g.r === 'skip' ? `Saltado a los ${fmtS(STEPS[i])}` : [g.t, h('em', null, ' · ' + g.a)]), h('span', { class: 'tag' }, tag)));
  }
  view.append(rows);
  requestAnimationFrame(() => { drawWave(); drawCover(); });
}

function renderResult() {
  const m = game.meta, n = game.guesses.length, pts = game.won ? POINTS[n - 1] : 0;
  const year = (m.release_date || '').slice(0, 4);
  const acts = h('div', { class: 'acts' });
  if (game.mode === 'endless') acts.append(h('button', { class: 'btn primary', id: 'nextBtn', onclick: startGame }, 'Siguiente canción'));
  else if (game.mode === 'archive') acts.append(h('button', { class: 'btn primary', onclick: () => { archiveDay = null; startGame(); } }, 'Volver al archivo'));
  else {
    const pending = CATS.find((c) => !rec(c.id, game.day)?.done);
    acts.append(pending
      ? h('button', { class: 'btn primary', onclick: () => { cat = pending.id; startGame(); } }, `Jugar ${pending.name}`)
      : h('button', { class: 'btn primary', onclick: () => setMode('endless') }, 'Seguir en Infinito'));
  }
  acts.append(h('button', { class: 'btn', onclick: share }, 'Compartir'));
  if (m.link) acts.append(h('a', { class: 'btn', href: m.link, target: '_blank', rel: 'noopener' }, 'Escucharla entera'));
  const score = h('div', { class: 'score' },
    h('div', null, h('b', null, game.won ? fmtS(STEPS[n - 1]) : '—'), h('span', null, 'de música')),
    h('div', null, h('b', null, pts), h('span', null, 'puntos')));
  if (game.mode === 'endless') score.append(h('div', null, h('b', null, store.endless[cat]?.streak || 0), h('span', null, `racha (mejor ${store.endless[cat]?.best || 0})`)));
  if (game.mode === 'daily') { score.append(h('div', null, h('b', null, stats(cat).streak), h('span', null, 'días seguidos')), h('div', null, h('b', { id: 'countdown' }, countdown()), h('span', null, 'para la siguiente'))); }
  return h('div', { class: 'result' },
    h('div', { class: 'verdict' }, game.won ? `Acertada al intento ${n}` : 'Era esta'),
    h('h2', null, game.entry.t), h('div', { class: 'by' }, [game.entry.a, game.entry.f ? `de «${game.entry.f}»` : m.album?.title, year].filter(Boolean).join(' · ')),
    score, acts);
}

function renderArchive(view, catName) {
  const today = todayNum();
  view.append(h('div', { class: 'kicker' }, h('span', null, 'Archivo · ' + catName), h('span', null, 'Días anteriores')));
  if (today <= 1) return view.append(h('div', { class: 'notice' }, 'Todavía no hay días anteriores.'));
  const grid = h('div', { class: 'archive' });
  for (let d = today - 1; d >= Math.max(1, today - 90); d--) {
    const r = rec(cat, d), st = r?.done ? (r.won ? 'won' : 'lost') : r ? 'open' : '';
    grid.append(h('button', { class: 'day ' + st, onclick: () => { archiveDay = d; startGame(); } },
      h('b', null, 'n.º ' + d), h('span', null, fmtDate(d)),
      h('i', null, r?.done ? (r.won ? `Acertada · ${r.g.length}/${MAX}` : 'Fallada') : r ? 'A medias' : 'Sin jugar')));
  }
  view.append(grid);
}

function countdown() {
  const now = new Date(), end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((end - now) / 1000)), p = (x) => String(x).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
setInterval(() => { const c = $('#countdown'); if (c) c.textContent = countdown(); if (mode === 'daily' && game && game.day !== todayNum()) startGame(); }, 1000);

/* ================= acciones ================= */
function togglePlay() { if (!game || game.state !== 'ready') return; audio.playing ? audio.stop() : audio.play(allowed()); }
function setMode(m) { mode = m; archiveDay = null; startGame(); }

function share() {
  const sq = { ok: '🟩', artist: '🟨', bad: '🟥', skip: '⬛' };
  const n = game.guesses.length, catName = CATS.find((c) => c.id === cat).name;
  const head = game.mode === 'endless' ? `Temazo ∞ · ${catName}` : `Temazo n.º ${game.day} · ${catName}`;
  const line = game.guesses.map((g) => sq[g.r]).join('') + '⬜'.repeat(MAX - n);
  const text = `${head}\n${line}\n${game.won ? `Adivinada con ${fmtS(STEPS[n - 1])} de música` : 'Hoy no ha habido suerte'}`;
  (navigator.clipboard?.writeText(text) ?? Promise.reject()).then(() => toast('Resultado copiado'), () => toast('No se ha podido copiar'));
}

function stats(c) {
  const days = store.daily[c] || {}, today = todayNum();
  const done = Object.entries(days).filter(([, r]) => r.done);
  const dist = Array(MAX + 1).fill(0);
  for (const [, r] of done) dist[r.won ? r.g.length - 1 : MAX]++;
  const onTime = (d) => days[d]?.done && days[d].won && !days[d].late;
  let streak = 0; for (let d = onTime(today) ? today : today - 1; onTime(d); d--) streak++;
  let best = 0, run = 0; for (let d = 1; d <= today; d++) { run = onTime(d) ? run + 1 : 0; best = Math.max(best, run); }
  const won = done.filter(([, r]) => r.won).length;
  return { played: done.length, won, pct: done.length ? Math.round(won / done.length * 100) : 0, streak, best, dist };
}
function openStats() {
  const s = stats(cat), e = store.endless[cat] || { best: 0, played: 0, won: 0 }, top = Math.max(1, ...s.dist);
  const last = game?.done && game.day ? (game.won ? game.guesses.length - 1 : MAX) : -1;
  $('#statsBody').replaceChildren(
    h('h3', null, 'Diario · ' + CATS.find((c) => c.id === cat).name),
    h('div', { class: 'stat-grid' },
      h('div', null, h('b', null, s.played), h('span', null, 'jugadas')), h('div', null, h('b', null, s.pct + '%'), h('span', null, 'aciertos')),
      h('div', null, h('b', null, s.streak), h('span', null, 'racha')), h('div', null, h('b', null, s.best), h('span', null, 'mejor racha'))),
    h('h3', null, 'Con cuánta música aciertas'),
    h('div', { class: 'dist' }, s.dist.map((v, i) => h('div', { class: 'dist-row' }, h('span', null, i < MAX ? fmtS(STEPS[i]) : 'Fallo'),
      h('div', { class: 'dist-bar' + (i === MAX ? ' fail' : '') + (i === last && i < MAX ? ' hi' : ''), style: `width:${Math.max(8, v / top * 100)}%` }, v)))),
    h('h3', { style: 'margin-top:18px' }, 'Infinito'),
    h('div', { class: 'stat-grid' },
      h('div', null, h('b', null, e.played), h('span', null, 'jugadas')), h('div', null, h('b', null, e.played ? Math.round(e.won / e.played * 100) + '%' : '0%'), h('span', null, 'aciertos')),
      h('div', null, h('b', null, e.streak || 0), h('span', null, 'racha')), h('div', null, h('b', null, e.best), h('span', null, 'mejor racha'))));
  $('#dlgStats').showModal();
}

function applySettings() {
  const s = store.settings, root = document.documentElement;
  if (s.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = s.theme;
  document.querySelectorAll('#setTheme button').forEach((b) => b.classList.toggle('on', b.dataset.v === s.theme));
  $('#setVol').value = s.vol; $('#setHints').checked = s.hints; $('#setAuto').checked = s.auto;
  if (audio.gain) audio.gain.gain.value = s.vol;
  if (audio.el) audio.el.volume = s.vol;
  document.querySelector('meta[name=theme-color]').content = css('--bg');
}

/* ================= eventos ================= */
document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$('#btnHelp').onclick = () => $('#dlgHelp').showModal();
$('#btnStats').onclick = openStats;
$('#btnSettings').onclick = () => $('#dlgSettings').showModal();
document.querySelectorAll('.dlg').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));
$('#setTheme').onclick = (e) => { const v = e.target.dataset.v; if (!v) return; store.settings.theme = v; save(); applySettings(); drawWave(); };
$('#setVol').oninput = (e) => { store.settings.vol = +e.target.value; save(); applySettings(); };
$('#setHints').onchange = (e) => { store.settings.hints = e.target.checked; save(); if (game) { render(); loadCover(); } };
$('#setAuto').onchange = (e) => { store.settings.auto = e.target.checked; save(); };
$('#setReset').onclick = () => { if (!confirm('¿Borrar estadísticas y partidas guardadas? No se puede deshacer.')) return; const s = store.settings; store = defaults(); store.settings = s; store.seenHelp = true; save(); $('#dlgSettings').close(); startGame(); toast('Progreso borrado'); };

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  const typing = e.target.matches('input, textarea');
  if (e.code === 'Space' && (!typing || !e.target.value)) { e.preventDefault(); togglePlay(); }
  else if (e.key === 'Enter' && !typing && game?.done && game.mode === 'endless') startGame();
  else if (!typing && e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key) && !e.ctrlKey && !e.metaKey) $('#q')?.focus();
});
window.addEventListener('resize', drawWave);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { applySettings(); drawWave(); });

/* ================= arranque ================= */
applySettings();
if (!Object.keys(CATALOG).length) $('#view').append(h('div', { class: 'notice' }, 'Falta catalog.js. Ejecuta: node tools/build-catalog.mjs'));
else {
  startGame();
  if (!store.seenHelp) { store.seenHelp = true; save(); $('#dlgHelp').showModal(); }
}
})();
