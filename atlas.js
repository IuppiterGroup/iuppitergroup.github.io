/* Orbis Terrarum: map engine. Content lives in atlas-data.js; geometry in atlas/data/. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const START = -3100, END = 2010, DATA = 'atlas/data/';

EVENTS.forEach((e, i) => e.id = i);

/* ---------- Time scale ---------- */
const SEG = [[-3100, -1000, 0, .22], [-1000, 500, .22, .53], [500, 1500, .53, .78], [1500, 2010, .78, 1]];
const y2t = y => { for (const [a, b, ta, tb] of SEG) if (y <= b) return ta + (Math.max(y, a) - a) / (b - a) * (tb - ta); return 1; };
const t2y = t => { for (const [a, b, ta, tb] of SEG) if (t <= tb) return a + (Math.max(t, ta) - ta) / (tb - ta) * (b - a); return END; };
const fmtYear = y => { y = Math.round(y); if (y === 0) y = 1; return y < 0 ? `${-y} B.C.` : `A.D. ${y}`; };
const auc = y => { y = Math.round(y); if (y === 0) y = -1; if (y < -753 || y > 1453) return ''; return 'A.U.C. ' + (y < 0 ? 754 + y : 753 + y); };
const eraOf = y => (ERAS.find(e => y < e[1]) || ERAS[ERAS.length - 1])[2];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Colors ---------- */
const PALETTE = ['#b8643f', '#5d7ea8', '#7a9850', '#b48a2c', '#87699f', '#3f8782', '#ad5a6c', '#6c7d3b', '#a3714a', '#4e6d98', '#97573a', '#5a8968', '#a9855a', '#78598a', '#3a789a', '#a6698a', '#8a7a3a', '#6a8aa6'];
const OVERRIDES = [
  [/holy roman/i, '#c09a2c'], [/\broman\b|\brome\b|byzant/i, '#a8302a'],
  [/\bqin\b|\bhan\b|\btang\b|\bsong\b|\bming\b|\bqing\b|\bsui\b|jin empire|\bzhou\b|\bshang\b|\bxia\b|sinic|chinese/i, '#d4aa35'],
  [/achaemenid|parthia|sasan|sassan|persia|safavid|qajar|afsharid|\bzand\b/i, '#b8662a'],
  [/mongol|golden horde|ilkhan|chagatai|\byuan\b|white horde/i, '#5d6c84'],
  [/caliphate|umayyad|abbasid|fatimid|rashidun|ayyubid|mamluk/i, '#4a7843'], [/ottoman/i, '#3b6c66'],
  [/brit|united kingdom|england|anglo-egypt/i, '#d77a8c'], [/franc|french|frank|carolingian/i, '#5265a2'],
  [/egypt|ptolem/i, '#8b993c'], [/spain|spanish|castil|new spain|viceroyalty of (peru|new granada|the r)/i, '#d08b52'],
  [/portug/i, '#5e9b88'], [/russia|muscov|moscow|novgorod|soviet/i, '#6e8e4d'], [/german|prussia/i, '#777d8e'],
  [/austria|habsburg/i, '#cbb44a'], [/netherland|dutch|holland/i, '#de8838'], [/united states/i, '#8a6aa8'],
  [/japan/i, '#c25858'], [/carthag/i, '#6a5898'], [/alexander|macedon|seleucid|greek|athen|sparta|hellen/i, '#4e7eae'],
  [/assyria/i, '#7a5135'], [/babylon/i, '#a1673a'], [/akkad|\bur\b|sumer|city-states/i, '#9a7848'], [/hittite/i, '#8a597a'],
  [/maurya|gupta|mughal|maratha|delhi/i, '#994e85'], [/\binca\b/i, '#ae6f2e'], [/aztec|mexica/i, '#2f7e8e']
];
const colorCache = new Map();
function colorFor(name) {
  if (colorCache.has(name)) return colorCache.get(name);
  let c = null;
  for (const [re, col] of OVERRIDES) if (re.test(name)) { c = col; break; }
  if (!c) { let h = 2166136261; for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); } c = PALETTE[(h >>> 0) % PALETTE.length]; }
  colorCache.set(name, c); return c;
}
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
const shade = (hex, f) => { const [r, g, b] = rgb(hex).map(v => Math.round(v * (1 - f))); return `rgb(${r},${g},${b})`; };

const C = {
  margin: '#e4d8bb', ocean: '#c9d8d2', ripple: '58,92,98', land: '#efe5c8', coast: '#4d4334', grat: 'rgba(70,90,92,.16)',
  river: '#5d8394', lake: '#c3d4cf', mount: '#8d6c48', border: 'rgba(72,48,30,.75)', people: 'rgba(110,84,54,.42)',
  halo: 'rgba(240,231,205,.88)', peopleText: '#6a5640', sea: '#4c6b74', city: '#2f241a'
};

/* ---------- Canvas & projection ---------- */
const wrap = $('#mapwrap'), canvas = $('#map'), mainCtx = canvas.getContext('2d');
let ctx = mainCtx;
const overlays = [document.querySelector('.cartouche'), document.querySelector('.mapctl')];
let dpr = Math.min(2, window.devicePixelRatio || 1), W = 0, H = 0;
const proj = d3.geoNaturalEarth1().rotate([-10, 0]).scale(1000).translate([0, 0]).precision(0.25);
function toPath(geo) { const p = new Path2D(); d3.geoPath(proj, p)(geo); return p; }
const P = {};
const hasLS = 'letterSpacing' in CanvasRenderingContext2D.prototype;

function makeTexture() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), img = g.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 200 + Math.random() * 55; img.data[i] = n; img.data[i + 1] = n * .97; img.data[i + 2] = n * .9; img.data[i + 3] = Math.random() < .5 ? 22 : 0;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(120,90,50,.06)';
  for (let i = 0; i < 40; i++) { g.beginPath(); const x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); g.quadraticCurveTo(x + Math.random() * 30 - 15, y + Math.random() * 30 - 15, x + Math.random() * 60 - 30, y + Math.random() * 60 - 30); g.stroke(); }
  return ctx.createPattern(c, 'repeat');
}
function hatchTile(color, kind) {
  const s = Math.round((kind === 'mount' ? 15 : 12) * dpr), c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.strokeStyle = color; g.lineWidth = Math.max(1, dpr * .9); g.lineCap = 'round';
  if (kind === 'mount') {
    const m = (x, y) => { g.beginPath(); g.moveTo(x - 2.4 * dpr, y + 1.6 * dpr); g.lineTo(x, y - 1.8 * dpr); g.lineTo(x + 2.4 * dpr, y + 1.6 * dpr); g.stroke(); };
    m(s * .3, s * .3); m(s * .8, s * .8);
  } else {
    g.beginPath(); for (let o = -s; o < s * 2; o += s / 2) { g.moveTo(o, s); g.lineTo(o + s, 0); } g.stroke();
  }
  return c;
}
const patternCache = new Map();
function patternFor(color, kind) {
  const key = color + kind + dpr;
  if (!patternCache.has(key)) patternCache.set(key, ctx.createPattern(hatchTile(color, kind), 'repeat'));
  return patternCache.get(key);
}
let texture = null;

/* ---------- Camera ---------- */
const cam = { k: 1, cx: 0, cy: 0 }, target = { k: 1, cx: 0, cy: 0 };
let follow = true, kWorld = 1;
function boxPlanar(box) {
  let [w, s, e, n] = box; if (e < w) e += 360;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
    const p = proj([w + (e - w) * i / 6, s + (n - s) * j / 6]); if (!p) continue;
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  return [x0, y0, x1, y1];
}
function fitBox(box, pad = .94) {
  const [x0, y0, x1, y1] = boxPlanar(box), bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
  const contain = Math.min(W / bw, H / bh) * pad, cover = Math.max(W / bw, H / bh) * pad;
  return { k: contain * Math.min(W > H * 1.1 ? 1.1 : 1.3, Math.sqrt(cover / contain)), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function camBoxFor(y) {
  const col = W < H * 1.1 ? 2 : 1;
  let i = CAM.findIndex(c => c[0] >= y); if (i <= 0) return CAM[0][col]; if (i === -1) return CAM[CAM.length - 1][col];
  const ya = CAM[i - 1][0], a = CAM[i - 1][col], yb = CAM[i][0], b = CAM[i][col];
  let t = (y - ya) / (yb - ya); t = t * t * (3 - 2 * t);
  const ca = [(a[0] + a[2]) / 2, (a[1] + a[3]) / 2], cb = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
  const sa = [a[2] - a[0], a[3] - a[1]], sb = [b[2] - b[0], b[3] - b[1]];
  const cx = ca[0] + (cb[0] - ca[0]) * t, cy = ca[1] + (cb[1] - ca[1]) * t;
  const sx = Math.exp(Math.log(sa[0]) + (Math.log(sb[0]) - Math.log(sa[0])) * t), sy = Math.exp(Math.log(sa[1]) + (Math.log(sb[1]) - Math.log(sa[1])) * t);
  return [cx - sx / 2, cy - sy / 2, cx + sx / 2, cy + sy / 2];
}
const screenX = px => W / 2 + (px - cam.cx) * cam.k, screenY = py => H / 2 + (py - cam.cy) * cam.k;

/* ---------- State ---------- */
let year = 117, playing = false, selected = null, userPicked = false;
let index = [], snaps = new Map(), cur = null, prev = null, fadeStart = 0, wantIdx = -1;
const FADE = 380;

function snapIndexFor(y) { let i = 0; for (let j = 0; j < index.length; j++) if (index[j].y <= y) i = j; return i; }
function loadSnap(i) {
  if (!snaps.has(i)) snaps.set(i, fetch(`${DATA}snap_${index[i].y}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(t => buildSnap(i, t)));
  return snaps.get(i);
}
function buildSnap(i, topo) {
  const fc = topojson.feature(topo, topo.objects.p);
  const groups = new Map(), vgroups = new Map(), stateB = new Path2D(), peopleB = new Path2D(), feats = [];
  for (const f of fc.features) {
    const p = f.properties, path = toPath(f); p.n = NAME_FIX[p.n] || p.n;
    const color = p.c === 's' ? colorFor(p.n) : null;
    if (p.c === 's') {
      const g = p.v ? vgroups : groups, key = p.v ? colorFor(p.v) : color;
      if (!g.has(key)) g.set(key, new Path2D()); g.get(key).addPath(path); stateB.addPath(path);
    } else peopleB.addPath(path);
    const lp = proj(p.l) || [0, 0]; const bb = boxPlanar(p.b);
    feats.push({ n: p.n, c: p.c, v: p.v, a: p.a, path, color: p.v ? colorFor(p.v) : color, lx: lp[0], ly: lp[1], bw: bb[2] - bb[0], bh: bb[3] - bb[1], box: p.b });
  }
  feats.sort((a, b) => b.a - a.a);
  return { i, y: index[i].y, feats, stateB, peopleB, groups: [...groups].map(([c, path]) => ({ c, path, fill: rgba(c, .17), band: rgba(c, .55) })), vgroups: [...vgroups].map(([c, path]) => ({ c, path, band: rgba(c, .35) })) };
}
function setSnapFor(y) {
  const i = snapIndexFor(y);
  if (cur && cur.i === i) return;
  wantIdx = i;
  loadSnap(i).then(s => {
    if (wantIdx !== i) return;
    prev = cur; cur = s; fadeStart = performance.now(); updatePanel(); kick();
    [i - 1, i + 1].forEach(j => { if (j >= 0 && j < index.length) loadSnap(j).catch(() => {}); });
  }).catch(() => { $('#snap').textContent = 'Borders unavailable for this age'; });
}

/* ---------- Drawing ---------- */
function drawPolitics(S, alpha, k) {
  if (!S || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  const band = Math.max(2.4, Math.min(7, 2.4 * Math.sqrt(k / kWorld))) / k;
  for (const g of S.groups) {
    ctx.fillStyle = g.fill; ctx.fill(g.path);
    ctx.save(); ctx.clip(g.path); ctx.lineWidth = band * 2; ctx.strokeStyle = g.band; ctx.stroke(g.path); ctx.restore();
  }
  for (const g of S.vgroups) {
    const pat = patternFor(rgba(g.c, .55), 'hatch'); pat.setTransform(new DOMMatrix().scale(1 / (k * dpr)));
    ctx.fillStyle = pat; ctx.fill(g.path);
    ctx.save(); ctx.clip(g.path); ctx.lineWidth = band * 1.4; ctx.strokeStyle = g.band; ctx.stroke(g.path); ctx.restore();
  }
  ctx.setLineDash([1 / k, 2.2 / k]); ctx.lineWidth = .7 / k; ctx.strokeStyle = C.people; ctx.stroke(S.peopleB);
  ctx.setLineDash([5 / k, 1.6 / k, 1.2 / k, 1.6 / k]); ctx.lineWidth = .9 / k; ctx.strokeStyle = C.border; ctx.stroke(S.stateB);
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}

const labelRects = [];
const hit = (r) => { for (const q of labelRects) if (r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]) return true; return false; };
function spaced(text, em) {
  if (hasLS) { ctx.letterSpacing = em ? `${em}px` : '0px'; return text; }
  return em ? text.split('').join(' ') : text;
}
function drawText(lines, x, y, fs, font, color, em, alpha = 1, nudge = false) {
  ctx.font = font(fs); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lh = fs * 1.05, shown = lines.map(l => spaced(l, em));
  const ws = shown.map(s => ctx.measureText(s).width), w = Math.max(...ws), h = lh * lines.length;
  if (nudge && x > 0 && x < W) { const lo = w / 2 + 6, hi = W - w / 2 - 6; const nx = Math.min(hi, Math.max(lo, x)); if (Math.abs(nx - x) < w * .4) x = nx; }
  const r = [x - w / 2 - 2, y - h / 2 - 1, x + w / 2 + 2, y + h / 2 + 1];
  if (r[0] < 3 || r[2] > W - 3 || r[1] < 3 || r[3] > H - 3 || hit(r)) { if (hasLS) ctx.letterSpacing = '0px'; return false; }
  labelRects.push(r);
  ctx.globalAlpha = alpha; ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(2.5, fs * .22); ctx.strokeStyle = C.halo; ctx.fillStyle = color;
  shown.forEach((s, i) => { const yy = y - h / 2 + lh * (i + .5); ctx.strokeText(s, x, yy); ctx.fillText(s, x, yy); });
  ctx.globalAlpha = 1; if (hasLS) ctx.letterSpacing = '0px';
  return true;
}
function splitTwo(name) {
  const w = name.split(' '); if (w.length < 2) return [name];
  let best = 1, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' ').length, b = w.slice(i).join(' ').length; if (Math.abs(a - b) < bd) { bd = Math.abs(a - b); best = i; } }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}
const FONT_SC = fs => `${fs}px 'IM Fell English SC', 'Palatino Linotype', Palatino, Georgia, serif`;
const FONT_IT = fs => `italic ${fs}px 'IM Fell English', 'Palatino Linotype', Palatino, Georgia, serif`;
function drawLabels(S) {
  labelRects.length = 0;
  const wr = wrap.getBoundingClientRect();
  const reserve = [...overlays, ...markerEls.values()]; if (flagEl && !flagEl.hidden) reserve.push(flagEl);
  for (const el of reserve) { const q = el.getBoundingClientRect(); labelRects.push([q.left - wr.left - 4, q.top - wr.top - 4, q.right - wr.left + 4, q.bottom - wr.top + 4]); }
  const zoom = cam.k / kWorld;
  // cities (dots first so labels avoid them)
  const cityRank = zoom > 4.5 ? 3 : zoom > 2.2 ? 2 : 1, cityLbl = [];
  for (const c of CITIES) {
    if (year < c[3] || year > c[4] || c[5] > cityRank) continue;
    const p = proj([c[1], c[2]]); if (!p) continue;
    const x = screenX(p[0]), y = screenY(p[1]); if (x < -20 || x > W + 20 || y < -20 || y > H + 20) continue;
    const r = c[5] === 1 ? 3.4 : 2.6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#f3ead4'; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = C.city; ctx.stroke();
    if (c[5] === 1) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fillStyle = C.city; ctx.fill(); }
    labelRects.push([x - r - 1, y - r - 1, x + r + 1, y + r + 1]);
    cityLbl.push([c, x, y]);
  }
  // realms
  let n = 0;
  if (S) for (const f of S.feats) {
    if (n > 70) break;
    const sw = f.bw * cam.k, sh = f.bh * cam.k; if (sw < 26 || sh < 10) continue;
    const x = screenX(f.lx), y = screenY(f.ly);
    if (f.c === 's') {
      const name = f.n.toUpperCase();
      let lines = [name], fs = Math.min(30, sw / (name.length * .78), sh * .42);
      const two = splitTwo(name);
      if (two.length === 2) { const fs2 = Math.min(30, sw / (Math.max(two[0].length, two[1].length) * .78), sh * .3); if (fs2 > fs * 1.25) { lines = two; fs = fs2; } }
      if (fs < 9) continue;
      let done = false;
      for (const m of [1, .8, .64]) {
        if (fs * m < 9 || done) break;
        for (const dy of [0, 1.25, -1.25]) { if (drawText(lines, x, y + dy * fs * m * lines.length, fs * m, FONT_SC, shade(f.color, .5), fs * m * .12, 1, true)) { n++; done = true; break; } }
      }
    } else if (zoom > 1.3 || f.a > 2e6) {
      let lines = [f.n], fs = Math.min(15, sw / (f.n.length * .55), sh * .4);
      const two = splitTwo(f.n);
      if (two.length === 2) { const fs2 = Math.min(15, sw / (Math.max(two[0].length, two[1].length) * .55), sh * .28); if (fs2 > fs * 1.2) { lines = two; fs = fs2; } }
      if (fs < 9.5) continue;
      if (drawText(lines, x, y, fs, FONT_IT, C.peopleText, 0, .9)) n++;
    }
  }
  // seas
  for (const s of SEAS) {
    if (s[3] > (zoom > 4 ? 3 : zoom > 1.8 ? 2 : 1)) continue;
    if (s[4] && (year < s[5] || year > s[6])) { /* plain name outside the Latin era */ }
    const p = proj([s[1], s[2]]); if (!p) continue;
    const fs = Math.max(10, Math.min(16, 9 + zoom * 1.2));
    const lines = [s[0].toUpperCase()]; const latin = s[4] && year >= s[5] && year <= s[6];
    if (drawText(lines, screenX(p[0]), screenY(p[1]), fs, FONT_IT, C.sea, fs * .28, .85) && latin)
      drawText([s[4]], screenX(p[0]), screenY(p[1]) + fs * 1.15, fs * .85, FONT_IT, C.sea, 0, .8);
  }
  // city names last, they give way to realm names
  for (const [c, x, y] of cityLbl) {
    const fs = c[5] === 1 ? 13 : 12;
    ctx.font = FONT_IT(fs); const w = ctx.measureText(c[0]).width;
    for (const [dx, al] of [[6, 'left'], [-6, 'right']]) {
      const x0 = al === 'left' ? x + dx : x + dx - w, r = [x0 - 1, y - fs * .6, x0 + w + 1, y + fs * .6];
      if (hit(r) || r[0] < 3 || r[2] > W - 3) continue;
      labelRects.push(r); ctx.textAlign = al; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = C.halo; ctx.fillStyle = C.city;
      ctx.strokeText(c[0], x + dx, y); ctx.fillText(c[0], x + dx, y); break;
    }
  }
}

function drawWorld(g, w, h, k, cx, cy, now) {
  const saved = ctx; ctx = g;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = C.margin; ctx.fillRect(0, 0, w, h);
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (w / 2 - cx * k), dpr * (h / 2 - cy * k));
  ctx.fillStyle = C.ocean; ctx.fill(P.sphere);
  ctx.lineWidth = .6 / k; ctx.strokeStyle = C.grat; ctx.stroke(P.grat);
  // engraved water lines around every coast
  ctx.lineJoin = 'round';
  for (const [lw, a] of [[17, .1], [12, .14], [7.5, .2], [3.6, .3]]) {
    ctx.lineWidth = lw / k; ctx.strokeStyle = `rgba(${C.ripple},${a})`; ctx.stroke(P.land);
    ctx.lineWidth = (lw - 1.5) / k; ctx.strokeStyle = C.ocean; ctx.stroke(P.land);
  }
  ctx.fillStyle = C.land; ctx.fill(P.land);
  const mp = patternFor('rgba(141,108,72,.38)', 'mount'); mp.setTransform(new DOMMatrix().scale(1 / (k * dpr)));
  ctx.fillStyle = 'rgba(141,108,72,.06)'; ctx.fill(P.mount); ctx.fillStyle = mp; ctx.fill(P.mount);
  const t = Math.min(1, (now - fadeStart) / FADE);
  if (prev && t < 1) drawPolitics(prev, 1 - t, k);
  drawPolitics(cur, prev && t < 1 ? t : 1, k);
  ctx.fillStyle = C.lake; ctx.fill(P.lakes); ctx.lineWidth = .6 / k; ctx.strokeStyle = 'rgba(58,92,98,.6)'; ctx.stroke(P.lakes);
  const zoom = k / kWorld;
  ctx.strokeStyle = C.river; ctx.lineCap = 'round';
  ctx.lineWidth = 1.5 / k; ctx.stroke(P.riv1);
  if (zoom > 1.4) { ctx.lineWidth = 1 / k; ctx.stroke(P.riv2); }
  if (zoom > 3) { ctx.lineWidth = .7 / k; ctx.stroke(P.riv3); }
  ctx.lineWidth = 1 / k; ctx.strokeStyle = C.coast; ctx.stroke(P.land);
  ctx.lineWidth = 1.4 / k; ctx.stroke(P.sphere);
  ctx = saved;
  return t < 1;
}

// The engraved base and the realms are drawn once into a larger offscreen plate, then moved and scaled each frame.
const plate = { cv: document.createElement('canvas'), k: 0, cx: 0, cy: 0, w: 0, h: 0, key: '' };
function plateFits(key) {
  if (plate.key !== key || !plate.k) return false;
  const r = cam.k / plate.k; if (r < .9 || r > 1.12) return false;
  const vx0 = cam.cx - W / 2 / cam.k, vx1 = cam.cx + W / 2 / cam.k, vy0 = cam.cy - H / 2 / cam.k, vy1 = cam.cy + H / 2 / cam.k;
  const px0 = plate.cx - plate.w / 2 / plate.k, px1 = plate.cx + plate.w / 2 / plate.k, py0 = plate.cy - plate.h / 2 / plate.k, py1 = plate.cy + plate.h / 2 / plate.k;
  return vx0 >= px0 && vx1 <= px1 && vy0 >= py0 && vy1 <= py1;
}
function render(now) {
  if (!P.land) return false;
  const fading = prev && now - fadeStart < FADE;
  let busy = false;
  if (fading) busy = drawWorld(ctx, W, H, cam.k, cam.cx, cam.cy, now);
  else {
    const key = cur ? 's' + cur.i : 'none';
    if (!plateFits(key)) {
      plate.w = Math.round(W * 1.5); plate.h = Math.round(H * 1.5); plate.k = cam.k; plate.cx = cam.cx; plate.cy = cam.cy; plate.key = key;
      plate.cv.width = Math.round(plate.w * dpr); plate.cv.height = Math.round(plate.h * dpr);
      drawWorld(plate.cv.getContext('2d'), plate.w, plate.h, plate.k, plate.cx, plate.cy, now);
    }
    const s = cam.k / plate.k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = C.margin; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 + (plate.cx - cam.cx) * cam.k - plate.w / 2 * s), dpr * (H / 2 + (plate.cy - cam.cy) * cam.k - plate.h / 2 * s));
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(plate.cv, 0, 0, plate.w, plate.h);
  }
  // paper, vignette, labels in screen space
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = texture; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .62);
  vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(150,115,70,.32)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  placeMarkers();
  drawLabels(cur);
  return busy;
}

/* ---------- Markers ---------- */
const markersEl = $('#markers'), markerEls = new Map(); let flagEl = null;
const persist = y => y < -1000 ? 260 : y < 0 ? 120 : y < 1500 ? 60 : 30;
const liveEvents = () => EVENTS.filter(e => year >= e.y && year - e.y <= persist(e.y));
function placeMarkers() {
  const live = new Set(liveEvents().map(e => e.id));
  if (selected && !live.has(selected.id) && !playing) live.add(selected.id);
  for (const [id, el] of markerEls) if (!live.has(id)) { el.remove(); markerEls.delete(id); }
  for (const id of live) {
    const e = EVENTS[id]; let el = markerEls.get(id);
    if (!el) {
      el = document.createElement('button'); el.className = 'ev'; el.setAttribute('aria-label', `${e.d}: ${e.t}`); el.innerHTML = '<i></i>';
      el.addEventListener('click', ev => { ev.stopPropagation(); pickEvent(e, false); });
      markersEl.appendChild(el); markerEls.set(id, el);
    }
    const p = proj(e.ll); const x = screenX(p[0]), y = screenY(p[1]);
    el.hidden = x < 0 || x > W || y < 0 || y > H;
    el.style.transform = `translate(${x}px, ${y}px)`; el.classList.toggle('on', selected && selected.id === id);
  }
  if (selected && markerEls.has(selected.id) && !markerEls.get(selected.id).hidden) {
    if (!flagEl) { flagEl = document.createElement('div'); flagEl.className = 'flag'; markersEl.appendChild(flagEl); }
    const p = proj(selected.ll); let x = screenX(p[0]), y = screenY(p[1]);
    flagEl.textContent = selected.t; flagEl.hidden = false;
    const fw = flagEl.offsetWidth; const flip = x + 14 + fw > W - 8;
    flagEl.style.transform = flip ? `translate(${x - 14 - fw}px, ${y}px) translateY(-50%)` : `translate(${x + 14}px, ${y}px) translateY(-50%)`;
  } else if (flagEl) flagEl.hidden = true;
}

/* ---------- Animation loop ---------- */
let raf = 0, last = 0;
function kick() { if (!raf) raf = requestAnimationFrame(frame); }
function frame(now) {
  raf = 0; const dt = Math.min(64, now - (last || now)); last = now;
  let busy = false;
  if (playing) {
    const sp = year < -1000 ? 90 : year < 0 ? 50 : year < 1500 ? 34 : 16;
    setYear(year + sp * dt / 1000, true); busy = true;
    if (year >= END) { playing = false; setPlayIcon(); }
  }
  if (follow) Object.assign(target, fitBox(camBoxFor(year)));
  const a = reduceMotion ? 1 : 1 - Math.exp(-dt / 170);
  const lk = Math.log(cam.k), tk = Math.log(target.k);
  if (Math.abs(lk - tk) > 1e-4 || Math.abs(cam.cx - target.cx) * cam.k > .3 || Math.abs(cam.cy - target.cy) * cam.k > .3) {
    cam.k = Math.exp(lk + (tk - lk) * a); cam.cx += (target.cx - cam.cx) * a; cam.cy += (target.cy - cam.cy) * a; busy = true;
  }
  syncZoom();
  if (render(now)) busy = true;
  if (busy) kick(); else last = 0;
}

/* ---------- Zoom / pan ---------- */
const zoomer = d3.zoom().clickDistance(5).on('zoom', ev => {
  if (!ev.sourceEvent) return;
  const t = ev.transform; cam.k = t.k; cam.cx = (W / 2 - t.x) / t.k; cam.cy = (H / 2 - t.y) / t.k;
  Object.assign(target, cam); setFollow(false); $('#tip').hidden = true; kick();
});
const sel = d3.select(canvas).call(zoomer);
function syncZoom() { canvas.__zoom = d3.zoomIdentity.translate(W / 2 - cam.cx * cam.k, H / 2 - cam.cy * cam.k).scale(cam.k); }
function setFollow(on) { follow = on; $('#follow').setAttribute('aria-pressed', String(on)); if (on) kick(); }
$('#follow').addEventListener('click', () => setFollow(!follow));
$('#zin').addEventListener('click', () => { setFollow(false); target.k = Math.min(kWorld * 40, target.k * 1.7); kick(); });
$('#zout').addEventListener('click', () => { setFollow(false); target.k = Math.max(kWorld * .8, target.k / 1.7); kick(); });

canvas.addEventListener('click', ev => {
  const tip = $('#tip'); if (!cur) return;
  const r = canvas.getBoundingClientRect(), sx = ev.clientX - r.left, sy = ev.clientY - r.top;
  const px = (sx - W / 2) / cam.k + cam.cx, py = (sy - H / 2) / cam.k + cam.cy;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let found = null;
  for (let i = cur.feats.length - 1; i >= 0; i--) { const f = cur.feats[i]; if (f.c === 's' && ctx.isPointInPath(f.path, px, py)) { found = f; break; } }
  if (!found) for (let i = cur.feats.length - 1; i >= 0; i--) { const f = cur.feats[i]; if (f.c === 'p' && ctx.isPointInPath(f.path, px, py)) { found = f; break; } }
  if (!found) { tip.hidden = true; return; }
  tip.innerHTML = '';
  const b = document.createElement('b'); b.textContent = found.n; tip.appendChild(b);
  const s = document.createElement('span'); s.textContent = found.v ? `Client of ${found.v}` : found.c === 'p' ? 'Peoples without a state' : `About ${Math.round(found.a / 1000).toLocaleString()} thousand sq. km`;
  tip.appendChild(s); tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = Math.min(W - tw - 8, Math.max(8, sx + 12)) + 'px'; tip.style.top = Math.min(H - th - 8, Math.max(8, sy + 12)) + 'px';
});

/* ---------- Timeline ---------- */
const track = $('#track'), thumb = $('#thumb');
function buildTimeline() {
  const eras = $('#eras'); eras.innerHTML = '';
  const SHORT = { 'Bronze Age': 'Bronze', 'Iron Age': 'Iron', 'Classical Antiquity': 'Classical', 'Middle Ages': 'Medieval', 'Early Modern': 'Early Mod.', 'Modern Age': 'Modern' };
  for (const [a, b, name] of ERAS) {
    const d = document.createElement('div'); d.className = 'era'; d.style.left = (y2t(a) * 100) + '%'; d.style.width = ((y2t(b) - y2t(a)) * 100) + '%';
    const s = document.createElement('span'); s.innerHTML = '<span class="long"></span><span class="short"></span>';
    s.firstChild.textContent = name; s.lastChild.textContent = SHORT[name]; d.appendChild(s); d.title = name; eras.appendChild(d);
  }
  const ticks = $('#ticks'); ticks.innerHTML = '';
  for (const e of EVENTS) { const d = document.createElement('div'); d.className = 'tick'; d.style.left = (y2t(e.y) * 100) + '%'; ticks.appendChild(d); }
  requestAnimationFrame(fitEraLabels);
  const sc = $('#scale'); sc.innerHTML = '';
  for (const y of [-3000, -2000, -1000, -500, 1, 500, 1000, 1500, 2000]) {
    const s = document.createElement('span'); s.style.left = (y2t(y) * 100) + '%'; s.textContent = y < 0 ? `${-y} BC` : y === 1 ? 'AD 1' : `${y}`;
    if ([-2000, -500, 500, 1500].includes(y)) s.className = 'minor';
    if (y === -3000) s.style.transform = 'translateX(-20%)'; if (y === 2000) s.style.transform = 'translateX(-85%)'; sc.appendChild(s);
  }
}
function fitEraLabels() {
  for (const era of document.querySelectorAll('.era')) {
    const sp = era.firstElementChild, room = era.clientWidth - 6; sp.className = '';
    if (sp.offsetWidth > room) { sp.className = 'is-short'; if (sp.offsetWidth > room) sp.className = 'is-none'; }
  }
  const sc = $('#scale'); sc.classList.toggle('tight', sc.clientWidth < 760);
}
new ResizeObserver(fitEraLabels).observe(track);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitEraLabels);
function setYear(y, fromPlay) {
  year = Math.max(START, Math.min(END, y));
  const shown = fromPlay ? Math.round(year / 10) * 10 || 1 : Math.round(year);
  $('#yr').textContent = fmtYear(shown); $('#ageYear').textContent = fmtYear(shown); $('#auc').textContent = auc(shown);
  $('#eraName').textContent = eraOf(year);
  thumb.style.left = (y2t(year) * 100) + '%';
  track.setAttribute('aria-valuenow', String(Math.round(year))); track.setAttribute('aria-valuetext', fmtYear(shown));
  setSnapFor(year);
  if (!userPicked || (selected && !(year >= selected.y && year - selected.y <= persist(selected.y)))) {
    userPicked = false; const live = liveEvents(); const nsel = live.length ? live[live.length - 1] : null;
    if (nsel !== selected) { selected = nsel; renderChron(); }
  }
  if (cur) $('#snap').textContent = `Borders c. ${fmtYear(cur.y === -1 ? -1 : cur.y)}`;
  updatePanelThrottled(); kick();
}
let dragging = false;
function yearFromPointer(ev) { const r = track.getBoundingClientRect(); return Math.round(t2y(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width))) / 10) * 10 || 1; }
track.addEventListener('pointerdown', ev => { dragging = true; track.setPointerCapture(ev.pointerId); stopPlay(); setYear(yearFromPointer(ev)); });
track.addEventListener('pointermove', ev => { if (dragging) setYear(yearFromPointer(ev)); });
track.addEventListener('pointerup', () => { dragging = false; renderChron(); });
track.addEventListener('keydown', ev => {
  const step = ev.shiftKey ? 100 : 10;
  if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { stopPlay(); setYear(year + step); ev.preventDefault(); }
  else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { stopPlay(); setYear(year - step); ev.preventDefault(); }
  else if (ev.key === ' ') { togglePlay(); ev.preventDefault(); }
});
$('#back').addEventListener('click', () => { stopPlay(); setYear(Math.round((year - 10) / 10) * 10 || -1); renderChron(); });
$('#fwd').addEventListener('click', () => { stopPlay(); setYear(Math.round((year + 10) / 10) * 10 || 1); renderChron(); });
function setPlayIcon() { $('#playIcon').innerHTML = playing ? '<path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/>' : '<path d="M4 2.5v11l9-5.5z"/>'; $('#play').setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
function stopPlay() { if (playing) { playing = false; setPlayIcon(); } }
function togglePlay() { playing = !playing; if (playing) { if (year >= END) setYear(START); userPicked = false; setFollow(true); } setPlayIcon(); kick(); }
$('#play').addEventListener('click', togglePlay);
$('#fromStart').addEventListener('click', () => { setYear(START); userPicked = false; playing = true; setFollow(true); setPlayIcon(); kick(); });

/* ---------- Panel ---------- */
function pickEvent(e, fly) {
  stopPlay(); selected = e; userPicked = true; setYear(e.y);
  if (fly) {
    const base = fitBox(camBoxFor(e.y)), p = proj(e.ll);
    setFollow(false); target.k = Math.max(base.k * 1.9, target.k); target.cx = p[0]; target.cy = p[1];
  }
  renderChron(); kick();
}
function renderChron() {
  const el = $('#chron'); el.innerHTML = '';
  const past = EVENTS.filter(e => e.y <= year && year - e.y <= 900).slice(-3).reverse();
  const ahead = EVENTS.find(e => e.y > year);
  const list = past.map(e => [e, false]); if (ahead) list.push([ahead, true]);
  if (!list.length) { el.textContent = 'No entries yet for this age.'; return; }
  for (const [e, isAhead] of list) {
    const on = selected && selected.id === e.id;
    const card = document.createElement('article'); card.className = 'entry' + (on ? ' on' : '') + (isAhead ? ' ahead' : '');
    const hd = document.createElement('button'); hd.className = 'hd'; hd.addEventListener('click', () => pickEvent(e, true));
    hd.innerHTML = `<div class="dt"></div><div class="nm"></div>`;
    hd.querySelector('.dt').textContent = isAhead ? `Ahead · ${e.d}` : e.d; hd.querySelector('.nm').textContent = e.t;
    card.appendChild(hd);
    if (on || (!selected && e === past[0])) {
      const p = document.createElement('p'); p.textContent = e.x; card.appendChild(p);
      const pl = document.createElement('div'); pl.className = 'pl'; pl.textContent = e.p; card.appendChild(pl);
    }
    el.appendChild(card);
  }
}
let panelTimer = 0;
function updatePanelThrottled() { if (!panelTimer) panelTimer = setTimeout(() => { panelTimer = 0; updatePanel(); }, 120); }
let lastRealmKey = '';
function updatePanel() {
  if (!cur) return;
  $('#snap').textContent = `Borders c. ${fmtYear(cur.y)}`;
  const realms = cur.feats.filter(f => f.c === 's' && !f.v && !/states$|minor|^\s*$/i.test(f.n)).slice(0, 7);
  const key = cur.i + ':' + realms.map(r => r.n).join('|'); if (key === lastRealmKey) return; lastRealmKey = key;
  const ul = $('#realms'); ul.innerHTML = '';
  for (const f of realms) {
    const li = document.createElement('li'), b = document.createElement('button');
    b.innerHTML = '<span class="sw"></span><span></span>';
    b.firstChild.style.background = f.color; b.firstChild.style.borderColor = shade(f.color, .3); b.lastChild.textContent = f.n;
    b.addEventListener('click', () => { setFollow(false); Object.assign(target, fitBox(f.box, .8)); kick(); });
    li.appendChild(b); ul.appendChild(li);
  }
}

/* ---------- Resize & boot ---------- */
function resize() {
  const r = wrap.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
  dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  patternCache.clear(); texture = makeTexture(); plate.key = '';
  kWorld = fitBox([-180, -60, 180, 82], .98).k;
  zoomer.scaleExtent([kWorld * .8, kWorld * 40]);
  if (follow) Object.assign(target, fitBox(camBoxFor(year)));
  kick();
}
new ResizeObserver(resize).observe(wrap);

async function boot() {
  buildTimeline();
  try {
    const [idx, base] = await Promise.all([fetch(DATA + 'index.json').then(r => r.json()), fetch(DATA + 'base.json').then(r => r.json())]);
    index = idx;
    const land = topojson.feature(base, base.objects.land);
    P.land = toPath(land); P.lakes = toPath(topojson.feature(base, base.objects.lakes)); P.mount = toPath(topojson.feature(base, base.objects.mountains));
    const rv = topojson.feature(base, base.objects.rivers).features;
    P.riv1 = toPath({ type: 'FeatureCollection', features: rv.filter(f => f.properties.r <= 2) });
    P.riv2 = toPath({ type: 'FeatureCollection', features: rv.filter(f => f.properties.r > 2 && f.properties.r <= 4) });
    P.riv3 = toPath({ type: 'FeatureCollection', features: rv.filter(f => f.properties.r > 4) });
    P.sphere = toPath({ type: 'Sphere' }); P.grat = toPath(d3.geoGraticule10());
    resize(); Object.assign(cam, target);
    await loadSnap(snapIndexFor(year)).then(s => { cur = s; });
    if (document.fonts && document.fonts.load) await Promise.race([Promise.all([document.fonts.load(FONT_SC(20)), document.fonts.load(FONT_IT(20))]), new Promise(r => setTimeout(r, 2500))]);
    $('#loading').hidden = true;
    selected = EVENTS.find(e => e.y === 117); setYear(117); renderChron(); updatePanel(); kick();
  } catch (err) {
    console.error(err);
    $('#loading').textContent = 'The map data did not load. Reload the page to try again.';
  }
}
boot();
})();
