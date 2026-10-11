/* Roma: Ab Urbe Condita. Interactive map, chronicle, great Romans and cursus honorum. */
(function () {
  'use strict';
  if (typeof ROMA === 'undefined') return;
  var D = ROMA, M = D.map;
  var MIN = -753, MAX = 1453;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- formatting ---------- */
  function roman(n) {
    var map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    var out = '';
    for (var i = 0; i < map.length; i++) { while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; } }
    return out;
  }
  function norm(y) { return y === 0 ? 1 : y; }
  function fmtYear(y) { y = norm(y); return y < 0 ? (-y) + ' BC' : 'AD ' + y; }
  function fmtShort(y) { y = norm(y); return y < 0 ? (-y) + ' BC' : (y < 600 ? 'AD ' + y : String(y)); }
  function auc(y) { y = norm(y); return y < 0 ? 754 + y : 753 + y; }
  function ordinal(n) {
    var s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
  }
  function held(intervals, y) {
    for (var i = 0; i < intervals.length; i++) { if (y >= intervals[i][0] && y <= intervals[i][1]) return true; }
    return false;
  }
  function eraIndexFor(y) {
    var idx = 0;
    for (var i = 0; i < D.eras.length; i++) { if (y >= D.eras[i].start) idx = i; }
    return idx;
  }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  var eventsByEra = {}, figById = {}, figsByEra = {}, quizByEra = {};
  D.events.forEach(function (e) { (eventsByEra[e.era] = eventsByEra[e.era] || []).push(e); });
  D.figures.forEach(function (f) { figById[f.id] = f; (figsByEra[f.era] = figsByEra[f.era] || []).push(f); });
  D.quiz.forEach(function (q) { (quizByEra[q.era] = quizByEra[q.era] || []).push(q); });

  /* ---------- state ---------- */
  var state = { year: MIN, era: -1, sel: null, playing: false };
  var cellsGold = [], cellsFill = [], markers = {}, capG, ring;

  /* ---------- map ---------- */
  function buildMap() {
    var svg = $('map');
    svg.setAttribute('viewBox', '0 0 ' + M.W + ' ' + M.H);
    var h = [];
    h.push('<defs><clipPath id="landClip"><path d="' + M.land + '"/></clipPath></defs>');
    h.push('<path class="land" d="' + M.land + '"/>');
    h.push('<g clip-path="url(#landClip)"><g class="t-gold">');
    M.cells.forEach(function (c) { h.push('<path class="off" d="' + c.d + '"/>'); });
    h.push('</g><g class="t-fill">');
    M.cells.forEach(function (c) { h.push('<path class="off" d="' + c.d + '"/>'); });
    h.push('</g></g>');
    h.push('<path class="coast" d="' + M.land + '"/>');
    M.seas.forEach(function (s) { h.push('<text class="sea-label" x="' + s.xy[0] + '" y="' + s.xy[1] + '" text-anchor="middle">' + esc(s.n) + '</text>'); });
    h.push('<g id="evMarks">');
    D.events.forEach(function (e) {
      if (e.x == null) return;
      h.push('<circle class="ev" data-id="' + e.id + '" cx="' + e.x + '" cy="' + e.y + '" r="' + (e.imp === 3 ? 5 : 4) + '"><title>' + esc(fmtYear(e.year) + ': ' + e.title) + '</title></circle>');
    });
    h.push('</g><circle class="ring" id="selRing" cx="0" cy="0" r="6"/><g id="capG"></g>');
    svg.innerHTML += h.join('');
    var g = svg.querySelectorAll('.t-gold path'), f = svg.querySelectorAll('.t-fill path');
    for (var i = 0; i < g.length; i++) { cellsGold.push(g[i]); cellsFill.push(f[i]); }
    svg.querySelectorAll('.ev').forEach(function (c) {
      markers[c.getAttribute('data-id')] = c;
      c.addEventListener('click', function () { selectEvent(c.getAttribute('data-id'), { scroll: true }); });
    });
    capG = $('capG'); ring = $('selRing');
  }
  function star(x, y, r) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }
  function capitalFor(y) {
    var cap = null;
    M.caps.forEach(function (c) { if (y >= c.from && (y < c.to || (c.to === MAX && y <= MAX))) cap = c; });
    if (!cap && y < 286) cap = M.caps[0];
    return cap;
  }
  function drawCaps(y) {
    var cap = capitalFor(y), roma = M.caps[0], h = '';
    if (!cap || cap.name !== 'Roma') {
      h += '<circle class="city" cx="' + roma.xy[0] + '" cy="' + roma.xy[1] + '" r="3"/>' +
           '<text class="city-label" x="' + (roma.xy[0] + 6) + '" y="' + (roma.xy[1] + 14) + '">Roma</text>';
    }
    if (cap) {
      h += '<polygon class="cap-star" points="' + star(cap.xy[0], cap.xy[1], 9) + '"/>' +
           '<text class="cap-label" x="' + (cap.xy[0] + 11) + '" y="' + (cap.xy[1] - 7) + '">' + esc(cap.name) + '</text>';
    }
    capG.innerHTML = h;
    return cap;
  }

  /* ---------- year ---------- */
  var aucEl, aucLen = 0;
  function setAuc(txt) {
    aucEl = aucEl || $('aucNum');
    aucEl.textContent = txt;
    if (txt.length !== aucLen) { aucLen = txt.length; fitAuc(); }
  }
  function fitAuc() {
    var w = aucEl.parentNode.clientWidth || 280;
    var size = window.innerWidth < 600 ? 56 : 72;
    aucEl.style.fontSize = size + 'px';
    var sw = aucEl.scrollWidth;
    if (sw > w) { size = Math.max(24, Math.floor(size * w / sw * 0.98)); aucEl.style.fontSize = size + 'px'; }
  }
  window.addEventListener('resize', function () { if (aucEl) fitAuc(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (aucEl) fitAuc(); });
  var hashTimer;
  function setYear(y, opts) {
    opts = opts || {};
    y = Math.max(MIN, Math.min(MAX, Math.round(y)));
    state.year = y;
    var slider = $('year');
    if (+slider.value !== y) slider.value = y;
    var a = auc(y);
    setAuc(roman(a));
    $('yearText').textContent = fmtYear(y);
    $('aucText').textContent = 'the ' + ordinal(a) + ' year of the City';

    var count = 0;
    for (var i = 0; i < M.cells.length; i++) {
      var on = held(M.cells[i].h, y);
      if (on) count++;
      cellsGold[i].classList.toggle('off', !on);
      cellsFill[i].classList.toggle('off', !on);
    }
    $('landText').textContent = count === 1 ? 'Latium, the land of the City' : count + ' provinces and regions on this map';
    var cap = drawCaps(y);
    $('capText').textContent = cap ? cap.name : 'Roma';
    $('mapTitle').textContent = 'Map of Roman rule in ' + fmtYear(y);

    var ei = eraIndexFor(y);
    if (ei !== state.era) renderEra(ei);
    updateMarkers();
    updateNow();
    if (!opts.noHash) {
      clearTimeout(hashTimer);
      hashTimer = setTimeout(function () { try { history.replaceState(null, '', '#y=' + norm(state.year)); } catch (e) {} }, 250);
    }
  }
  function updateMarkers() {
    var era = D.eras[state.era].id, y = state.year;
    D.events.forEach(function (e) {
      var m = markers[e.id]; if (!m) return;
      var vis = e.era === era;
      m.style.display = vis ? '' : 'none';
      m.classList.toggle('near', vis && Math.abs(e.year - y) <= 8);
      m.classList.toggle('sel', state.sel === e.id);
    });
  }
  function nearestEvent() {
    var list = eventsByEra[D.eras[state.era].id] || [], best = null, bd = 1e9;
    list.forEach(function (e) { var d = Math.abs(e.year - state.year); if (d < bd) { bd = d; best = e; } });
    return best;
  }
  function updateNow() {
    var e = nearestEvent(), b = $('nowEvent');
    if (!e) { b.hidden = true; return; }
    b.hidden = false;
    b.dataset.id = e.id;
    var lead = e.year === state.year ? 'This year' : (e.year > state.year ? 'Coming in ' : 'Recently, in ') + fmtYear(e.year);
    if (e.year === state.year) lead = 'This year';
    b.innerHTML = '<small>' + esc(lead) + '</small>' + esc(e.title);
  }

  /* ---------- bands ---------- */
  var BAND_LABELS = {
    'regnum': 'Regnum', 'early-republic': 'Res Publica', 'punic': 'Bella Punica', 'late-republic': 'Bella Civilia',
    'principate': 'Principatus', 'severan-crisis': 'Severi', 'dominate': 'Dominatus', 'west': 'Occidens',
    'renovatio': 'Renovatio', 'middle-empire': 'Basileia ton Rhomaion', 'last-stand': 'Ultimum Certamen'
  };
  function buildBands() {
    var box = $('bands');
    D.eras.forEach(function (era, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'band';
      b.style.flex = (era.end - era.start) + ' 1 0';
      b.textContent = BAND_LABELS[era.id] || era.latin;
      b.title = era.name + ', ' + fmtYear(era.start) + ' to ' + fmtYear(era.end);
      b.setAttribute('aria-label', era.name + ', ' + fmtYear(era.start) + ' to ' + fmtYear(era.end));
      b.addEventListener('click', function () { stopPlay(); state.sel = null; setYear(era.start === MIN ? MIN : era.start); });
      box.appendChild(b);
    });
  }

  /* ---------- era ---------- */
  function renderEra(i) {
    state.era = i;
    var era = D.eras[i];
    document.querySelectorAll('.band').forEach(function (b, j) { b.classList.toggle('on', j === i); });
    $('eraLink').textContent = era.name;
    $('eraCount').textContent = 'Age ' + (i + 1) + ' of ' + D.eras.length + ', ' + fmtYear(era.start) + ' to ' + fmtYear(era.end);
    $('eraName').textContent = era.name;
    $('eraLatin').textContent = era.latin;
    $('eraMotto').textContent = era.motto;
    $('eraSummary').textContent = era.summary;
    $('eraPrev').disabled = i === 0;
    $('eraNext').disabled = i === D.eras.length - 1;

    var list = $('eventList'), h = [];
    (eventsByEra[era.id] || []).forEach(function (e) {
      var figs = (e.fig || []).map(function (id) { var f = figById[id]; return f ? '<button type="button" class="chip" data-fig="' + f.id + '">' + esc(f.name) + '</button>' : ''; }).join('');
      var span = e.yearEnd ? fmtYear(e.year) + ' to ' + fmtYear(e.yearEnd) : fmtYear(e.year);
      h.push('<li class="ev-item imp' + (e.imp || 2) + '" id="ev-' + e.id + '">' +
        '<button type="button" class="ev-head" aria-expanded="false" data-id="' + e.id + '">' +
          '<span class="ev-year">' + esc(fmtShort(e.year)) + '</span><span class="ev-title">' + esc(e.title) + '</span></button>' +
        '<div class="ev-body" hidden>' +
          '<p class="ev-meta">' + esc(span) + ', year ' + roman(auc(e.year)) + ' of the City' + (e.place ? '. ' + esc(e.place) : '') + (e.latin && (e.place || '').indexOf(e.latin) === -1 ? '. <span lang="la">' + esc(e.latin) + '</span>' : '') + '</p>' +
          '<p class="ev-text">' + esc(e.text) + '</p>' +
          (figs ? '<div class="ev-figs"><span>Romans of this story:</span>' + figs + '</div>' : '') +
        '</div></li>');
    });
    list.innerHTML = h.join('');
    list.querySelectorAll('.ev-head').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        if (btn.getAttribute('aria-expanded') === 'true') { closeEvent(id); return; }
        selectEvent(id, { fromList: true });
      });
    });
    list.querySelectorAll('.chip').forEach(function (c) { c.addEventListener('click', function () { openFigure(c.getAttribute('data-fig')); }); });

    renderFigures(era);
    renderTrial(era, false);
  }

  /* ---------- events ---------- */
  function closeEvent(id) {
    var li = $('ev-' + id); if (!li) return;
    li.classList.remove('open');
    li.querySelector('.ev-head').setAttribute('aria-expanded', 'false');
    li.querySelector('.ev-body').hidden = true;
    if (state.sel === id) { state.sel = null; updateMarkers(); }
  }
  function selectEvent(id, opts) {
    opts = opts || {};
    var e = D.events.filter(function (x) { return x.id === id; })[0]; if (!e) return;
    stopPlay();
    var prevSel = state.sel;
    state.sel = id;
    setYear(e.year);
    if (prevSel && prevSel !== id) closeEvent(prevSel);
    state.sel = id;
    var li = $('ev-' + id);
    if (li) {
      li.classList.add('open');
      li.querySelector('.ev-head').setAttribute('aria-expanded', 'true');
      li.querySelector('.ev-body').hidden = false;
      if (opts.scroll) li.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    updateMarkers();
    if (e.x != null && !reduceMotion) {
      ring.setAttribute('cx', e.x); ring.setAttribute('cy', e.y);
      ring.classList.remove('on'); void ring.getBBox(); ring.classList.add('on');
    }
  }
  function stepEvent(dir) {
    var y = state.year, cur = state.sel, list = D.events, i;
    if (cur) {
      for (i = 0; i < list.length; i++) if (list[i].id === cur) break;
      var j = i + dir;
      if (j >= 0 && j < list.length) { selectEvent(list[j].id, { scroll: false }); }
      return;
    }
    if (dir > 0) { for (i = 0; i < list.length; i++) if (list[i].year > y) { selectEvent(list[i].id); return; } }
    else { for (i = list.length - 1; i >= 0; i--) if (list[i].year < y) { selectEvent(list[i].id); return; } }
  }

  /* ---------- figures ---------- */
  var COIN = { 'Julius Caesar': 'CAES', 'Flavius Aetius': 'AETI', 'Pope Leo I': 'LEO', 'Publius Decius Mus': 'DECI', 'Julia Domna': 'DOMN', 'Galla Placidia': 'PLAC' };
  function initials(f) {
    if (COIN[f.name]) return COIN[f.name];
    var words = String(f.name).replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(function (w) { return /^[A-Z]/.test(w) && !/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI)$/.test(w); });
    var w = words.length > 1 && /^(Marcus|Gaius|Lucius|Publius|Quintus|Gnaeus|Tiberius|Titus|Appius|Manius|Aulus|Sextus|Decimus)$/.test(words[0]) ? words[words.length - 1] : words[0] || f.name;
    return w.toUpperCase().replace(/U/g, 'V').replace(/J/g, 'I').replace(/[^A-Z]/g, '').slice(0, 4);
  }
  function lifespan(f) {
    if (f.born == null && f.died == null) return '';
    var c = f.approx ? 'c. ' : '';
    return c + fmtYear(f.born) + ' to ' + fmtYear(f.died);
  }
  function renderFigures(era) {
    var box = $('figList'), figs = figsByEra[era.id] || [];
    box.innerHTML = figs.map(function (f) {
      return '<details class="fig" id="fig-' + f.id + '"><summary>' +
        '<span class="coin" aria-hidden="true">' + esc(initials(f)) + '</span>' +
        '<span><span class="fig-name">' + esc(f.name) + '</span><span class="fig-latin" lang="la">' + esc(f.latinName || '') + '</span>' +
        '<span class="fig-title">' + esc(f.title || '') + (lifespan(f) ? ', ' + esc(lifespan(f)) : '') + '</span></span>' +
        '</summary><div class="fig-body"><p>' + esc(f.bio) + '</p>' +
        (f.deeds && f.deeds.length ? '<ul>' + f.deeds.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') +
        (f.quote && f.quote.text ? '<blockquote>' + esc(f.quote.text) + '<cite>' + esc(f.quote.source || '') + '</cite></blockquote>' : '') +
        '</div></details>';
    }).join('');
  }
  function openFigure(id) {
    var f = figById[id]; if (!f) return;
    if (D.eras[state.era].id !== f.era) {
      var idx = 0; D.eras.forEach(function (e, i) { if (e.id === f.era) idx = i; });
      renderEra(idx);
    }
    var el = $('fig-' + id); if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  /* ---------- cursus honorum ---------- */
  var RANKS = [
    ['Civis', 'citizen'], ['Tiro', 'recruit'], ['Miles', 'legionary'], ['Optio', 'second to the centurion'],
    ['Centurio', 'centurion'], ['Primus Pilus', 'first spear'], ['Tribunus', 'military tribune'], ['Legatus', 'legate'],
    ['Praetor', 'praetor'], ['Consul', 'consul'], ['Imperator', 'victorious general'], ['Pater Patriae', 'father of the fatherland']
  ];
  var KEY = 'roma-cursus-v1';
  function bests() { return store(KEY) || {}; }
  function rankIndex() {
    var b = bests(), n = 0;
    D.eras.forEach(function (e) { if ((b[e.id] || 0) >= 4) n++; });
    return Math.min(n, RANKS.length - 1);
  }
  function renderRanks() {
    var r = rankIndex();
    $('ranks').innerHTML = RANKS.map(function (k, i) {
      var cls = i < r ? 'won' : (i === r ? 'now won' : '');
      return '<li class="' + cls + '"' + (i === r ? ' aria-current="step"' : '') + '><b lang="la">' + k[0] + '</b>' + k[1] + '</li>';
    }).join('');
  }
  var trial = { era: null, i: 0, score: 0, done: false };
  function renderTrial(era, started) {
    var box = $('trial'), qs = quizByEra[era.id] || [], b = bests();
    if (!started) {
      trial = { era: era, i: 0, score: 0, done: false };
      var best = b[era.id];
      box.innerHTML = '<h3>The trial of ' + esc(era.name) + '</h3>' +
        '<p class="t-step">' + qs.length + ' questions on this age' + (best != null ? '. Your best so far: ' + best + ' of ' + qs.length + (best >= 4 ? ', passed' : '') : '') + '.</p>' +
        '<div class="t-actions"><button type="button" class="primary" id="tStart">' + (best != null ? 'Take the trial again' : 'Begin the trial') + '</button></div>';
      $('tStart').addEventListener('click', function () { renderTrial(era, true); askQuestion(); });
      return;
    }
  }
  function askQuestion() {
    var era = trial.era, qs = quizByEra[era.id] || [], q = qs[trial.i], box = $('trial');
    box.innerHTML = '<h3>The trial of ' + esc(era.name) + '</h3>' +
      '<p class="t-step">Question ' + (trial.i + 1) + ' of ' + qs.length + '</p>' +
      '<p class="t-q">' + esc(q.q) + '</p><div class="t-opts">' +
      q.options.map(function (o, k) { return '<button type="button" class="t-opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') +
      '</div><div id="tFb"></div>';
    box.querySelectorAll('.t-opt').forEach(function (btn) {
      btn.addEventListener('click', function () { answer(+btn.getAttribute('data-k')); });
    });
    var first = box.querySelector('.t-opt'); if (first) first.focus({ preventScroll: true });
  }
  function answer(k) {
    var era = trial.era, qs = quizByEra[era.id], q = qs[trial.i], box = $('trial');
    var right = k === q.answer;
    if (right) trial.score++;
    box.querySelectorAll('.t-opt').forEach(function (btn) {
      var j = +btn.getAttribute('data-k');
      btn.disabled = true;
      if (j === q.answer) btn.classList.add('right');
      else if (j === k) btn.classList.add('wrong');
    });
    var last = trial.i === qs.length - 1;
    $('tFb').innerHTML = '<p class="t-feedback"><b>' + (right ? 'Correct.' : 'Not quite. The answer is ' + esc(q.options[q.answer]) + '.') + '</b> ' + esc(q.explain) + '</p>' +
      '<div class="t-actions"><button type="button" class="primary" id="tNext">' + (last ? 'See your result' : 'Next question') + '</button></div>';
    $('tNext').addEventListener('click', function () { if (last) finishTrial(); else { trial.i++; askQuestion(); } });
    $('tNext').focus({ preventScroll: true });
  }
  function finishTrial() {
    var era = trial.era, qs = quizByEra[era.id], b = bests(), before = rankIndex();
    var passed = trial.score >= 4;
    b[era.id] = Math.max(b[era.id] || 0, trial.score);
    store(KEY, b);
    var after = rankIndex();
    renderRanks();
    var rise = after > before ? ' You rise to ' + RANKS[after][0] + ' (' + RANKS[after][1] + ').' : '';
    var msg = passed
      ? 'You answered ' + trial.score + ' of ' + qs.length + ' correctly. The trial is passed and this age is yours.' + rise
      : 'You answered ' + trial.score + ' of ' + qs.length + ' correctly. Four are needed to pass; read the chronicle above and try again.';
    var nextIdx = state.era + 1;
    $('trial').innerHTML = '<h3>The trial of ' + esc(era.name) + '</h3><p class="t-result">' + esc(msg) + '</p>' +
      '<div class="t-actions"><button type="button" id="tAgain">Take the trial again</button>' +
      (nextIdx < D.eras.length ? '<button type="button" class="primary" id="tOn">Go to the next age</button>' : '') + '</div>';
    $('tAgain').addEventListener('click', function () { renderTrial(era, true); askQuestion(); });
    if ($('tOn')) $('tOn').addEventListener('click', function () {
      state.sel = null; setYear(D.eras[nextIdx].start);
      $('chronicle').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- play ---------- */
  var raf, lastT;
  function stopPlay() {
    if (!state.playing) return;
    state.playing = false; cancelAnimationFrame(raf);
    $('play').textContent = 'March through history'; $('play').setAttribute('aria-pressed', 'false');
  }
  function startPlay() {
    if (state.year >= MAX) setYear(MIN);
    state.playing = true; state.sel = null; lastT = null;
    $('play').textContent = 'Pause'; $('play').setAttribute('aria-pressed', 'true');
    var fy = state.year;
    function tick(t) {
      if (!state.playing) return;
      if (lastT != null) fy += (t - lastT) / 1000 * 55;
      lastT = t;
      if (fy >= MAX) { setYear(MAX); stopPlay(); return; }
      if (Math.round(fy) !== state.year) setYear(fy, { noHash: true });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  /* ---------- opening: the City grows ---------- */
  function intro(target) {
    if (reduceMotion) { setYear(target); return; }
    var t0 = null, dur = 3600, from = MIN;
    function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
    function step(t) {
      if (state.playing || state.userMoved) return;
      if (t0 == null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      setYear(from + (target - from) * ease(p), { noHash: true });
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- wire up ---------- */
  function init() {
    buildMap();
    buildBands();
    renderRanks();
    var slider = $('year');
    slider.addEventListener('input', function () {
      state.userMoved = true; stopPlay(); state.sel = null;
      var v = +slider.value; if (v === 0) v = state.year < 0 ? 1 : -1;
      setYear(v);
    });
    $('play').addEventListener('click', function () { state.userMoved = true; if (state.playing) stopPlay(); else startPlay(); });
    $('prevEv').addEventListener('click', function () { state.userMoved = true; stepEvent(-1); });
    $('nextEv').addEventListener('click', function () { state.userMoved = true; stepEvent(1); });
    $('eraPrev').addEventListener('click', function () { state.userMoved = true; if (state.era > 0) { state.sel = null; setYear(D.eras[state.era - 1].start); } });
    $('eraNext').addEventListener('click', function () { state.userMoved = true; if (state.era < D.eras.length - 1) { state.sel = null; setYear(D.eras[state.era + 1].start); } });
    $('nowEvent').addEventListener('click', function () { state.userMoved = true; selectEvent($('nowEvent').dataset.id, { scroll: true }); });
    ['bands', 'eventList', 'figList', 'trial'].forEach(function (id) { $(id).addEventListener('pointerdown', function () { state.userMoved = true; }); });

    var m = /#y=(-?\d+)/.exec(location.hash);
    setYear(MIN, { noHash: true });
    if (m) { state.userMoved = true; setYear(+m[1], { noHash: true }); }
    else intro(117);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
