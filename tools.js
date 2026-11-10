/* luppiter Group: Tools page
   Cash-secured put calculator, ex-dividend drop estimator,
   RSI study explorer, and RSI backtester. Runs entirely in the browser. */
(function () {
  'use strict';

  /* ───────────── Formatting helpers ───────────── */
  var NF = {};
  function nf(d) {
    if (!NF[d]) NF[d] = new Intl.NumberFormat('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return NF[d];
  }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function fixed(x, d) {
    if (!isNum(x)) return 'n/a';
    var r = Math.round(x * Math.pow(10, d)) / Math.pow(10, d);
    if (r === 0) r = 0; // drop negative zero
    return nf(d).format(r);
  }
  function usd(x) {
    if (!isNum(x)) return 'n/a';
    var s = fixed(Math.abs(x), 2);
    return (x < 0 && s !== '0.00' ? '-$' : '$') + s;
  }
  function pct(frac, d) { return isNum(frac) ? fixed(frac * 100, d == null ? 2 : d) + '%' : 'n/a'; }
  function intf(x) { return isNum(x) ? nf(0).format(Math.round(x)) : 'n/a'; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function setText(id, t) { var el = $(id); if (el) el.textContent = t; }
  function signClass(el, x) {
    if (!el) return;
    el.classList.remove('pos', 'neg');
    if (isNum(x) && Math.abs(x) > 1e-12) el.classList.add(x > 0 ? 'pos' : 'neg');
  }

  /* Read and validate one numeric input. Returns {value, error}. */
  function readNum(id, o) {
    var el = $(id);
    var raw = (el.value || '').trim().replace(/,/g, '');
    var res = { value: null, error: null };
    if (raw === '') {
      if (o.required) res.error = o.label + ' is required.';
    } else {
      var v = Number(raw);
      if (!isFinite(v)) res.error = o.label + ' must be a number.';
      else if (o.integer && Math.floor(v) !== v) res.error = o.label + ' must be a whole number.';
      else if (o.gt != null && !(v > o.gt)) res.error = o.label + ' must be greater than ' + o.gt + '.';
      else if (o.min != null && v < o.min) res.error = o.label + ' must be at least ' + o.min + '.';
      else if (o.max != null && v > o.max) res.error = o.label + ' must be at most ' + o.max + '.';
      else if (o.lt != null && !(v < o.lt)) res.error = o.label + ' must be less than ' + o.lt + '.';
      else res.value = v;
    }
    el.setAttribute('aria-invalid', res.error ? 'true' : 'false');
    return res;
  }
  function showErrors(id, list) {
    var box = $(id);
    if (!box) return;
    box.innerHTML = list.length ? '<ul>' + list.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '';
  }

  /* ───────────── 1. Cash-secured put ───────────── */
  function calcPut(p) {
    var shares = 100 * p.contracts;
    var collateral = p.strike * shares;
    var gross = p.premium * shares;
    var commissions = (p.commission || 0) * p.contracts;
    var net = gross - commissions;
    var netPerShare = net / shares;
    var periodReturn = net / collateral;
    var annualized = (net / p.contracts) / (p.strike * 100) * 365 / p.days;
    var y = (p.yieldPct || 0) / 100;
    var breakeven = p.strike - netPerShare;
    return {
      shares: shares,
      collateral: collateral,
      gross: gross,
      commissions: commissions,
      net: net,
      netPerShare: netPerShare,
      periodReturn: periodReturn,
      annualized: annualized,
      yieldRate: y,
      totalAnnualized: annualized + y,
      interest: collateral * y * p.days / 365,
      breakeven: breakeven,
      cushion: (p.price - breakeven) / p.price,
      basisPerShare: breakeven,
      basisTotal: breakeven * shares
    };
  }

  function updatePut() {
    var errs = [];
    var f = {
      price: readNum('put-price', { label: 'Stock price', required: true, gt: 0 }),
      strike: readNum('put-strike', { label: 'Strike price', required: true, gt: 0 }),
      premium: readNum('put-premium', { label: 'Premium', required: true, min: 0 }),
      days: readNum('put-days', { label: 'Days to expiration', required: true, integer: true, min: 1, max: 3650 }),
      contracts: readNum('put-contracts', { label: 'Contracts', required: true, integer: true, min: 1, max: 100000 }),
      yieldPct: readNum('put-yield', { label: 'T-bill yield', min: 0, max: 100 }),
      commission: readNum('put-comm', { label: 'Commission', min: 0 })
    };
    Object.keys(f).forEach(function (k) { if (f[k].error) errs.push(f[k].error); });
    if (!errs.length && f.premium.value >= f.strike.value) {
      errs.push('Premium must be less than the strike price.');
      $('put-premium').setAttribute('aria-invalid', 'true');
    }
    showErrors('put-errors', errs);
    var ids = ['annual', 'collateral', 'premium', 'period', 'annual2', 'total', 'breakeven', 'cushion', 'basis'];
    if (errs.length) {
      ids.forEach(function (i) { setText('put-out-' + i, 'n/a'); });
      ['annual-sub', 'premium-sub', 'period-sub', 'total-sub', 'basis-sub'].forEach(function (i) { setText('put-out-' + i, ''); });
      return null;
    }
    var p = {};
    Object.keys(f).forEach(function (k) { p[k] = f[k].value; });
    var r = calcPut(p);
    var hasYield = p.yieldPct != null;
    setText('put-out-annual', pct(r.annualized));
    setText('put-out-annual-sub', hasYield ? pct(r.totalAnnualized) + ' including the ' + pct(r.yieldRate) + ' T-bill yield' : 'Premium only, net of commissions');
    setText('put-out-collateral', usd(r.collateral));
    setText('put-out-premium', usd(r.net));
    setText('put-out-premium-sub', 'Gross ' + usd(r.gross) + ' less ' + usd(r.commissions) + ' commissions');
    setText('put-out-period', pct(r.periodReturn));
    setText('put-out-period-sub', intf(p.days) + (p.days === 1 ? ' day' : ' days'));
    setText('put-out-annual2', pct(r.annualized));
    setText('put-out-total', pct(r.totalAnnualized));
    setText('put-out-total-sub', hasYield ? 'Est. interest on collateral over the period: ' + usd(r.interest) : 'No T-bill yield entered');
    setText('put-out-breakeven', usd(r.breakeven));
    setText('put-out-cushion', pct(r.cushion));
    signClass($('put-out-cushion'), r.cushion);
    setText('put-out-basis', usd(r.basisPerShare) + ' / share');
    setText('put-out-basis-sub', usd(r.basisTotal) + ' for ' + intf(r.shares) + ' shares');
    return r;
  }

  /* ───────────── 2. Ex-dividend drop (numbers from papers/dividend-study.html) ───────────── */
  var DIV = {
    overall: { label: 'All events', n: 19218, mean: 0.866, ci: [0.831, 0.901] },
    sectors: [ // Table 5: N, market-adjusted mean, clustered 95% CI
      { name: 'Communication Services', n: 401, mean: 0.770, ci: [0.538, 1.002] },
      { name: 'Consumer Discretionary', n: 1594, mean: 0.787, ci: [0.691, 0.884] },
      { name: 'Consumer Staples', n: 1641, mean: 0.875, ci: [0.796, 0.954] },
      { name: 'Energy', n: 1022, mean: 0.907, ci: [0.812, 1.003] },
      { name: 'Financials', n: 3393, mean: 0.890, ci: [0.801, 0.979] },
      { name: 'Health Care', n: 1879, mean: 0.856, ci: [0.728, 0.983] },
      { name: 'Industrials', n: 3315, mean: 0.883, ci: [0.804, 0.961] },
      { name: 'Information Technology', n: 1777, mean: 0.810, ci: [0.655, 0.966] },
      { name: 'Materials', n: 1157, mean: 0.845, ci: [0.725, 0.965] },
      { name: 'Real Estate', n: 1412, mean: 0.886, ci: [0.823, 0.948] },
      { name: 'Utilities', n: 1627, mean: 0.915, ci: [0.843, 0.987] }
    ],
    yields: [ // Table 4: trailing-yield terciles
      { name: 'Low (under 1.73%)', short: 'Low', n: 6348, mean: 0.798, ci: [0.708, 0.887] },
      { name: 'Medium (1.73% to 3.05%)', short: 'Medium', n: 6435, mean: 0.868, ci: [0.839, 0.898] },
      { name: 'High (over 3.05%)', short: 'High', n: 6435, mean: 0.930, ci: [0.903, 0.957] }
    ],
    reg: { a: 0.777, b: 3.411 } // Table 7: ratio = 0.777 + 0.0341 × yield in percent
  };

  function buildDivBasis() {
    var sel = $('div-basis');
    var h = '<optgroup label="Overall"><option value="overall" selected>All events: 0.866 (N = 19,218)</option></optgroup>';
    h += '<optgroup label="By sector (Table 5)">';
    DIV.sectors.forEach(function (s, i) { h += '<option value="sector:' + i + '">' + esc(s.name) + ': ' + s.mean.toFixed(3) + ' (N = ' + intf(s.n) + ')</option>'; });
    h += '</optgroup><optgroup label="By trailing yield (Table 4)">';
    DIV.yields.forEach(function (s, i) { h += '<option value="yield:' + i + '">' + s.name + ': ' + s.mean.toFixed(3) + ' (N = ' + intf(s.n) + ')</option>'; });
    h += '</optgroup><optgroup label="By yield regression (Table 7)">';
    h += '<option value="reg">Regression: 0.777 + 0.034 × yield (%)</option></optgroup>';
    sel.innerHTML = h;
  }

  function divRatio(basis, yieldFrac) {
    function grp(g, kind) {
      return {
        ratio: g.mean,
        ci: g.ci.slice(),
        label: kind + ' mean, N = ' + intf(g.n),
        ciNote: '95% CI of the average, clustered by date and firm, from the paper'
      };
    }
    if (basis === 'overall') return { ratio: DIV.overall.mean, ci: DIV.overall.ci.slice(), label: 'Overall mean, N = 19,218', ciNote: '95% CI of the average, clustered by date and firm, from the paper' };
    if (basis.indexOf('sector:') === 0) { var s = DIV.sectors[+basis.slice(7)]; return grp(s, s.name); }
    if (basis.indexOf('yield:') === 0) { var y = DIV.yields[+basis.slice(6)]; return grp(y, y.short + '-yield tercile'); }
    return { ratio: DIV.reg.a + DIV.reg.b * yieldFrac, ci: null, label: 'Regression on yield (R² below 1%)', ciNote: 'not reported for the regression fit' };
  }

  function calcDiv(p) {
    var yieldFrac = p.dividend * p.freq / p.price;
    var b = divRatio(p.basis, yieldFrac);
    var drop = p.dividend * b.ratio;
    var out = {
      yieldFrac: yieldFrac,
      ratio: b.ratio,
      ratioLabel: b.label,
      ci: b.ci,
      ciNote: b.ciNote,
      drop: drop,
      open: p.price - drop,
      fullDrop: p.price - p.dividend,
      shortfall: p.dividend - drop,
      range: null
    };
    if (b.ci) out.range = [p.price - p.dividend * b.ci[1], p.price - p.dividend * b.ci[0]];
    return out;
  }

  function updateDiv() {
    var errs = [];
    var price = readNum('div-price', { label: 'Share price', required: true, gt: 0 });
    var dividend = readNum('div-amount', { label: 'Dividend', required: true, gt: 0 });
    [price, dividend].forEach(function (f) { if (f.error) errs.push(f.error); });
    if (!errs.length && dividend.value >= price.value) {
      errs.push('Dividend must be less than the share price.');
      $('div-amount').setAttribute('aria-invalid', 'true');
    }
    showErrors('div-errors', errs);
    var ids = ['drop', 'ratio', 'open', 'range', 'full', 'shortfall'];
    if (errs.length) {
      ids.forEach(function (i) { setText('div-out-' + i, 'n/a'); });
      ['drop-sub', 'ratio-sub', 'range-sub'].forEach(function (i) { setText('div-out-' + i, ''); });
      $('div-yield').value = 'n/a';
      setText('div-warn', '');
      return null;
    }
    var r = calcDiv({ price: price.value, dividend: dividend.value, freq: +$('div-freq').value, basis: $('div-basis').value });
    $('div-yield').value = pct(r.yieldFrac);
    setText('div-warn', r.yieldFrac > 0.12 ? 'Note: this yield is above almost every event in the paper’s sample (99.9% of events had a trailing yield under 12%), so the estimate is an extrapolation.' : '');
    setText('div-out-drop', usd(r.drop));
    setText('div-out-drop-sub', fixed(r.ratio * 100, 1) + '% of the ' + usd(dividend.value) + ' dividend');
    setText('div-out-ratio', fixed(r.ratio, 3));
    setText('div-out-ratio-sub', r.ratioLabel);
    setText('div-out-open', usd(r.open));
    if (r.range) {
      setText('div-out-range', usd(r.range[0]) + ' to ' + usd(r.range[1]));
      setText('div-out-range-sub', 'Drop ratio ' + fixed(r.ci[0], 3) + ' to ' + fixed(r.ci[1], 3) + ': ' + r.ciNote);
    } else {
      setText('div-out-range', 'n/a');
      setText('div-out-range-sub', 'Confidence interval ' + r.ciNote);
    }
    setText('div-out-full', usd(r.fullDrop));
    setText('div-out-shortfall', usd(r.shortfall));
    return r;
  }

  /* ───────────── 3a. RSI study data (papers/rsi-study.html) ───────────── */
  var STRATS = [
    { id: 'd3070', name: 'Daily 30/70', color: '#c98500', trades: 3948, perStock: 39.9, win: 79.9, avg: 7.63, med: 9.06, sd: 15.37, hold: 149, medHold: 112, pf: 3.72, avgWin: 13.04, avgLoss: -13.96, best: 124.63, worst: -93.79, winStreak: 69, loseStreak: 9, randAvg: 6.96, randWin: 64.3, randP: '0.032', stratAnn: 8.2, bhAnn: 13.7, bhT: -9.39, bhP: '2.50 × 10⁻¹⁵', wP: '5.15 × 10⁻¹⁶' },
    { id: 'd2080', name: 'Daily 20/80', color: '#3987e5', trades: 599, perStock: 6.1, win: 86.6, avg: 46.59, med: 27.56, sd: 88.59, hold: 769, medHold: 525, pf: 15.95, avgWin: 57.37, avgLoss: -23.33, best: 1247.84, worst: -87.64, winStreak: 53, loseStreak: 3, randAvg: 46.98, randWin: 74.9, randP: '0.490', stratAnn: 6.7, bhAnn: 13.7, bhT: -11.26, bhP: '2.30 × 10⁻¹⁹', wP: '4.17 × 10⁻¹⁷' },
    { id: 'w3070', name: 'Weekly 30/70', color: '#d95926', trades: 600, perStock: 6.1, win: 88.0, avg: 37.07, med: 34.37, sd: 38.64, hold: 603, medHold: 490, pf: 13.78, avgWin: 45.42, avgLoss: -24.17, best: 215.41, worst: -87.47, winStreak: 83, loseStreak: 6, randAvg: 31.35, randWin: 73.8, randP: '0.010', stratAnn: 6.8, bhAnn: 13.7, bhT: -12.19, bhP: '2.37 × 10⁻²¹', wP: '1.08 × 10⁻¹⁷' },
    { id: 'w2080', name: 'Weekly 20/80', color: '#199e70', trades: 83, perStock: 0.8, win: 95.2, avg: 246.31, med: 169.30, sd: 256.20, hold: 2381, medHold: 2093, pf: 175.05, avgWin: 260.27, avgLoss: -29.37, best: 1544.82, worst: -65.73, winStreak: 51, loseStreak: 2, randAvg: 195.22, randWin: 84.7, randP: '0.081', stratAnn: 5.2, bhAnn: 13.7, bhT: -12.06, bhP: '4.47 × 10⁻²¹', wP: '4.29 × 10⁻¹⁷' }
  ];
  var STRAT_BY_ID = {};
  STRATS.forEach(function (s) { STRAT_BY_ID[s.id] = s; });

  var SECTORS = { // Tables 6 and 7: [sector, trades, win rate %, avg return %, median return %]
    d3070: [['Mega Cap Tech', 169, 78.1, 10.54, 12.34], ['Consumer Discretionary', 373, 78.8, 8.80, 10.79], ['Materials', 290, 80.7, 8.29, 10.00], ['Energy', 383, 78.9, 8.18, 10.74], ['Healthcare', 442, 80.8, 8.01, 9.40], ['Consumer Staples', 418, 82.3, 7.87, 8.02], ['REITs', 247, 80.2, 7.61, 8.60], ['Financials', 391, 78.0, 7.45, 9.53], ['Industrials', 551, 77.3, 6.77, 8.93], ['Utilities', 465, 86.0, 6.25, 7.53], ['Communication', 219, 74.9, 5.69, 7.70]],
    w3070: [['Mega Cap Tech', 29, 89.7, 62.48, 60.46], ['Consumer Discretionary', 53, 83.0, 47.17, 36.72], ['Financials', 64, 90.6, 44.01, 44.78], ['Materials', 51, 92.2, 43.17, 43.63], ['REITs', 34, 82.4, 37.49, 31.97], ['Communication', 38, 84.2, 34.81, 32.91], ['Energy', 66, 89.4, 33.48, 28.04], ['Industrials', 94, 88.3, 33.21, 33.16], ['Consumer Staples', 51, 86.3, 32.08, 34.21], ['Healthcare', 59, 89.8, 30.92, 30.01], ['Utilities', 61, 88.5, 24.93, 24.00]]
  };
  var ANOVA = { d3070: [1.866, '0.045', 'significant at the 5% level, but not after a Bonferroni correction for four strategies'], w3070: [3.051, '0.0009', 'significant, also after a Bonferroni correction'] };

  var CRISES = [ // Table 10: [trades, win rate %, avg return %] by strategy
    { name: 'GFC (Oct 2007 to Mar 2009)', d3070: [113, 54.9, -1.31], d2080: [20, 85.0, 72.04], w3070: [72, 86.1, 40.22], w2080: [11, 100.0, 352.35] },
    { name: 'COVID (Feb to Jun 2020)', d3070: [64, 70.3, 9.68], d2080: [22, 95.5, 67.47], w3070: [47, 95.7, 74.75], w2080: [18, 100.0, 239.38] },
    { name: 'Bear market 2022', d3070: [118, 68.6, 6.01], d2080: [21, 90.5, 36.09], w3070: [24, 83.3, 27.96], w2080: [2, 100.0, 217.48] }
  ];
  var PERIODS = [['1962–1969', 156, 74.4, 4.56], ['1970–1979', 348, 72.1, 3.88], ['1980–1989', 586, 82.4, 8.36], ['1990–1999', 630, 81.3, 9.99], ['2000–2009', 657, 76.7, 6.42], ['2010–2019', 871, 84.7, 8.07], ['2020–2026', 700, 78.9, 8.00]]; // Table 9, Daily 30/70 by decade

  var METRICS = [
    { key: 'win', label: 'Win rate', fmt: function (v) { return fixed(v, 1) + '%'; } },
    { key: 'avg', label: 'Average return per trade', fmt: function (v) { return fixed(v, 2) + '%'; } },
    { key: 'med', label: 'Median return per trade', fmt: function (v) { return fixed(v, 2) + '%'; } },
    { key: 'hold', label: 'Average holding period (days)', fmt: function (v) { return intf(v) + ' days'; } },
    { key: 'trades', label: 'Total trades', fmt: function (v) { return intf(v); } },
    { key: 'pf', label: 'Profit factor', fmt: function (v) { return fixed(v, 2); } },
    { key: 'randAvg', label: 'Average return of random entries (same stocks and holds)', fmt: function (v) { return fixed(v, 2) + '%'; } },
    { key: 'stratAnn', label: 'Annualized return per stock, T-bills on idle cash', fmt: function (v) { return fixed(v, 1) + '%'; } },
    { key: 'bhT', label: 'Paired t-stat vs. buy-and-hold (negative = underperformed)', fmt: function (v) { return fixed(v, 2); } }
  ];

  /* ───────────── Horizontal bar chart (vanilla SVG) ───────────── */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, text) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }
  function barPath(x0, x1, y, h) {
    var r = Math.min(4, h / 2, Math.abs(x1 - x0));
    if (Math.abs(x1 - x0) < 0.5) return 'M' + x0 + ' ' + y + 'h0.5v' + h + 'h-0.5z';
    if (x1 >= x0) {
      return 'M' + x0 + ' ' + y + 'H' + (x1 - r) + 'Q' + x1 + ' ' + y + ' ' + x1 + ' ' + (y + r) +
        'V' + (y + h - r) + 'Q' + x1 + ' ' + (y + h) + ' ' + (x1 - r) + ' ' + (y + h) + 'H' + x0 + 'Z';
    }
    return 'M' + x0 + ' ' + y + 'H' + (x1 + r) + 'Q' + x1 + ' ' + y + ' ' + x1 + ' ' + (y + r) +
      'V' + (y + h - r) + 'Q' + x1 + ' ' + (y + h) + ' ' + (x1 + r) + ' ' + (y + h) + 'H' + x0 + 'Z';
  }
  var CHARTS = {};
  function drawBars(id, rows, aria) {
    CHARTS[id] = { rows: rows, aria: aria };
    var box = $(id);
    if (!box) return;
    box.innerHTML = '';
    var data = rows.filter(function (r) { return r.group == null; });
    if (!data.length) { box.innerHTML = '<p class="empty">Select at least one strategy to chart.</p>'; return; }
    var W = Math.max(240, Math.floor(box.clientWidth || 600));
    var LABEL_H = 18, BAR_H = 14, ROW_GAP = 12, GROUP_H = 28;
    var maxValW = 0;
    data.forEach(function (r) { maxValW = Math.max(maxValW, r.valueText.length * 7.4 + 10); });
    var vals = data.map(function (r) { return r.value; });
    var lo = Math.min(0, Math.min.apply(null, vals));
    var hi = Math.max(0, Math.max.apply(null, vals));
    if (hi === lo) hi = lo + 1;
    var plotW = W - maxValW;
    var scale = plotW / (hi - lo);
    var x0 = (0 - lo) * scale;
    var y = 0, H = 0;
    rows.forEach(function (r) { H += r.group != null ? GROUP_H : LABEL_H + BAR_H + ROW_GAP; });
    var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': aria });
    var axis = svgEl('line', { x1: x0, x2: x0, y1: 0, y2: H - ROW_GAP + 2, 'class': 'ch-axis' });
    rows.forEach(function (r) {
      if (r.group != null) {
        svg.appendChild(svgEl('text', { x: 0, y: y + 18, 'class': 'ch-group' }, r.group));
        y += GROUP_H;
        return;
      }
      var g = svgEl('g', { 'class': 'bar' });
      g.appendChild(svgEl('title', {}, r.label + ': ' + r.valueText));
      g.appendChild(svgEl('text', { x: 0, y: y + 13, 'class': 'ch-label' }, r.label));
      var by = y + LABEL_H;
      var x1 = (r.value - lo) * scale;
      g.appendChild(svgEl('path', { d: barPath(x0, x1, by, BAR_H), fill: r.color }));
      var tx, anchor = 'start';
      if (r.value >= 0) tx = x1 + 6;
      else tx = x0 + 6;
      g.appendChild(svgEl('text', { x: tx, y: by + BAR_H - 2, 'class': 'ch-value', 'text-anchor': anchor }, r.valueText));
      svg.appendChild(g);
      y += LABEL_H + BAR_H + ROW_GAP;
    });
    svg.appendChild(axis);
    box.appendChild(svg);
  }
  var resizeTimer = null, lastW = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var w = document.documentElement.clientWidth;
      if (w === lastW) return;
      lastW = w;
      Object.keys(CHARTS).forEach(function (id) { drawBars(id, CHARTS[id].rows, CHARTS[id].aria); });
    }, 120);
  });

  /* ───────────── RSI explorer rendering ───────────── */
  function selectedStrats() {
    return STRATS.filter(function (s) { var cb = $('rsi-on-' + s.id); return cb && cb.checked; });
  }

  function buildRsiControls() {
    var tg = $('rsi-toggles');
    STRATS.forEach(function (s) {
      var lab = document.createElement('label');
      lab.className = 'chip';
      lab.innerHTML = '<input type="checkbox" id="rsi-on-' + s.id + '" checked><span class="sw" style="background:' + s.color + '"></span>' + esc(s.name);
      tg.appendChild(lab);
    });
    var ms = $('rsi-metric');
    ms.innerHTML = METRICS.map(function (m) { return '<option value="' + m.key + '">' + esc(m.label) + '</option>'; }).join('');
    ms.value = 'win';
  }

  function renderRsiMain() {
    var sel = selectedStrats();
    var m = METRICS.filter(function (x) { return x.key === $('rsi-metric').value; })[0] || METRICS[0];
    drawBars('rsi-chart-main', sel.map(function (s) {
      return { label: s.name, value: s[m.key], valueText: m.fmt(s[m.key]), color: s.color };
    }), m.label + ' by RSI strategy');

    var t = $('rsi-table-main');
    if (!sel.length) { t.innerHTML = '<tbody><tr><td>Select at least one strategy.</td></tr></tbody>'; return; }
    var rows = [
      ['Total trades', function (s) { return intf(s.trades); }],
      ['Avg trades per stock', function (s) { return fixed(s.perStock, 1); }],
      ['Win rate', function (s) { return fixed(s.win, 1) + '%'; }],
      ['Avg return per trade', function (s) { return fixed(s.avg, 2) + '%'; }],
      ['Median return per trade', function (s) { return fixed(s.med, 2) + '%'; }],
      ['Std dev of returns', function (s) { return fixed(s.sd, 2) + '%'; }],
      ['Avg holding period', function (s) { return intf(s.hold) + ' days'; }],
      ['Median holding period', function (s) { return intf(s.medHold) + ' days'; }],
      ['Profit factor', function (s) { return fixed(s.pf, 2); }],
      ['Avg winning trade', function (s) { return '+' + fixed(s.avgWin, 2) + '%'; }],
      ['Avg losing trade', function (s) { return fixed(s.avgLoss, 2) + '%'; }],
      ['Best single trade', function (s) { return '+' + fixed(s.best, 2) + '%'; }],
      ['Worst single trade', function (s) { return fixed(s.worst, 2) + '%'; }],
      ['Longest win / lose streak', function (s) { return s.winStreak + ' / ' + s.loseStreak; }],
      ['Avg return, random entries', function (s) { return fixed(s.randAvg, 2) + '%'; }],
      ['Win rate, random entries', function (s) { return fixed(s.randWin, 1) + '%'; }],
      ['p-value, RSI avg vs. random', function (s) { return s.randP; }],
      ['Annualized per stock, T-bills on idle cash', function (s) { return fixed(s.stratAnn, 1) + '%'; }],
      ['Annualized per stock, buy-and-hold', function (s) { return fixed(s.bhAnn, 1) + '%'; }],
      ['Annualized return vs. buy-and-hold', function () { return 'Underperformed'; }],
      ['Paired t-stat vs. buy-and-hold', function (s) { return fixed(s.bhT, 2); }],
      ['Paired t-test p-value', function (s) { return s.bhP; }],
      ['Wilcoxon signed-rank p-value', function (s) { return s.wP; }]
    ];
    var h = '<caption>RSI strategy performance (gross, per trade)</caption><thead><tr><th scope="col">Metric</th>';
    sel.forEach(function (s) { h += '<th scope="col"><span class="sw" style="background:' + s.color + '"></span>' + esc(s.name) + '</th>'; });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr><th scope="row">' + esc(r[0]) + '</th>';
      sel.forEach(function (s) {
        var v = r[1](s);
        var cls = r[0].indexOf('buy-and-hold') > -1 && r[0].indexOf('Annualized') === 0 ? ' class="neg"' : '';
        h += '<td' + cls + '>' + esc(v) + '</td>';
      });
      h += '</tr>';
    });
    t.innerHTML = h + '</tbody>';
  }

  function renderRsiSector() {
    var sid = $('rsi-sector-strat').value;
    var mk = $('rsi-sector-metric').value;
    var col = { trades: 1, win: 2, avg: 3, med: 4 }[mk];
    var labels = { trades: 'Trades', win: 'Win rate', avg: 'Average return per trade', med: 'Median return per trade' };
    var rows = SECTORS[sid].slice().sort(function (a, b) { return b[col] - a[col]; });
    var s = STRAT_BY_ID[sid];
    drawBars('rsi-chart-sector', rows.map(function (r) {
      var v = r[col];
      var txt = mk === 'trades' ? intf(v) : mk === 'win' ? fixed(v, 1) + '%' : fixed(v, 2) + '%';
      return { label: r[0], value: v, valueText: txt, color: s.color };
    }), labels[mk] + ' by sector, ' + s.name);
    var a = ANOVA[sid];
    setText('rsi-anova', s.name + ': one-way ANOVA across sectors F = ' + fixed(a[0], 3) + ', p = ' + a[1] + ' (' + a[2] + ').');
    var h = '<caption>' + esc(s.name) + ' by sector</caption><thead><tr><th scope="col">Sector</th><th scope="col">Trades</th><th scope="col">Win rate</th><th scope="col">Avg return</th><th scope="col">Median return</th></tr></thead><tbody>';
    SECTORS[sid].forEach(function (r) {
      h += '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + intf(r[1]) + '</td><td>' + fixed(r[2], 1) + '%</td><td>' + fixed(r[3], 2) + '%</td><td>' + fixed(r[4], 2) + '%</td></tr>';
    });
    $('rsi-table-sector').innerHTML = h + '</tbody>';
  }

  function renderRsiRegime() {
    var sel = selectedStrats();
    var mk = $('rsi-regime-metric').value;
    var col = { trades: 0, win: 1, avg: 2 }[mk];
    var labels = { trades: 'Trades', win: 'Win rate', avg: 'Average return per trade' };
    var rows = [];
    if (sel.length) {
      CRISES.forEach(function (c) {
        rows.push({ group: c.name });
        sel.forEach(function (s) {
          var d = c[s.id], v = d[col];
          var txt = mk === 'trades' ? intf(v) : mk === 'win' ? fixed(v, 1) + '%' : fixed(v, 2) + '%';
          rows.push({ label: s.name + ' (' + intf(d[0]) + (d[0] === 1 ? ' trade)' : ' trades)'), value: v, valueText: txt, color: s.color });
        });
      });
    }
    drawBars('rsi-chart-regime', rows, labels[mk] + ' during market crises by strategy');
  }

  function renderRsiPeriods() {
    var h = '<caption>Daily 30/70 by decade of entry (Table 9)</caption><thead><tr><th scope="col">Period</th><th scope="col">Trades</th><th scope="col">Win rate</th><th scope="col">Avg return</th></tr></thead><tbody>';
    PERIODS.forEach(function (r) {
      h += '<tr><th scope="row">' + r[0] + '</th><td>' + intf(r[1]) + '</td><td>' + fixed(r[2], 1) + '%</td><td>' + fixed(r[3], 2) + '%</td></tr>';
    });
    $('rsi-table-period').innerHTML = h + '</tbody>';
  }

  /* ───────────── 3b. RSI backtester ───────────── */

  // Deterministic synthetic demo series (seeded PRNG; add/multiply only, so it is identical in every browser).
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function demoSeries() {
    var rnd = mulberry32(246);
    function norm() { var s = 0; for (var i = 0; i < 12; i++) s += rnd(); return s - 6; }
    var regimes = [[200, 0.0006], [90, -0.0028], [170, 0.0012], [130, 0.0001], [80, -0.0036], [200, 0.0011], [110, -0.0010], [150, 0.0009], [70, -0.0025], [110, 0.0012]];
    var day = Date.UTC(2020, 0, 2), p = 100, t = 0, out = [];
    regimes.forEach(function (rg) {
      for (var k = 0; k < rg[0]; k++, t++) {
        while (new Date(day).getUTCDay() === 0 || new Date(day).getUTCDay() === 6) day += 864e5;
        var ph = (t % 50) / 50, tri = ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph;
        p = p * (1 + rg[1] + 0.0065 * tri + 0.012 * norm());
        if (p < 1) p = 1;
        out.push([new Date(day).toISOString().slice(0, 10), Math.round(p * 100) / 100]);
        day += 864e5;
      }
    });
    return out;
  }
  function demoCSV() {
    return 'Date,Close\n' + demoSeries().map(function (r) { return r[0] + ',' + r[1].toFixed(2); }).join('\n') + '\n';
  }

  function parseCSV(text) {
    var rows = [], row = [], field = '', inQ = false, i = 0, c;
    text = String(text || '').replace(/^﻿/, '');
    while (i < text.length) {
      c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ',' || c === ';' || c === '\t') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0].trim() !== '') rows.push(row);
        row = [];
      } else field += c;
      i++;
    }
    row.push(field);
    if (row.length > 1 || row[0].trim() !== '') rows.push(row);
    return rows;
  }

  function parseDate(s) {
    s = String(s || '').trim();
    var m, y, mo, d;
    if ((m = /^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/.exec(s))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s))) { y = +m[3]; mo = +m[1]; d = +m[2]; }
    else return null;
    var t = Date.UTC(y, mo - 1, d);
    var dt = new Date(t);
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return t;
  }
  function isoDate(t) { return new Date(t).toISOString().slice(0, 10); }

  function inspectCSV(text) {
    var rows = parseCSV(text);
    if (rows.length < 2) return { error: 'Paste or upload a CSV with a header row and at least a few rows of prices.' };
    var header = rows[0].map(function (h) { return h.trim(); });
    var dateIdx = -1, cols = [];
    header.forEach(function (h, i) {
      var l = h.toLowerCase();
      if (dateIdx < 0 && /^(date|datetime|timestamp|time)\b/.test(l)) dateIdx = i;
      if (/close/.test(l)) cols.push({ idx: i, name: h });
    });
    if (dateIdx < 0) return { error: 'No Date column found. The first row must contain a header named Date.' };
    if (!cols.length) return { error: 'No Close or Adj Close column found in the header row.' };
    var pref = cols.filter(function (c) { return /adj/i.test(c.name); })[0] || cols.filter(function (c) { return /^close$/i.test(c.name); })[0] || cols[0];
    return { rows: rows, header: header, dateIdx: dateIdx, cols: cols, preferred: pref.idx };
  }

  function extractSeries(info, colIdx) {
    var map = {}, skipped = 0;
    for (var r = 1; r < info.rows.length; r++) {
      var row = info.rows[r];
      var t = parseDate(row[info.dateIdx]);
      var raw = String(row[colIdx] == null ? '' : row[colIdx]).replace(/[$,\s]/g, '');
      var v = raw === '' ? NaN : Number(raw);
      if (t == null || !isFinite(v) || v <= 0) { skipped++; continue; }
      map[t] = v; // later duplicate dates win
    }
    var keys = Object.keys(map).map(Number).sort(function (a, b) { return a - b; });
    return { series: keys.map(function (t) { return { t: t, d: isoDate(t), c: map[t] }; }), skipped: skipped };
  }

  // Weekly bars: last close of each week ending Friday (Saturday through Friday buckets).
  function toWeekly(series) {
    var out = [], key = null;
    series.forEach(function (b) {
      var dow = new Date(b.t).getUTCDay();
      var fri = b.t + ((5 - dow + 7) % 7) * 864e5;
      if (fri !== key) { out.push(b); key = fri; } else out[out.length - 1] = b;
    });
    return out;
  }

  // Wilder RSI: seed with simple averages of the first n changes, then recursive smoothing.
  function rsiWilder(closes, n) {
    var out = new Array(closes.length);
    for (var k = 0; k < closes.length; k++) out[k] = NaN;
    if (closes.length <= n) return out;
    var g = 0, l = 0, i, ch;
    function val(G, L) { return L === 0 ? (G === 0 ? 50 : 100) : 100 - 100 / (1 + G / L); }
    for (i = 1; i <= n; i++) { ch = closes[i] - closes[i - 1]; if (ch > 0) g += ch; else l -= ch; }
    g /= n; l /= n;
    out[n] = val(g, l);
    for (i = n + 1; i < closes.length; i++) {
      ch = closes[i] - closes[i - 1];
      g = (g * (n - 1) + (ch > 0 ? ch : 0)) / n;
      l = (l * (n - 1) + (ch < 0 ? -ch : 0)) / n;
      out[i] = val(g, l);
    }
    return out;
  }

  function backtest(series, n, lower, upper) {
    var closes = series.map(function (b) { return b.c; });
    var rsi = rsiWilder(closes, n);
    var trades = [], pos = null;
    for (var t = 1; t < series.length; t++) {
      var r = rsi[t], rp = rsi[t - 1];
      if (isNaN(r) || isNaN(rp)) continue;
      if (!pos) {
        if (r < lower && rp >= lower) pos = { i: t };
      } else if (r > upper && rp <= upper) {
        trades.push(mkTrade(pos.i, t, false));
        pos = null;
      }
    }
    if (pos) trades.push(mkTrade(pos.i, series.length - 1, true));
    function mkTrade(a, b, open) {
      return {
        entryDate: series[a].d, entryPrice: series[a].c, entryRsi: rsi[a],
        exitDate: series[b].d, exitPrice: series[b].c, exitRsi: rsi[b],
        ret: series[b].c / series[a].c - 1,
        days: Math.round((series[b].t - series[a].t) / 864e5),
        open: open
      };
    }
    var first = series[0], last = series[series.length - 1];
    var spanDays = Math.round((last.t - first.t) / 864e5);
    var wins = 0, sumRet = 0, sumDays = 0, comp = 1;
    trades.forEach(function (x) { if (x.ret > 0) wins++; sumRet += x.ret; sumDays += x.days; comp *= 1 + x.ret; });
    return {
      trades: trades,
      rsi: rsi,
      count: trades.length,
      winRate: trades.length ? wins / trades.length : NaN,
      avgRet: trades.length ? sumRet / trades.length : NaN,
      avgDays: trades.length ? sumDays / trades.length : NaN,
      stratRet: comp - 1,
      bhRet: last.c / first.c - 1,
      timeInMarket: spanDays > 0 ? sumDays / spanDays : NaN,
      spanYears: spanDays / 365.25,
      first: first.d, last: last.d, bars: series.length
    };
  }

  var BT = { info: null, source: 'demo', fileName: '' };

  function loadText(text, source, fileName) {
    $('bt-csv').value = text;
    BT.source = source;
    BT.fileName = fileName || '';
    refreshColumns();
    runBacktest();
  }

  function refreshColumns() {
    var info = inspectCSV($('bt-csv').value);
    BT.info = info.error ? null : info;
    var sel = $('bt-col');
    var prev = sel.value;
    if (info.error) { sel.innerHTML = '<option value="">n/a</option>'; return info; }
    sel.innerHTML = info.cols.map(function (c) { return '<option value="' + c.idx + '">' + esc(c.name) + '</option>'; }).join('');
    var keep = info.cols.some(function (c) { return String(c.idx) === prev; });
    sel.value = keep ? prev : String(info.preferred);
    return info;
  }

  function clearBacktest() {
    ['trades', 'win', 'avg', 'hold', 'strat', 'bh', 'tim', 'span'].forEach(function (k) {
      var el = $('bt-out-' + k); el.textContent = 'n/a'; el.classList.remove('pos', 'neg');
    });
    setText('bt-summary', '');
    $('bt-trades').innerHTML = '';
  }

  function runBacktest() {
    var errs = [];
    var period = readNum('bt-period', { label: 'RSI period', required: true, integer: true, min: 2, max: 250 });
    var lower = readNum('bt-lower', { label: 'Buy threshold', required: true, gt: 0, lt: 100 });
    var upper = readNum('bt-upper', { label: 'Sell threshold', required: true, gt: 0, lt: 100 });
    [period, lower, upper].forEach(function (f) { if (f.error) errs.push(f.error); });
    if (!errs.length && lower.value >= upper.value) {
      errs.push('Buy threshold must be below the sell threshold.');
      $('bt-lower').setAttribute('aria-invalid', 'true');
      $('bt-upper').setAttribute('aria-invalid', 'true');
    }
    var info = BT.info || refreshColumns();
    if (!BT.info) errs.push(info && info.error ? info.error : 'Could not read the CSV.');
    var ex = null, series = null, weekly = $('bt-tf').value === 'weekly';
    if (BT.info) {
      ex = extractSeries(BT.info, +$('bt-col').value);
      series = weekly ? toWeekly(ex.series) : ex.series;
      if (!errs.length && series.length < period.value + 2) {
        errs.push('Need at least ' + (period.value + 2) + ' ' + (weekly ? 'weekly' : 'daily') + ' closes for RSI(' + period.value + '); found ' + series.length + '.');
      }
    }
    var srcLabel = BT.source === 'demo' ? '<strong>Synthetic demo data</strong> (randomly generated, not a real stock)' :
      BT.source === 'file' ? 'File <strong>' + esc(BT.fileName) + '</strong>' : '<strong>Pasted data</strong>';
    if (ex && ex.series.length) {
      $('bt-status').innerHTML = srcLabel + ': ' + intf(ex.series.length) + ' daily closes, ' + ex.series[0].d + ' to ' + ex.series[ex.series.length - 1].d +
        (ex.skipped ? ' (' + intf(ex.skipped) + ' row' + (ex.skipped === 1 ? '' : 's') + ' skipped)' : '') + '.';
    } else {
      $('bt-status').innerHTML = srcLabel + ': no usable rows yet.';
    }
    showErrors('bt-errors', errs);
    if (errs.length) { clearBacktest(); return null; }

    var r = backtest(series, period.value, lower.value, upper.value);
    setText('bt-out-trades', intf(r.count));
    setText('bt-out-win', pct(r.winRate));
    setText('bt-out-avg', pct(r.avgRet)); signClass($('bt-out-avg'), r.avgRet);
    setText('bt-out-hold', fixed(r.avgDays, 2));
    setText('bt-out-strat', pct(r.stratRet)); signClass($('bt-out-strat'), r.stratRet);
    setText('bt-out-bh', pct(r.bhRet)); signClass($('bt-out-bh'), r.bhRet);
    setText('bt-out-tim', pct(r.timeInMarket));
    setText('bt-out-span', fixed(r.spanYears, 2));
    var tf = weekly ? 'weekly' : 'daily';
    var diff = r.stratRet - r.bhRet;
    setText('bt-summary', r.count ?
      intf(r.bars) + ' ' + tf + ' bars from ' + r.first + ' to ' + r.last + '. Strategy ' + (diff >= 0 ? 'beat' : 'trailed') + ' buy-and-hold by ' + fixed(Math.abs(diff) * 100, 2) + ' percentage points over the span.' :
      'No trades: ' + tf + ' RSI(' + period.value + ') never crossed below ' + lower.value + ' between ' + r.first + ' and ' + r.last + '.');

    var h = '<caption>Trades (' + tf + ', RSI ' + period.value + ', ' + lower.value + '/' + upper.value + ')</caption>' +
      '<thead><tr><th scope="col">#</th><th scope="col">Entry date</th><th scope="col">Entry price</th><th scope="col">Entry RSI</th>' +
      '<th scope="col">Exit date</th><th scope="col">Exit price</th><th scope="col">Exit RSI</th><th scope="col">Return</th><th scope="col">Days held</th></tr></thead><tbody>';
    if (!r.count) h += '<tr><td colspan="9">No trades in this period.</td></tr>';
    r.trades.forEach(function (x, i) {
      h += '<tr><th scope="row">' + (i + 1) + '</th><td>' + x.entryDate + '</td><td>' + usd(x.entryPrice) + '</td><td>' + fixed(x.entryRsi, 2) + '</td>' +
        '<td>' + x.exitDate + (x.open ? ' (open at end, marked at last close)' : '') + '</td><td>' + usd(x.exitPrice) + '</td><td>' + fixed(x.exitRsi, 2) + '</td>' +
        '<td class="' + (x.ret > 0 ? 'pos' : x.ret < 0 ? 'neg' : '') + '">' + pct(x.ret) + '</td><td>' + intf(x.days) + '</td></tr>';
    });
    $('bt-trades').innerHTML = h + '</tbody>';
    return r;
  }

  /* ───────────── Wiring ───────────── */
  function on(ids, evts, fn) {
    ids.forEach(function (id) {
      var el = $(id);
      if (el) evts.forEach(function (e) { el.addEventListener(e, fn); });
    });
  }

  function init() {
    // Put
    $('put-form').addEventListener('submit', function (e) { e.preventDefault(); });
    on(['put-price', 'put-strike', 'put-premium', 'put-days', 'put-contracts', 'put-yield', 'put-comm'], ['input', 'change'], updatePut);
    updatePut();

    // Dividend
    buildDivBasis();
    $('div-form').addEventListener('submit', function (e) { e.preventDefault(); });
    on(['div-price', 'div-amount', 'div-freq', 'div-basis'], ['input', 'change'], updateDiv);
    updateDiv();

    // RSI explorer
    buildRsiControls();
    function renderAll() { renderRsiMain(); renderRsiRegime(); }
    STRATS.forEach(function (s) { $('rsi-on-' + s.id).addEventListener('change', renderAll); });
    on(['rsi-metric'], ['change'], renderRsiMain);
    on(['rsi-sector-strat', 'rsi-sector-metric'], ['change'], renderRsiSector);
    on(['rsi-regime-metric'], ['change'], renderRsiRegime);
    renderAll();
    renderRsiSector();
    renderRsiPeriods();
    lastW = document.documentElement.clientWidth;

    // Backtester
    $('bt-form').addEventListener('submit', function (e) { e.preventDefault(); runBacktest(); });
    on(['bt-col', 'bt-tf'], ['change'], runBacktest);
    on(['bt-period', 'bt-lower', 'bt-upper'], ['input', 'change'], runBacktest);
    $('bt-run').addEventListener('click', function () { refreshColumns(); runBacktest(); });
    $('bt-demo').addEventListener('click', function () { $('bt-file').value = ''; loadText(demoCSV(), 'demo'); });
    var pasteTimer = null;
    $('bt-csv').addEventListener('input', function () {
      BT.source = 'paste';
      clearTimeout(pasteTimer);
      pasteTimer = setTimeout(function () { refreshColumns(); runBacktest(); }, 350);
    });
    $('bt-file').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (f.size > 20 * 1024 * 1024) { showErrors('bt-errors', ['That file is larger than 20 MB. Use a daily price history CSV.']); return; }
      var reader = new FileReader();
      reader.onload = function () { loadText(String(reader.result || ''), 'file', f.name); };
      reader.onerror = function () { showErrors('bt-errors', ['Could not read that file.']); };
      reader.readAsText(f);
    });
    loadText(demoCSV(), 'demo');
  }

  // Exposed for testing and for anyone curious in the console.
  window.LGTools = {
    calcPut: calcPut, calcDiv: calcDiv, rsiWilder: rsiWilder, backtest: backtest, toWeekly: toWeekly,
    parseCSV: parseCSV, inspectCSV: inspectCSV, extractSeries: extractSeries, demoSeries: demoSeries, demoCSV: demoCSV,
    data: { DIV: DIV, STRATS: STRATS, SECTORS: SECTORS, CRISES: CRISES, PERIODS: PERIODS }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
