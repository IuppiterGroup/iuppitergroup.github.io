// Unlisted stats page: reads per-page visitor counts from GoatCounter's public counter endpoint.
(function () {
  'use strict';
  var GC = 'https://jupitergroup.goatcounter.com/counter/';
  var PAGES = [
    ['/', 'Home', 'Site'],
    ['/atlas', 'Orbis Terrarum (Atlas)', 'History'],
    ['/roma', 'Roma: Ab Urbe Condita', 'History'],
    ['/quotes', 'Wisdom of the Ages', 'History'],
    ['/research', 'Research Papers (index)', 'Research'],
    ['/papers/historical-filter', 'The Historical Filter', 'Research'],
    ['/papers/dividend-study', 'Ex-Dividend Day Price Drop', 'Research'],
    ['/papers/rsi-study', 'RSI Strategy Study', 'Research'],
    ['/papers/antimatter-report', 'Antimatter Report', 'Research'],
    ['/papers/stellar-centrifuge-study', 'Gravitational Centrifuge', 'Research'],
    ['/papers/housewife-tax-policy', 'The Maternal Investment Act', 'Research'],
    ['/tools', 'Finance Tools', 'Tools'],
    ['/software', 'Software', 'Software'],
    ['/writer', 'luppiter Writer', 'Software'],
    ['/writer-download', 'Writer Download', 'Software'],
    ['/chrome-extensions', 'Chrome Extensions', 'Software'],
    ['/audiobook-download/', 'Audiobook Download', 'Software'],
    ['/dcf-download/', 'DCF Download', 'Software'],
    ['/games', 'Games', 'Games'],
    ['/about', 'About', 'Site'],
    ['/contact', 'Contact', 'Site'],
    ['/tos', 'Terms', 'Site']
  ];
  var LABEL = { '': 'Visitors, all time', year: 'Visitors, past year', month: 'Visitors, past month', week: 'Visitors, past week' };

  // Don't count the owner's own visits in this browser (GoatCounter's own opt-out flag).
  var selfNote = document.getElementById('self-note');
  function paintSelf() {
    var off = false;
    try { off = localStorage.getItem('skipgc') === 't'; } catch (e) { }
    selfNote.textContent = '';
    if (off) {
      selfNote.appendChild(document.createTextNode('Your own visits in this browser are not counted. '));
      var b = document.createElement('button'); b.className = 'linkbtn'; b.type = 'button'; b.textContent = 'Count them again';
      b.addEventListener('click', function () { try { localStorage.removeItem('skipgc'); } catch (e) { } paintSelf(); });
      selfNote.appendChild(b);
    }
  }
  try { if (localStorage.getItem('skipgc') !== 't') localStorage.setItem('skipgc', 't'); } catch (e) { }
  paintSelf();

  function get(path, start) {
    var url = GC + encodeURIComponent(path) + '.json' + (start ? '?start=' + start : '');
    return fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (r) {
      if (r.status === 404) return 0;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(function (j) { return parseInt(String(j.count || '0').replace(/[^0-9]/g, ''), 10) || 0; });
    });
  }

  var rows = document.getElementById('rows'), total = document.getElementById('total');
  var setup = document.getElementById('setup'), totalLabel = document.getElementById('total-label');
  var seq = 0;

  function cell(tag, text, cls) { var c = document.createElement(tag); if (cls) c.className = cls; if (text !== undefined) c.textContent = text; return c; }

  function load(start) {
    var my = ++seq;
    totalLabel.textContent = LABEL[start];
    total.textContent = '–';
    Promise.all([get('TOTAL', start)].concat(PAGES.map(function (p) { return get(p[0], start); }))).then(function (res) {
      if (my !== seq) return;
      setup.hidden = true;
      total.textContent = res[0].toLocaleString();
      var list = PAGES.map(function (p, i) { return { path: p[0], name: p[1], grp: p[2], n: res[i + 1] }; })
        .sort(function (a, b) { return b.n - a.n || a.name.localeCompare(b.name); });
      var max = Math.max(1, list[0].n);
      rows.textContent = '';
      list.forEach(function (x) {
        var tr = document.createElement('tr');
        var a = document.createElement('a'); a.href = x.path; a.textContent = x.name;
        var td = cell('td'); td.appendChild(a); tr.appendChild(td);
        tr.appendChild(cell('td', x.grp, 'grp'));
        var bc = cell('td', undefined, 'barcell'), bar = cell('div', undefined, 'bar');
        bar.style.width = (x.n / max * 100).toFixed(1) + '%'; if (!x.n) bar.style.opacity = '0.15';
        bc.appendChild(bar); tr.appendChild(bc);
        tr.appendChild(cell('td', x.n.toLocaleString(), 'num'));
        rows.appendChild(tr);
      });
    }).catch(function () {
      if (my !== seq) return;
      setup.hidden = false;
      rows.textContent = '';
      var tr = document.createElement('tr'); tr.appendChild(cell('td', 'Counts are not available yet.')); tr.firstChild.colSpan = 4; rows.appendChild(tr);
    });
  }

  var buttons = document.querySelectorAll('.range button');
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(buttons, function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      load(b.getAttribute('data-start'));
    });
  });
  load('');
})();
