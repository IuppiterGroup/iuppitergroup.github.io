/* Schola: the course. Lessons are built from roma-data.js (chronicle, Romans, trials), roma-sources.js (the ancient
   writers) and course-data.js (the order of lessons). Addresses: #regnum (an age), #regnum/2 (a lesson), #regnum/trial. */
(function () {
  'use strict';
  if (typeof ROMA === 'undefined' || typeof COURSE === 'undefined') return;
  var D = ROMA, M = D.map, SRC = typeof ROMA_SOURCES === 'undefined' ? [] : ROMA_SOURCES;
  var WORLD = typeof COURSE_WORLD === 'undefined' ? [] : COURSE_WORLD;
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- formatting (as in roma.js) ---------- */
  function roman(n) {
    var map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']], out = '';
    for (var i = 0; i < map.length; i++) { while (n >= map[i][0]) { out += map[i][1]; n -= map[i][0]; } }
    return out;
  }
  function norm(y) { return y === 0 ? 1 : y; }
  function fmtYear(y) { y = norm(y); return y < 0 ? (-y) + ' BC' : 'AD ' + y; }
  function atlasYear(y) { y = norm(y); return y < 0 ? (-y) + ' B.C.' : 'A.D. ' + y; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function held(iv, y) { for (var i = 0; i < iv.length; i++) { if (y >= iv[i][0] && y <= iv[i][1]) return true; } return false; }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  // the atlas has a page for each step of its timeline; find the one nearest a year
  function atlasStep(y) {
    var s = y < -1200 ? 100 : y < -500 ? 25 : y < 1500 ? 10 : 5, r = Math.round(y / s) * s;
    if (r === 0) r = y < 0 ? -1 : 1;
    return Math.max(-3100, Math.min(2024, r));
  }
  function atlasHref(y, box) { var s = atlasStep(y); return 'atlas/year/' + (s < 0 ? (-s) + '-bc' : s) + '.html' + (box ? '?v=' + box : ''); }

  /* ---------- indexes ---------- */
  var evById = {}, figById = {}, eraById = {}, quizByEra = {}, srcByEv = {};
  D.events.forEach(function (e) { evById[e.id] = e; });
  D.figures.forEach(function (f) { figById[f.id] = f; });
  D.eras.forEach(function (e, i) { eraById[e.id] = e; e._i = i; });
  D.quiz.forEach(function (q) { (quizByEra[q.era] = quizByEra[q.era] || []).push(q); });
  SRC.forEach(function (s) { if (evById[s.ev]) (srcByEv[s.ev] = srcByEv[s.ev] || []).push(s); });
  var UNITS = COURSE.filter(function (u) { return eraById[u.era]; });
  var LESSONS = [];
  UNITS.forEach(function (u, ui) {
    u.i = ui; u.eraObj = eraById[u.era];
    u.lessons.forEach(function (l, li) {
      l.unit = u; l.n = li + 1; l.id = u.era + '/' + (li + 1);
      l.evs = l.events.map(function (id) { if (!evById[id] && window.console) console.warn('course: no such event', id); return evById[id]; }).filter(Boolean);
      l.seq = LESSONS.length; LESSONS.push(l);
    });
  });

  /* ---------- progress and rank (the rank is Roma's own) ---------- */
  var READ_KEY = 'roma-course-v1', RANK_KEY = 'roma-cursus-v1';
  var RANKS = [
    ['Civis', 'citizen'], ['Tiro', 'recruit'], ['Miles', 'legionary'], ['Optio', 'second to the centurion'],
    ['Centurio', 'centurion'], ['Primus Pilus', 'first spear'], ['Tribunus', 'military tribune'], ['Legatus', 'legate'],
    ['Praetor', 'praetor'], ['Consul', 'consul'], ['Imperator', 'victorious general'], ['Pater Patriae', 'father of the fatherland']
  ];
  function readSet() { var s = store(READ_KEY); return (s && s.read) || {}; }
  function markRead(id) { var r = readSet(); r[id] = 1; store(READ_KEY, { read: r, last: id }); }
  function lastRead() { var s = store(READ_KEY); return s && s.last; }
  function bests() { return store(RANK_KEY) || {}; }
  function passed(era) { return (bests()[era] || 0) >= 4; }
  function rankIndex() { var b = bests(), n = 0; D.eras.forEach(function (e) { if ((b[e.id] || 0) >= 4) n++; }); return Math.min(n, RANKS.length - 1); }

  /* ---------- the lesson map: Roman rule in the lesson's last year, its events numbered ---------- */
  function lessonMap(l) {
    var pts = l.evs.filter(function (e) { return e.x != null; });
    if (!pts.length) return '';
    var year = Math.max.apply(null, l.evs.map(function (e) { return e.yearEnd || e.year; }));
    var seat = M.caps[0]; M.caps.forEach(function (c) { if (year >= c.from && year <= c.to) seat = c; });
    var roma = seat.xy, xs = pts.map(function (e) { return e.x; }).concat([roma[0]]), ys = pts.map(function (e) { return e.y; }).concat([roma[1]]);
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var w = Math.max(x1 - x0 + 150, 330), h = Math.max(y1 - y0 + 120, w * 0.52);
    if (w < h * 1.92) w = h * 1.92;
    w = Math.min(w, M.W); h = Math.min(h, M.H);
    var vx = Math.max(0, Math.min(M.W - w, (x0 + x1) / 2 - w / 2)), vy = Math.max(0, Math.min(M.H - h, (y0 + y1) / 2 - h / 2));
    var k = w / 760, uid = 'lm' + l.seq, s = [];
    s.push('<svg class="lmap" viewBox="' + vx.toFixed(1) + ' ' + vy.toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1) + '" role="img" aria-label="Map of Roman rule in ' + esc(fmtYear(year)) + ' with the places of this lesson">');
    s.push('<defs><clipPath id="' + uid + '"><path d="' + M.land + '"/></clipPath></defs>');
    s.push('<path class="land" d="' + M.land + '"/><g clip-path="url(#' + uid + ')">');
    M.cells.forEach(function (c) { if (held(c.h, year)) s.push('<path class="held" d="' + c.d + '"/>'); });
    s.push('</g><path class="coast" d="' + M.land + '" style="stroke-width:' + (1.1 * k).toFixed(2) + '"/>');
    // places shared by several events carry all their numbers
    var seen = {};
    l.evs.forEach(function (e, i) {
      if (e.x == null) return;
      var key = Math.round(e.x / (9 * k)) + ',' + Math.round(e.y / (9 * k));
      if (seen[key]) { seen[key].n.push(i + 1); return; }
      seen[key] = { x: e.x, y: e.y, n: [i + 1] };
    });
    Object.keys(seen).forEach(function (key) {
      var p = seen[key], label = p.n.length > 3 ? p.n[0] + ' to ' + p.n[p.n.length - 1] : p.n.join(', ');
      var r = 9 * k, tw = label.length > 2;
      if (tw) s.push('<rect class="pin" x="' + (p.x - r * (0.6 + label.length * 0.32)).toFixed(1) + '" y="' + (p.y - r).toFixed(1) + '" width="' + (r * (1.2 + label.length * 0.64)).toFixed(1) + '" height="' + (2 * r).toFixed(1) + '" rx="' + r.toFixed(1) + '" style="stroke-width:' + (1.2 * k).toFixed(2) + '"/>');
      else s.push('<circle class="pin" cx="' + p.x + '" cy="' + p.y + '" r="' + r.toFixed(1) + '" style="stroke-width:' + (1.2 * k).toFixed(2) + '"/>');
      s.push('<text class="pin-n" x="' + p.x + '" y="' + (p.y + 4 * k).toFixed(1) + '" text-anchor="middle" style="font-size:' + (11.5 * k).toFixed(1) + 'px">' + esc(label) + '</text>');
    });
    s.push('</svg>');
    return '<figure class="lmap-wrap">' + s.join('') + '<figcaption>Roman rule in ' + esc(fmtYear(year)) + '. The numbers are the readings below.</figcaption></figure>';
  }

  /* ---------- views ---------- */
  var view = $('view');
  function setHead(title, sub) { $('pageTitle').textContent = title; $('pageSub').textContent = sub; document.title = title + ' | Schola | luppiter Group'; }
  function go(hash) { location.hash = hash; }
  function unitHref(u) { return '#' + u.era; }
  function nextAfterLesson(l) { return l.n < l.unit.lessons.length ? '#' + l.unit.era + '/' + (l.n + 1) : '#' + l.unit.era + '/trial'; }

  function renderHome() {
    setHead('A Course in the History of Rome', 'Forty lessons in order, from the founding of the City in 753 BC to the last stand at Constantinople in AD 1453. Every lesson has its map, its chronicle, and the ancient writers in their own words, and every age ends in a trial that raises your rank on the cursus honorum.');
    var read = readSet(), r = rankIndex(), done = LESSONS.filter(function (l) { return read[l.id]; }).length;
    var next = null;
    for (var i = 0; i < LESSONS.length && !next; i++) { if (!read[LESSONS[i].id]) next = LESSONS[i]; }
    var h = [];
    h.push('<section class="standing"><div><p class="standing-rank"><span lang="la">' + RANKS[r][0] + '</span> <small>' + RANKS[r][1] + '</small></p>' +
      '<p class="standing-note">Your rank on the cursus honorum. ' + done + ' of ' + LESSONS.length + ' lessons read, ' + UNITS.filter(function (u) { return passed(u.era); }).length + ' of ' + UNITS.length + ' trials passed.</p></div>' +
      '<a class="btn-go" href="#' + (next ? next.id : UNITS[0].era + '/1') + '">' + (done ? (next ? 'Continue: ' + esc(next.title) : 'Read the course again') : 'Begin with the founding of the City') + '</a></section>');
    h.push('<h2 class="sec-title part-title">Part I. Rome, from the founding to the last stand</h2><ol class="units">');
    UNITS.forEach(function (u) {
      var e = u.eraObj, pass = passed(u.era);
      h.push('<li class="unit' + (pass ? ' passed' : '') + '" id="u-' + u.era + '"><div class="unit-head"><span class="unit-n">' + roman(u.i + 1) + '</span><div><h3><a href="' + unitHref(u) + '">' + esc(e.name) + '</a></h3>' +
        '<p class="unit-span">' + esc(fmtYear(e.start)) + ' to ' + esc(fmtYear(e.end)) + (pass ? ' <span class="laurel">Trial passed</span>' : '') + '</p></div></div><ol class="lesson-list">');
      u.lessons.forEach(function (l) {
        var n = l.evs.reduce(function (a, ev) { return a + (srcByEv[ev.id] ? srcByEv[ev.id].length : 0); }, 0);
        h.push('<li class="' + (read[l.id] ? 'read' : '') + '"><a href="#' + l.id + '"><span class="l-title">' + esc(l.title) + '</span><span class="l-meta">' + l.evs.length + ' readings' + (n ? ', ' + n + (n === 1 ? ' passage' : ' passages') + ' from the ancient writers' : '') + '</span></a></li>');
      });
      h.push('<li class="trial-row' + (pass ? ' read' : '') + '"><a href="#' + u.era + '/trial"><span class="l-title">The trial of this age</span><span class="l-meta">Six questions; four to pass</span></a></li></ol></li>');
    });
    h.push('</ol>');
    if (WORLD.length) {
      h.push('<h2 class="sec-title part-title" id="orbis">Part II. The world\'s ages, on the atlas</h2>' +
        '<p class="part-intro">Rome was one realm among many. This second road runs through the whole atlas, from the first cities of Egypt and Sumer to the present, one station at a time. Each station opens the map of the world in that year, with its great realms, their rulers, and the events of the age.</p><ol class="units world">');
      WORLD.forEach(function (w, i) {
        h.push('<li class="unit"><div class="unit-head"><span class="unit-n">' + roman(i + 1) + '</span><div><h3>' + esc(w.name) + '</h3><p class="unit-span">' + esc(w.span) + '</p></div></div><ol class="station-list">');
        w.stations.forEach(function (st) {
          h.push('<li><a href="' + esc(st.href) + '"><span class="l-title">The world in ' + esc(st.year) + '</span><span class="l-meta">' + esc(st.realms.join(', ')) + '</span></a>' +
            (st.events.length ? '<ul class="station-events">' + st.events.map(function (e) { return '<li><b>' + esc(e.t) + '</b> <span>' + esc(e.d) + '</span></li>'; }).join('') + '</ul>' : '') + '</li>');
        });
        h.push('</ol></li>');
      });
      h.push('</ol>');
    }
    view.innerHTML = h.join('');
  }

  function renderUnit(u) {
    var e = u.eraObj;
    setHead(e.name, 'Age ' + roman(u.i + 1) + ' of ' + roman(UNITS.length) + ', ' + fmtYear(e.start) + ' to ' + fmtYear(e.end) + '. ' + e.latin + '.');
    var read = readSet(), h = [];
    h.push('<p class="crumbs"><a href="#">The course</a></p>');
    h.push('<blockquote class="era-motto">' + esc(e.motto) + '</blockquote><p class="unit-summary">' + esc(e.summary) + '</p><ol class="lesson-list big">');
    u.lessons.forEach(function (l) {
      h.push('<li class="' + (read[l.id] ? 'read' : '') + '"><a href="#' + l.id + '"><span class="l-title">Lesson ' + l.n + '. ' + esc(l.title) + '</span><span class="l-meta">' + esc(l.aim) + '</span></a></li>');
    });
    h.push('<li class="trial-row' + (passed(u.era) ? ' read' : '') + '"><a href="#' + u.era + '/trial"><span class="l-title">The trial of this age</span><span class="l-meta">Six questions; four to pass and rise one rank</span></a></li></ol>');
    h.push(unitNav(u));
    view.innerHTML = h.join('');
  }
  function unitNav(u) {
    var p = UNITS[u.i - 1], n = UNITS[u.i + 1];
    return '<nav class="lesson-nav">' + (p ? '<a href="#' + p.era + '">Earlier: ' + esc(p.eraObj.name) + '</a>' : '<span></span>') + (n ? '<a class="primary" href="#' + n.era + '">Next age: ' + esc(n.eraObj.name) + '</a>' : '<a class="primary" href="#">Back to the whole course</a>') + '</nav>';
  }

  function renderLesson(l) {
    var u = l.unit, e = u.eraObj;
    setHead(l.title, 'Age ' + roman(u.i + 1) + ', ' + e.name + '. Lesson ' + l.n + ' of ' + u.lessons.length + '.');
    var first = l.evs[0], lastEv = l.evs[l.evs.length - 1], mid = l.evs[Math.floor(l.evs.length / 2)].year;
    var h = [];
    h.push('<p class="crumbs"><a href="#">The course</a> / <a href="' + unitHref(u) + '">' + esc(e.name) + '</a></p>');
    h.push('<p class="aim"><b>In this lesson.</b> ' + esc(l.aim) + ' <span class="aim-span">' + esc(fmtYear(first.year)) + (lastEv.year !== first.year ? ' to ' + esc(fmtYear(lastEv.yearEnd || lastEv.year)) : '') + '.</span></p>');
    h.push(lessonMap(l));
    h.push('<p class="see-also"><a href="roma.html#ev=' + first.id + '">Walk these years on the living map of Roma</a><a href="' + atlasHref(mid, '-14,20,56,60') + '">See the wider world in ' + esc(atlasYear(atlasStep(mid))) + ' on the atlas</a></p>');
    h.push('<ol class="readings">');
    var figs = [], seenFig = {};
    l.evs.forEach(function (ev, i) {
      var span = ev.yearEnd ? fmtYear(ev.year) + ' to ' + fmtYear(ev.yearEnd) : fmtYear(ev.year);
      h.push('<li class="reading" id="r-' + ev.id + '"><p class="r-when"><span class="r-n">' + (i + 1) + '</span>' + esc(span) + (ev.place ? ', ' + esc(ev.place) : '') + '</p><h2>' + esc(ev.title) + '</h2><p class="r-text">' + esc(ev.text) + '</p>');
      (srcByEv[ev.id] || []).forEach(function (s) {
        h.push('<figure class="r-src"><figcaption>In the words of ' + esc(s.author) + ': ' + esc(s.title) + '</figcaption><blockquote>' + esc(s.text) + '</blockquote><p class="r-cite"><b>' + esc(s.author + ', ' + s.work + ' ' + s.ref) + '</b>. Translated by ' + esc(s.tr) + '.</p></figure>');
      });
      h.push('</li>');
      (ev.fig || []).forEach(function (id) { if (figById[id] && !seenFig[id]) { seenFig[id] = 1; figs.push(figById[id]); } });
    });
    h.push('</ol>');
    if (figs.length) {
      h.push('<section class="l-romans"><h2 class="sec-title small">The Romans of this lesson</h2>');
      figs.forEach(function (f) {
        var life = f.born == null && f.died == null ? '' : (f.approx ? 'c. ' : '') + fmtYear(f.born) + ' to ' + fmtYear(f.died);
        h.push('<details class="l-fig"><summary><span class="fig-name">' + esc(f.name) + '</span> <span class="fig-title">' + esc(f.title || '') + (life ? ', ' + esc(life) : '') + '</span></summary><p>' + esc(f.bio) + '</p>' +
          (f.quote && f.quote.text ? '<blockquote>' + esc(f.quote.text) + '<cite>' + esc(f.quote.source || '') + '</cite></blockquote>' : '') + '</details>');
      });
      h.push('</section>');
    }
    var prev = LESSONS[l.seq - 1], nextHash = nextAfterLesson(l), isLast = l.n === u.lessons.length;
    h.push('<nav class="lesson-nav">' + (prev ? '<a href="#' + prev.id + '">Earlier: ' + esc(prev.title) + '</a>' : '<a href="#">The whole course</a>') +
      '<a class="primary" id="lessonDone" href="' + nextHash + '">' + (isLast ? 'Mark as read and face the trial of this age' : 'Mark as read and go on: ' + esc(u.lessons[l.n].title)) + '</a></nav>');
    view.innerHTML = h.join('');
    $('lessonDone').addEventListener('click', function () { markRead(l.id); });
  }

  /* ---------- the trial (the same questions and the same record as Roma) ---------- */
  var trial = null;
  function renderTrial(u) {
    var e = u.eraObj, qs = quizByEra[u.era] || [], best = bests()[u.era];
    setHead('The trial of ' + e.name, 'Age ' + roman(u.i + 1) + ' of ' + roman(UNITS.length) + '. Six questions; answer four correctly to pass and rise one rank.');
    trial = { u: u, qs: qs, i: 0, score: 0 };
    var unread = u.lessons.filter(function (l) { return !readSet()[l.id]; });
    view.innerHTML = '<p class="crumbs"><a href="#">The course</a> / <a href="' + unitHref(u) + '">' + esc(e.name) + '</a></p>' +
      '<div class="trial" id="trial"><h3>The trial of ' + esc(e.name) + '</h3><p class="t-step">' + qs.length + ' questions on this age' + (best != null ? '. Your best so far: ' + best + ' of ' + qs.length + (best >= 4 ? ', passed' : '') : '') + '.' +
      (unread.length ? ' You have ' + unread.length + (unread.length === 1 ? ' lesson' : ' lessons') + ' of this age still to read.' : '') + '</p>' +
      '<div class="t-actions"><button type="button" class="primary" id="tStart">' + (best != null ? 'Take the trial again' : 'Begin the trial') + '</button>' +
      (unread.length ? '<a class="t-link" href="#' + unread[0].id + '">Read ' + esc(unread[0].title) + ' first</a>' : '') + '</div></div>';
    $('tStart').addEventListener('click', ask);
  }
  function ask() {
    var q = trial.qs[trial.i], box = $('trial');
    box.innerHTML = '<h3>The trial of ' + esc(trial.u.eraObj.name) + '</h3><p class="t-step">Question ' + (trial.i + 1) + ' of ' + trial.qs.length + '</p><p class="t-q">' + esc(q.q) + '</p><div class="t-opts">' +
      q.options.map(function (o, k) { return '<button type="button" class="t-opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div><div id="tFb"></div>';
    box.querySelectorAll('.t-opt').forEach(function (b) { b.addEventListener('click', function () { answer(+b.getAttribute('data-k')); }); });
  }
  function answer(k) {
    var q = trial.qs[trial.i], box = $('trial'), right = k === q.answer, last = trial.i === trial.qs.length - 1;
    if (right) trial.score++;
    box.querySelectorAll('.t-opt').forEach(function (b) {
      var j = +b.getAttribute('data-k'); b.disabled = true;
      if (j === q.answer) b.classList.add('right'); else if (j === k) b.classList.add('wrong');
    });
    $('tFb').innerHTML = '<p class="t-feedback"><b>' + (right ? 'Correct.' : 'Not quite. The answer is ' + esc(q.options[q.answer]) + '.') + '</b> ' + esc(q.explain) + '</p><div class="t-actions"><button type="button" class="primary" id="tNext">' + (last ? 'See your result' : 'Next question') + '</button></div>';
    $('tNext').addEventListener('click', function () { if (last) finish(); else { trial.i++; ask(); } });
    $('tNext').focus({ preventScroll: true });
  }
  function finish() {
    var u = trial.u, b = bests(), before = rankIndex(), pass = trial.score >= 4;
    b[u.era] = Math.max(b[u.era] || 0, trial.score); store(RANK_KEY, b);
    var after = rankIndex(), next = UNITS[u.i + 1];
    var rise = after > before ? ' You rise to ' + RANKS[after][0] + ' (' + RANKS[after][1] + ').' : '';
    var msg = pass ? 'You answered ' + trial.score + ' of ' + trial.qs.length + ' correctly. The trial is passed and this age is yours.' + rise
      : 'You answered ' + trial.score + ' of ' + trial.qs.length + ' correctly. Four are needed to pass; read the lessons of this age again and return.';
    $('trial').innerHTML = '<h3>The trial of ' + esc(u.eraObj.name) + '</h3><p class="t-result">' + esc(msg) + '</p><div class="t-actions"><button type="button" id="tAgain">Take the trial again</button>' +
      (pass && next ? '<a class="t-link primary" href="#' + next.era + '/1">Go on to ' + esc(next.eraObj.name) + '</a>' : pass ? '<a class="t-link primary" href="#">You have finished the course</a>' : '<a class="t-link" href="' + unitHref(u) + '">Back to the lessons of this age</a>') + '</div>';
    $('tAgain').addEventListener('click', function () { trial.i = 0; trial.score = 0; ask(); });
  }

  /* ---------- routing ---------- */
  function route() {
    var m = /^#([\w-]+)(?:\/(\w+))?$/.exec(location.hash), u = null;
    if (m) UNITS.forEach(function (x) { if (x.era === m[1]) u = x; });
    if (!u) { renderHome(); if (location.hash === '#orbis' && $('orbis')) $('orbis').scrollIntoView(); return; }
    if (!m[2]) renderUnit(u);
    else if (m[2] === 'trial') renderTrial(u);
    else { var l = u.lessons[+m[2] - 1]; if (l) renderLesson(l); else renderUnit(u); }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  window.addEventListener('hashchange', route);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', route); else route();
})();
