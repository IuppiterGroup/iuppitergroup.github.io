// Orbis Terrarum: writes a page for every year on the timeline and for every realm, so each has its own address.
//   node atlas/build/pages.mjs        (run from the repository root, after any change to atlas.html or the atlas data)
// Writes atlas/year/<year>.html, atlas/realm/<name>.html, atlas/realms.html, the index inside atlas.html, sitemap.xml.
// Each page is atlas.html opened at that year or realm (data-year, data-view on <body>), with a written almanac
// beneath the map drawn from the same data the map uses: atlas/data (borders), atlas/info (rulers, capitals, events).
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://jupitergroup.org';
const START = -3100, END = 2024;
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const { EVENTS, ERAS } = new Function(fs.readFileSync('atlas-data.js', 'utf8') + ';return { EVENTS, ERAS };')();
const CARDS = rd('atlas/info/realms.json'), SPANS = rd('atlas/data/realms.json'), WINDOWS = rd('atlas/data/windows.json');
const have = new Set(EVENTS.map(e => e.y + '|' + e.t));
for (const e of EVENTS) e.lvl = e.lvl || 1;
for (const e of rd('atlas/info/events.json')) if (!have.has(e.y + '|' + e.t)) EVENTS.push(e);
EVENTS.sort((a, b) => a.y - b.y || a.lvl - b.lvl);

/* ---------- the same rules as atlas.js ---------- */
const fmtYear = y => { y = Math.round(y); if (y === 0) y = 1; return y < 0 ? `${-y} B.C.` : `A.D. ${y}`; };
const fmtSpan = y => { y = Math.round(y); if (y === 0) y = 1; return y < 0 ? `${-y} B.C.` : `${y}`; };
const eraOf = y => (ERAS.find(e => y < e[1]) || ERAS[ERAS.length - 1])[2];
const stepFor = y => y < -1200 ? 100 : y < -500 ? 25 : y < 1500 ? 10 : 5;
const snapYear = y => { const s = stepFor(y); let r = Math.round(y / s) * s; if (r === 0) r = y < 0 ? -1 : 1; return Math.max(START, Math.min(END, r)); };
const ERA_SAY = { 'Bronze Age': 'the Bronze Age', 'Iron Age': 'the Iron Age', 'Classical Antiquity': 'classical antiquity', 'Middle Ages': 'the Middle Ages', 'Early Modern': 'the early modern age', 'Modern Age': 'the modern age' };
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const yearSlug = y => y < 0 ? `${-y}-bc` : `${y}`;
const bare = n => n.replace(/^\(|\)$/g, '');
const fmtArea = a => a >= 1e6 ? `about ${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1)} million sq. km` : a >= 1e4 ? `about ${Math.round(a / 1e3).toLocaleString('en-US')} thousand sq. km` : `about ${(Math.round(a / 100) * 100 || a).toLocaleString('en-US')} sq. km`;
const NO_UNIFY = new Set(['(British Empire)', '(Spanish Empire)', '(Portuguese Empire)', '(Netherlands)', '(Dutch Republic)', '(Batavian Republic)',
  '(French First Republic)', '(French Directory)', '(French Consulate)', '(First French Empire)', '(Bourbon Kingdom of France)', '(French Second Republic)',
  '(Second French Empire)', '(French Third Republic)', '(Vichy France)', '(French Fourth Republic)', '(Russian Federation)', '(Commonwealth of Nations)',
  '(July Monarchy)', '(Kingdom of Holland)']);
const cardOf = n => CARDS[n] || CARDS[bare(n)] || CARDS[`(${n})`];
function rulerAt(n, y) {
  const c = cardOf(n); if (!c || !c.rulers) return '';
  const now = c.rulers.filter(r => r[1] <= y && y <= r[2]).sort((a, b) => a[1] - b[1]);
  if (!now.length) return '';
  const fmt = r => `${r[0]} (${r[2] >= END ? `from ${fmtSpan(r[1])}` : r[1] === r[2] ? fmtSpan(r[1]) : `${fmtSpan(r[1])} to ${fmtSpan(r[2])}`})`;
  if (y >= END) {
    const office = r => {
      const m = r[0].match(/\(([^()]*)\)[^()]*$/), role = (m ? m[1].toLowerCase() : '').split(/\bthen\b/).pop().replace(/^[\s,]+|[\s,]+$/g, '');
      return /prime minister|chief adviser|premier|chancellor/.test(role) ? 'pm' : /president/.test(role) ? 'pres' : /^rama |^[ivxl]+$/.test(role) ? '' : role;
    };
    const at = new Map(c.rulers.map((r, i) => [r, i])), by = new Map();
    for (const r of now) { const k = office(r), o = by.get(k); if (!o || r[1] > o[1] || (r[1] === o[1] && at.get(r) > at.get(o))) by.set(k, r); }
    const keep = [...by.values()].sort((a, b) => a[1] - b[1]);
    if (keep.length === 1 && keep[0][1] === y) {
      const before = now.filter(r => r !== keep[0] && r[1] < y && office(r) === office(keep[0])).sort((a, b) => b[1] - a[1])[0];
      if (before) return `${before[0]} (${fmtSpan(before[1])} to ${fmtSpan(y)}), then ${fmt(keep[0])}`;
    }
    return keep.slice(0, 2).map(fmt).join(' and ');
  }
  const last = now[now.length - 1];
  const succ = now.length > 1 && last[1] === y && now.slice(0, -1).every(r => r[2] === y && r[1] < y);
  if (succ) return now.slice(-2).map(fmt).join(', then ');
  return now.slice(0, 2).map(fmt).join(' and ');
}
const capitalAt = (n, y) => { const c = cardOf(n); return !c || !c.cap ? '' : c.cap.filter(r => r[1] <= y && y <= r[2]).map(r => r[0]).join(' and '); };

/* ---------- borders: only the facts about each shape are needed here, not its outline ---------- */
const WIN = WINDOWS.map(([a, b, file]) => ({ a, b, rows: rd('atlas/data/' + file).objects.s.geometries.map(g => g.properties) }));
const winFor = y => { let k = 0; for (let i = 0; i < WIN.length; i++) if (WIN[i].a <= y) k = i; return WIN[k]; };
function sceneAt(y) {
  const act = winFor(y).rows.filter(f => f.f <= y && y <= f.t);
  const comps = new Map();
  for (const f of act) if (f.k === 'c' && !NO_UNIFY.has(f.n) && (!comps.has(f.n) || comps.get(f.n).a < f.a)) comps.set(f.n, f);
  const plain = act.filter(f => f.k === 'p');
  for (const f of plain) f._top = (f.m ? f.m.split(';').map(s => s.trim()) : []).filter(n => comps.has(n)).map(n => comps.get(n)).sort((p, q) => q.a - p.a)[0] || null;
  return plain;
}
const MINOR = /minor states|tribes|peoples/i;
function greatRealms(plain, box, limit, only) {
  const seen = new Map();
  for (const f of plain) {
    const ent = f._top ? { n: bare(f._top.n), a: f._top.a, b: f._top.b } : { n: f.n, a: f.a, b: f.b };
    if (MINOR.test(ent.n)) continue;
    let w = ent.a;
    if (box) {
      // a realm belongs to a region when the heart of its land lies there; the pieces of a composite add up
      const l = f.l; if (!l || l[0] < box[0] || l[0] > box[2] || l[1] < box[1] || l[1] > box[3] || (only && !only(l[0], l[1]))) continue;
      w = f.a;
      if (seen.has(ent.n)) { seen.get(ent.n).w += w; continue; }
    }
    if (!seen.has(ent.n) || seen.get(ent.n).w < w) seen.set(ent.n, { ...ent, w });
  }
  return [...seen.values()].sort((p, q) => q.w - p.w).slice(0, limit);
}
// each region: the box the map opens on, and where a box alone would take in a neighbor, the line between them
const eastOfRedSea = (x, y) => y > 12.5 && x > (y > 30 ? 34.5 : 32.5 + (30 - y) * 0.6);
const REGIONS = [
  ['Europe', [-12, 35.8, 45, 71], (x, y) => !(x > 26 && y < 41)],
  ['The Near East', [25, 12, 63, 43], (x, y) => x > 34.5 || y > 31 || eastOfRedSea(x, y)],
  ['India and Central Asia', [60, 5, 97, 52]],
  ['East Asia', [97, -11, 150, 55]],
  ['Africa', [-20, -36, 52, 37.5], (x, y) => !eastOfRedSea(x, y) && !(x > 25 && y > 31.8 && x > 34.2)],
  ['The Americas', [-170, -56, -30, 72]]
];

/* ---------- which realms get a page ---------- */
// The armed factions of wars still being fought are drawn on the map but get no page of their own.
const NO_PAGE = /^(houthi|haftar|rapid support|resistance-held|rebel-held|wa state$|rojava$|islamic state$|somaliland$|kurdistan region$|iraqi kurdistan$|transnistria$|abkhazia$|south ossetia$|republic of artsakh$)/i;
const slugify = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const peak = new Map();   // name as drawn -> its largest shape
for (const w of WIN) for (const f of w.rows) { const p = peak.get(f.n); if (!p || f.a > p.a) peak.set(f.n, f); }
const REALM = new Map();  // bare name -> page facts
for (const key of Object.keys(CARDS)) {
  const name = bare(key); if (NO_PAGE.test(name) || MINOR.test(name) || REALM.has(name)) continue;
  const slug = slugify(name); if (!slug) continue;
  const shape = peak.get(key) || peak.get(name) || peak.get(`(${name})`);
  const span = SPANS[key] || SPANS[name] || SPANS[`(${name})`] || (shape ? { f: shape.f, t: shape.t } : null);
  if (!span) continue;
  REALM.set(name, { name, slug, card: CARDS[key], span, shape });
}
{ // two names that fold to one slug: keep the first, number the rest
  const used = new Map();
  for (const r of REALM.values()) { const k = used.get(r.slug) || 0; used.set(r.slug, k + 1); if (k) r.slug += '-' + (k + 1); }
}
const realmHref = n => { const r = REALM.get(bare(n)); return r ? `/atlas/realm/${r.slug}.html` : ''; };

/* ---------- writing ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const link = (href, text) => href ? `<a href="${href}">${esc(text)}</a>` : esc(text);
const clip = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1); return c.slice(0, c.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…'; };
const TEMPLATE = fs.readFileSync('atlas.html', 'utf8');
const A = '<!--ALMANAC-->', Z = '<!--/ALMANAC-->';
if (!TEMPLATE.includes(A) || !TEMPLATE.includes(Z)) throw new Error('atlas.html has lost its almanac markers');
// pages live two folders down, so every local address becomes absolute
const SHELL = (TEMPLATE.slice(0, TEMPLATE.indexOf(A) + A.length) + Z + TEMPLATE.slice(TEMPLATE.indexOf(Z) + Z.length))
  .replace(/\b(href|src)="(?!https?:|\/|#|mailto:|data:)([^"]+)"/g, '$1="/$2"');
function page({ title, desc, url, body, almanac }) {
  let h = SHELL;
  h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  h = h.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">\n  <link rel="canonical" href="${SITE}${url}">\n  <meta property="og:type" content="website">\n  <meta property="og:site_name" content="luppiter Group">\n  <meta property="og:title" content="${esc(title)}">\n  <meta property="og:description" content="${esc(desc)}">\n  <meta property="og:url" content="${SITE}${url}">\n  <meta name="twitter:card" content="summary">`);
  h = h.replace('<body class="atlas">', `<body class="atlas"${body}>`);
  return h.replace(A + Z, A + almanac + Z);
}
const out = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
for (const d of ['atlas/year', 'atlas/realm']) fs.rmSync(d, { recursive: true, force: true });

/* ---------- a page for every year on the timeline ---------- */
const YEARS = []; for (let y = START; ;) { YEARS.push(y); if (y >= END) break; let n = snapYear(y + stepFor(y)); if (n <= y) n = snapYear(y + 2 * stepFor(y)); y = n; }
const chronSpan = y => y < -1200 ? 100 : y < -500 ? 40 : y < 500 ? 25 : y < 1500 ? 15 : y < 1800 ? 8 : 4;
const yearsIn = (a, b) => YEARS.filter(y => y >= a && y <= b);
function yearPage(y, i) {
  const Y = fmtYear(y), plain = sceneAt(y), great = greatRealms(plain, null, 14), era = eraOf(y);
  const row = r => `<tr><td>${link(realmHref(r.n), r.n)}</td><td>${esc(rulerAt(r.n, y)) || ''}</td><td class="hide-s">${esc(capitalAt(r.n, y))}</td><td class="hide-s num">${esc(fmtArea(r.a))}</td></tr>`;
  let a = `<h1>The World in ${Y}</h1>\n<p class="lede">${esc(cap1(ERA_SAY[era] || era))}. The realms that held the map in ${Y}, who ruled them and from where, and what was happening in the world. Drag the timeline above to move through the years, or zoom the map to any land.</p>\n`;
  a += `<h2>The great realms of ${Y}</h2>\n<table class="realm-table"><thead><tr><th>Realm</th><th>Ruler</th><th class="hide-s">Capital</th><th class="hide-s">Extent</th></tr></thead><tbody>\n${great.map(row).join('\n')}\n</tbody></table>\n`;
  const regs = REGIONS.map(([name, box, only]) => ({ name, box, list: greatRealms(plain, box, 8, only) })).filter(r => r.list.length);
  if (regs.length) a += `<h2>Region by region</h2>\n<div class="regions">\n${regs.map(r => `<div><h3>${esc(r.name)} in ${Y}</h3><ul>${r.list.map(x => `<li>${link(realmHref(x.n), x.n)}</li>`).join('')}</ul><a class="see" href="/atlas/year/${yearSlug(y)}.html?v=${r.box.join(',')}">See ${esc(r.name.replace(/^The /, 'the '))} on the map</a></div>`).join('\n')}\n</div>\n`;
  const w = chronSpan(y);
  const evs = EVENTS.filter(e => Math.abs(e.y - y) <= w && e.lvl <= 2).sort((p, q) => p.lvl - q.lvl || Math.abs(p.y - y) - Math.abs(q.y - y)).slice(0, 8).sort((p, q) => p.y - q.y);
  if (evs.length) a += `<h2>The chronicle of these years</h2>\n<ul class="events">\n${evs.map(e => `<li><b>${esc(e.t)}</b><span class="when">${esc(e.d || fmtYear(e.y))}</span>${e.p ? `, <span class="where">${esc(e.p)}</span>` : ''}. ${esc(e.x)}</li>`).join('\n')}\n</ul>\n`;
  const prev = YEARS[i - 1], next = YEARS[i + 1];
  a += `<div class="pager">${prev != null ? `<a href="/atlas/year/${yearSlug(prev)}.html" rel="prev">Earlier: the world in ${fmtYear(prev)}</a>` : ''}${next != null ? `<a href="/atlas/year/${yearSlug(next)}.html" rel="next">Later: the world in ${fmtYear(next)}</a>` : ''}<a href="/atlas.html#almanac">Every year</a><a href="/atlas/realms.html">Every realm</a></div>\n`;
  const names = great.slice(0, 6).map(r => r.n);
  const desc = clip(`Historical map of the world in ${Y}: ${names.join(', ')}, and the other realms of ${ERA_SAY[era] || era}, with their rulers, capitals, and the events of the age.`, 300);
  out(`atlas/year/${yearSlug(y)}.html`, page({ title: `Map of the World in ${Y} | Orbis Terrarum`, desc, url: `/atlas/year/${yearSlug(y)}.html`, body: ` data-year="${y}"`, almanac: a }));
}
YEARS.forEach(yearPage);

/* ---------- a page for every realm ---------- */
const spanText = s => `${fmtSpan(Math.max(s.f, -3400))} to ${s.t >= END ? 'today' : fmtSpan(s.t)}`;
const reign = r => r[2] >= END ? `from ${fmtSpan(r[1])}` : r[1] === r[2] ? fmtSpan(r[1]) : `${fmtSpan(r[1])} to ${fmtSpan(r[2])}`;
for (const r of REALM.values()) {
  const { name, card, span, shape } = r;
  const first = Math.max(START, span.f), last = Math.min(END, span.t);
  const at = shape ? Math.max(START, Math.min(END, Math.max(shape.f, first))) : first;
  const box = shape ? shape.b : null, v = box ? `?v=${[box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2].map(n => Math.round(n * 10) / 10).join(',')}` : '';
  let a = `<h1>${esc(name)}</h1>\n<p class="lede">${esc(spanText(span))}. Shown above as it stood in ${fmtYear(at)}; drag the timeline to watch it rise and fall.</p>\n<p>${esc(card.x)}</p>\n<dl class="facts">`;
  if (card.gov) a += `<dt>Government</dt><dd>${esc(card.gov)}</dd>`;
  if (card.faith) a += `<dt>Faith</dt><dd>${esc(card.faith)}</dd>`;
  if (card.cap && card.cap.length) a += `<dt>${card.cap.length > 1 ? 'Capitals' : 'Capital'}</dt><dd>${card.cap.map(c => `${esc(c[0])} <span class="num">(${esc(reign(c))})</span>`).join('; ')}</dd>`;
  if (shape) a += `<dt>Greatest extent</dt><dd>${esc(fmtArea(shape.a).replace(/^a/, 'A'))}, as drawn on this atlas for ${fmtYear(at)}</dd>`;
  a += `</dl>\n`;
  if (card.rulers && card.rulers.length) a += `<h2>Rulers of the ${esc(name.replace(/^The /, ''))}</h2>\n<ul class="rulers">${card.rulers.map(x => `<li>${esc(x[0])} <span class="num">${esc(reign(x))}</span></li>`).join('')}</ul>\n`;
  let ys = yearsIn(first, last); if (ys.length > 18) { const k = (ys.length - 1) / 17; ys = Array.from({ length: 18 }, (_, i) => ys[Math.round(i * k)]); }
  if (ys.length) a += `<h2>On the map, year by year</h2>\n<div class="years">${ys.map(y => `<a href="/atlas/year/${yearSlug(y)}.html${v}">${fmtYear(y)}</a>`).join('')}</div>\n`;
  a += `<div class="pager"><a href="/atlas/realms.html">Every realm</a><a href="/atlas.html#almanac">Every year</a></div>\n`;
  out(`atlas/realm/${r.slug}.html`, page({ title: `${name}: Map, Rulers, and History, ${spanText(span)} | Orbis Terrarum`, desc: clip(card.x, 300), url: `/atlas/realm/${r.slug}.html`,
    body: ` data-year="${at}"${box ? ` data-view="${[box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2].map(n => Math.round(n * 10) / 10).join(',')}"` : ''} data-realm="${esc(name)}"`, almanac: a }));
}

/* ---------- the two indexes ---------- */
const sorted = [...REALM.values()].sort((p, q) => p.name.replace(/^The /, '').localeCompare(q.name.replace(/^The /, ''), 'en'));
const letters = new Map();
for (const r of sorted) { const L = r.name.replace(/^The /, '').normalize('NFD').charAt(0).toUpperCase(); if (!letters.has(L)) letters.set(L, []); letters.get(L).push(r); }
let az = `<h1>Every Realm in the Atlas</h1>\n<p class="lede">${sorted.length.toLocaleString('en-US')} kingdoms, empires, republics, and leagues from the first cities to the present, each with its own map, rulers, and capitals.</p>\n`;
for (const [L, list] of letters) az += `<h2>${esc(L)}</h2>\n<ul class="az">${list.map(r => `<li><a href="/atlas/realm/${r.slug}.html">${esc(r.name)}</a> <span class="num">${esc(spanText(r.span))}</span></li>`).join('')}</ul>\n`;
az += `<div class="pager"><a href="/atlas.html#almanac">Every year</a></div>\n`;
out('atlas/realms.html', page({ title: 'Every Realm in the Atlas, A to Z | Orbis Terrarum', desc: `An A to Z of ${sorted.length.toLocaleString('en-US')} kingdoms, empires, and republics in the Orbis Terrarum atlas of world history, each with its own map, rulers, and capitals.`, url: '/atlas/realms.html', body: '', almanac: az }));

let idx = `<h2>Every year has its own page</h2>\n<p>Each year on the timeline can be opened, linked, and shared on its own: the map of that year, its great realms and their rulers, and the events of the age. Use the Link button on the map to copy the address of any year and view.</p>\n`;
for (const [s, e, name] of ERAS) { const ys = YEARS.filter(y => y >= s && (y < e || (e >= END && y <= e))); idx += `<h3>${esc(name)}, ${fmtSpan(s)} to ${e >= END ? 'today' : fmtSpan(e)}</h3>\n<div class="years">${ys.map(y => `<a href="/atlas/year/${yearSlug(y)}.html">${fmtYear(y)}</a>`).join('')}</div>\n`; }
idx += `<h2>Every realm has one too</h2>\n<p><a href="/atlas/realms.html">Browse all ${sorted.length.toLocaleString('en-US')} realms from A to Z</a>, each with its map, rulers, and capitals.</p>\n`;
out('atlas.html', TEMPLATE.slice(0, TEMPLATE.indexOf(A) + A.length) + idx + TEMPLATE.slice(TEMPLATE.indexOf(Z)));

/* ---------- the second road of the course (course.html): the world's ages as stations on the atlas ---------- */
const STATIONS = {
  'Bronze Age': [-3100, -2500, -2300, -1700, -1300],
  'Iron Age': [-1000, -700, -600, -525],
  'Classical Antiquity': [-480, -330, -220, -100, 10, 120, 300, 400],
  'Middle Ages': [530, 630, 750, 800, 1000, 1100, 1200, 1280, 1400],
  'Early Modern': [1460, 1500, 1530, 1600, 1650, 1715, 1765],
  'Modern Age': [1790, 1815, 1850, 1870, 1900, 1920, 1945, 1960, 1990, 2024]
};
const world = ERAS.map(([s, e, name]) => {
  let from = s - 1;
  const stations = (STATIONS[name] || []).map(y => {
    if (!YEARS.includes(y)) throw new Error(`station ${y} is not a step of the timeline`);
    const evs = EVENTS.filter(ev => ev.lvl === 1 && ev.y > from && ev.y <= y).map(ev => ({ t: ev.t, d: ev.d || fmtYear(ev.y) }));
    from = y;
    return { year: fmtYear(y), href: `atlas/year/${yearSlug(y)}.html`, realms: greatRealms(sceneAt(y), null, 5).map(r => r.n), events: evs };
  });
  return { name: cap1(ERA_SAY[name] || name), span: `${fmtSpan(s)} to ${e >= END ? 'today' : fmtSpan(e)}`, stations };
});
out('course-world.js', `/* Schola, Part II: stations on the atlas. Written by atlas/build/pages.mjs from the atlas data; do not edit by hand. */\nconst COURSE_WORLD = ${JSON.stringify(world)};\n`);

/* ---------- sitemap ---------- */
const top = fs.readdirSync('.').filter(f => f.endsWith('.html') && !/^(writer-download|stats|tos)\.html$/.test(f)).map(f => f === 'index.html' ? '/' : '/' + f);
const urls = [...top, '/atlas/realms.html', ...YEARS.map(y => `/atlas/year/${yearSlug(y)}.html`), ...sorted.map(r => `/atlas/realm/${r.slug}.html`)];
out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${SITE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
if (!fs.existsSync('robots.txt')) out('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`${YEARS.length} year pages, ${REALM.size} realm pages, ${urls.length} addresses in sitemap.xml`);
