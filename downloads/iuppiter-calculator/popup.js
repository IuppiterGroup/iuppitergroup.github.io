/**
 * Iuppiter Scientific Calculator — popup.js
 * Fully offline. No network requests. No analytics. No external dependencies.
 * Uses a custom shunting-yard expression parser — no eval(), no Function().
 */

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────
  let expr        = '';      // internal math expression string
  let display     = '0';     // large result display
  let angleMode   = 'DEG';   // 'DEG' | 'RAD'
  let memory      = 0;
  let secondMode  = false;
  let justEvaled  = false;
  let parenDepth  = 0;       // tracks unclosed parentheses

  // ── DOM ──────────────────────────────────────────────────────────────
  const resultEl     = document.getElementById('result');
  const expressionEl = document.getElementById('expression');
  const angleModeBtn = document.getElementById('angleModeBtn');
  const btnSecond    = document.getElementById('btnSecond');
  const btnSin       = document.getElementById('btnSin');
  const btnCos       = document.getElementById('btnCos');
  const btnTan       = document.getElementById('btnTan');
  const btnLn        = document.getElementById('btnLn');
  const btnLog       = document.getElementById('btnLog');

  // ── Math Helpers ─────────────────────────────────────────────────────
  function factorial(n) {
    n = Math.round(n);
    if (n < 0 || n > 170) throw new Error('Domain error');
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  function fmt(n) {
    if (typeof n !== 'number' || isNaN(n) || !isFinite(n)) return 'Error';
    // Avoid floating-point noise with toPrecision, then strip trailing zeros
    const s = parseFloat(n.toPrecision(10)).toString();
    return s;
  }

  // ── Expression Parser (Shunting-Yard Algorithm) ───────────────────────
  // Supports: +, -, *, /, ^ operators; sin, cos, tan, asin, acos, atan,
  //           ln, log, sqrt, exp (eˣ), p10 (10ˣ) functions; () parens.
  // No eval() or Function() — safe for Manifest V3 CSP.

  const OP_PREC    = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const OP_RIGHT   = { '^': true };

  function tokenize(s) {
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      if (/\d/.test(c) || c === '.') {
        let num = '';
        while (i < s.length && (/\d/.test(s[i]) || s[i] === '.')) num += s[i++];
        tokens.push({ t: 'n', v: parseFloat(num) });
        continue;
      }
      if (/[a-z]/.test(c)) {
        let name = '';
        while (i < s.length && /[a-z0-9]/.test(s[i])) name += s[i++];
        tokens.push({ t: 'f', v: name });
        continue;
      }
      if (c in OP_PREC) { tokens.push({ t: 'o', v: c }); i++; continue; }
      if (c === '(')    { tokens.push({ t: '(' });         i++; continue; }
      if (c === ')')    { tokens.push({ t: ')' });         i++; continue; }
      i++; // skip unknown characters
    }
    return tokens;
  }

  function applyFunc(name, a) {
    const toRad  = angleMode === 'DEG' ? Math.PI / 180 : 1;
    const fromRad = angleMode === 'DEG' ? 180 / Math.PI : 1;
    switch (name) {
      case 'sin':  return Math.sin(a * toRad);
      case 'cos':  return Math.cos(a * toRad);
      case 'tan':  return Math.tan(a * toRad);
      case 'asin': { const v = Math.asin(a); return isNaN(v) ? NaN : v * fromRad; }
      case 'acos': { const v = Math.acos(a); return isNaN(v) ? NaN : v * fromRad; }
      case 'atan': return Math.atan(a) * fromRad;
      case 'ln':   return a > 0 ? Math.log(a) : NaN;
      case 'log':  return a > 0 ? Math.log10(a) : NaN;
      case 'sqrt': return a >= 0 ? Math.sqrt(a) : NaN;
      case 'exp':  return Math.exp(a);
      case 'p10':  return Math.pow(10, a);
      default: throw new Error('Unknown function: ' + name);
    }
  }

  function applyOp(op, a, b) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b === 0 ? NaN : a / b;
      case '^': return Math.pow(a, b);
      default: throw new Error('Unknown operator: ' + op);
    }
  }

  function evaluate(s) {
    if (!s || s === '0') return 0;

    // Strip trailing operators before evaluating
    s = s.replace(/[+\-*\/^]+$/, '');
    if (!s) return 0;

    // Auto-close unclosed parentheses
    let depth = 0;
    for (const c of s) {
      if (c === '(') depth++;
      else if (c === ')') depth--;
    }
    if (depth > 0) s += ')'.repeat(depth);

    // Insert implicit multiply where needed:
    //   )( → )*(    )digit → )*digit    digit( → digit*(    digitFn → digit*Fn
    s = s.replace(/\)\(/g, ')*(');
    s = s.replace(/\)(\d)/g, ')*$1');
    s = s.replace(/(\d)\(/g, '$1*(');
    s = s.replace(/(\d)([a-z])/g, '$1*$2');

    const tokens = tokenize(s);
    const outQ   = [];   // output (value) queue
    const opStk  = [];   // operator/function stack

    function flushTop() {
      const top = opStk.pop();
      if (!top) throw new Error('Empty stack');
      if (top.t === 'f') {
        const a = outQ.pop();
        if (a === undefined) throw new Error('Missing operand for ' + top.v);
        const r = applyFunc(top.v, a);
        if (isNaN(r)) throw new Error('Domain error');
        outQ.push(r);
      } else {
        const b = outQ.pop();
        const a = outQ.pop();
        if (a === undefined || b === undefined) throw new Error('Missing operand');
        const r = applyOp(top.v, a, b);
        if (isNaN(r)) throw new Error('Math error');
        outQ.push(r);
      }
    }

    let prev = null;
    for (const tok of tokens) {
      if (tok.t === 'n') {
        outQ.push(tok.v);
      } else if (tok.t === 'f') {
        opStk.push(tok);
      } else if (tok.t === 'o') {
        // Detect unary minus: at start or after operator / left-paren
        if (tok.v === '-' && (!prev || prev.t === 'o' || prev.t === '(')) {
          outQ.push(0); // implicit 0 operand: "0 - x" = "-x"
          opStk.push(tok);
        } else {
          while (opStk.length > 0) {
            const top = opStk[opStk.length - 1];
            if (top.t === '(') break;
            if (top.t === 'f') { flushTop(); continue; }
            if (top.t === 'o') {
              const higher = OP_PREC[top.v] > OP_PREC[tok.v];
              const equal  = OP_PREC[top.v] === OP_PREC[tok.v] && !OP_RIGHT[tok.v];
              if (higher || equal) flushTop();
              else break;
            } else break;
          }
          opStk.push(tok);
        }
      } else if (tok.t === '(') {
        opStk.push(tok);
      } else if (tok.t === ')') {
        while (opStk.length > 0 && opStk[opStk.length - 1].t !== '(') {
          flushTop();
        }
        if (opStk.length === 0) throw new Error('Mismatched parentheses');
        opStk.pop(); // discard the '('
        // Apply function immediately if it sits just before the paren
        if (opStk.length > 0 && opStk[opStk.length - 1].t === 'f') {
          flushTop();
        }
      }
      prev = tok;
    }

    while (opStk.length > 0) {
      const top = opStk[opStk.length - 1];
      if (top.t === '(' || top.t === ')') throw new Error('Mismatched parentheses');
      flushTop();
    }

    if (outQ.length !== 1) throw new Error('Invalid expression');
    const result = outQ[0];
    if (!isFinite(result)) throw new Error('Overflow');
    return result;
  }

  // ── Pretty Display Expression ─────────────────────────────────────────
  // Converts internal expression string to a human-friendly display string.
  function prettyExpr(s) {
    return s
      .replace(/\*/g, '×')
      .replace(/\//g, '÷')
      .replace(/asin\(/g, 'sin⁻¹(')
      .replace(/acos\(/g, 'cos⁻¹(')
      .replace(/atan\(/g, 'tan⁻¹(')
      .replace(/sqrt\(/g, '√(')
      .replace(/exp\(/g,  'eˣ(')
      .replace(/p10\(/g,  '10ˣ(');
  }

  // ── Render ────────────────────────────────────────────────────────────
  function render() {
    resultEl.textContent = display;
    resultEl.classList.toggle('error', display === 'Error');
    expressionEl.textContent = prettyExpr(expr);

    // Adaptive font size for long numbers
    const len = display.replace(/[-.]/, '').length;
    if      (len >= 14) resultEl.style.fontSize = '1.0rem';
    else if (len >= 11) resultEl.style.fontSize = '1.3rem';
    else if (len >= 9)  resultEl.style.fontSize = '1.6rem';
    else if (len >= 7)  resultEl.style.fontSize = '2.0rem';
    else                resultEl.style.fontSize = '';

    // Angle mode button
    if (angleModeBtn) angleModeBtn.textContent = angleMode;

    // 2nd button active state
    if (btnSecond) btnSecond.classList.toggle('active', secondMode);
  }

  // ── Helpers ───────────────────────────────────────────────────────────
  // Returns the trailing numeric string from expr (digits + dot only, no sign).
  function trailingNum() {
    const m = expr.match(/([\d.]+)$/);
    return m ? m[0] : null;
  }

  // True if expr ends with a digit or decimal
  function endsWithDigit() { return /[\d.]$/.test(expr); }
  // True if expr ends with a closing paren
  function endsWithRP()    { return /\)$/.test(expr); }
  // True if expr ends with an operator
  function endsWithOp()    { return /[+\-*\/^]$/.test(expr); }

  // ── Actions ───────────────────────────────────────────────────────────
  const A = {

    digit(v) {
      if (display === 'Error') A.clear();
      if (justEvaled) {
        expr = v === '0' ? '0' : v;
        display = v;
        justEvaled = false;
        return;
      }
      if (!expr || expr === '0') {
        expr    = v === '0' ? '0' : v;
        display = v;
        return;
      }
      const last = expr.slice(-1);
      if (/[\d.]/.test(last)) {
        // Extending current number — enforce 12-digit cap
        const m = expr.match(/([\d.]+)$/);
        if (m && m[0].replace('.', '').length >= 12) return;
        expr += v;
        const m2 = expr.match(/([\d.]+)$/);
        display = m2 ? m2[0] : v;
      } else if (last === ')') {
        expr   += '*' + v;
        display = v;
      } else {
        expr   += v;
        display = v;
      }
    },

    decimal() {
      if (display === 'Error') A.clear();
      if (justEvaled) {
        expr = '0.'; display = '0.'; justEvaled = false; return;
      }
      if (!expr || endsWithOp() || expr.slice(-1) === '(') {
        expr += '0.'; display = '0.'; return;
      }
      const m = expr.match(/([\d.]+)$/);
      if (m && m[0].includes('.')) return; // already has decimal
      expr   += '.';
      display = (display === '0' ? '0' : display) + '.';
    },

    operator(sym) {
      if (display === 'Error') { A.clear(); return; }
      const map = { '÷': '/', '×': '*', '−': '-' };
      const op  = map[sym] || sym;
      if (justEvaled) {
        // Chain from last result
        expr       = display + op;
        justEvaled = false;
        display    = '0';
        return;
      }
      if (!expr || expr === '0') {
        expr = display + op;
      } else if (endsWithOp()) {
        expr = expr.slice(0, -1) + op; // replace trailing operator
      } else {
        expr += op;
      }
      display = '0';
    },

    equals() {
      if (!expr || expr === '0') return;
      if (display === 'Error') { A.clear(); return; }
      const evalStr = expr;
      try {
        const result    = evaluate(evalStr);
        const formatted = fmt(result);
        display    = formatted;
        expr       = formatted === 'Error' ? '' : formatted;
        justEvaled = true;
        parenDepth = 0;
        // Show the evaluated expression on the expression line, then render
        expressionEl.textContent = prettyExpr(evalStr) + ' =';
        resultEl.textContent = display;
        resultEl.classList.toggle('error', display === 'Error');
        const len = display.replace(/[-.]/, '').length;
        if      (len >= 14) resultEl.style.fontSize = '1.0rem';
        else if (len >= 11) resultEl.style.fontSize = '1.3rem';
        else if (len >= 9)  resultEl.style.fontSize = '1.6rem';
        else if (len >= 7)  resultEl.style.fontSize = '2.0rem';
        else                resultEl.style.fontSize = '';
      } catch (e) {
        display    = 'Error';
        expr       = '';
        justEvaled = true;
        parenDepth = 0;
        render();
      }
    },

    clear() {
      expr       = '';
      display    = '0';
      justEvaled = false;
      parenDepth = 0;
      // Reset 2nd mode labels
      if (secondMode) A.second();
    },

    sign() {
      if (display === '0' || display === 'Error') return;
      const m = expr.match(/([\d.]+)$/);
      if (!m) return;
      const num  = m[0];
      const pos  = expr.length - num.length;
      const prev = pos > 0 ? expr[pos - 1] : '';
      if (prev === '-') {
        // Remove the minus sign
        expr    = expr.slice(0, pos - 1) + num;
        display = num;
      } else if (!prev || /[+\-*\/^(]/.test(prev)) {
        // Prepend minus directly after operator / paren
        expr    = expr.slice(0, pos) + '-' + num;
        display = '-' + num;
      } else {
        // Wrap in parentheses: ...(-5)
        expr    = expr.slice(0, pos) + '(-' + num + ')';
        display = '-' + num;
      }
    },

    percent() {
      if (display === 'Error') return;
      const m = expr.match(/([\d.]+)$/);
      if (!m) return;
      const val       = parseFloat(m[0]) / 100;
      const formatted = fmt(val);
      expr    = expr.slice(0, expr.length - m[0].length) + formatted;
      display = formatted;
    },

    backspace() {
      if (justEvaled || display === 'Error') { A.clear(); return; }
      if (!expr || expr === '0') return;
      const last = expr.slice(-1);
      if (last === '(') parenDepth = Math.max(0, parenDepth - 1);
      if (last === ')') parenDepth++;
      expr = expr.slice(0, -1);
      if (!expr) { display = '0'; return; }
      const m = expr.match(/([\d.]+)$/);
      display = m ? m[0] : (expr.slice(-1) || '0');
    },

    // ── Scientific function prefix (opens paren) ──────────────────────
    sciPrefix(fnName) {
      if (display === 'Error') A.clear();
      if (justEvaled) {
        expr       = fnName + '(';
        parenDepth = 1;
        display    = '0';
        justEvaled = false;
        return;
      }
      if (!expr || expr === '0') {
        expr       = fnName + '(';
        parenDepth = 1;
        display    = '0';
        return;
      }
      if (endsWithDigit() || endsWithRP()) {
        expr += '*' + fnName + '(';
      } else {
        expr += fnName + '(';
      }
      parenDepth++;
      display = '0';
    },

    sin()   { A.sciPrefix(secondMode ? 'asin' : 'sin'); },
    cos()   { A.sciPrefix(secondMode ? 'acos' : 'cos'); },
    tan()   { A.sciPrefix(secondMode ? 'atan' : 'tan'); },
    ln()    { A.sciPrefix(secondMode ? 'exp'  : 'ln');  },
    log()   { A.sciPrefix(secondMode ? 'p10'  : 'log'); },
    sqrt()  { A.sciPrefix('sqrt'); },

    lparen() {
      if (display === 'Error') A.clear();
      if (justEvaled) {
        expr = '('; parenDepth = 1; display = '0'; justEvaled = false; return;
      }
      if (!expr || expr === '0') {
        expr = '('; parenDepth = 1; display = '0'; return;
      }
      if (endsWithDigit() || endsWithRP()) expr += '*(';
      else expr += '(';
      parenDepth++;
      display = '0';
    },

    rparen() {
      if (parenDepth <= 0) return;
      expr += ')';
      parenDepth--;
      const m = expr.match(/([\d.]+)$/);
      if (m) display = m[0];
    },

    // ── x² — immediate computation on trailing number ─────────────────
    square() {
      if (display === 'Error') return;
      if (justEvaled) {
        try {
          const n   = parseFloat(display);
          const r   = fmt(n * n);
          expr      = r;
          display   = r;
          // justEvaled stays true — treat squared result as a result
        } catch (e) { display = 'Error'; expr = ''; }
        return;
      }
      const m = expr.match(/([\d.]+)$/);
      if (!m) { expr += '^2'; return; }
      const n   = parseFloat(m[0]);
      const r   = fmt(n * n);
      expr      = expr.slice(0, expr.length - m[0].length) + r;
      display   = r;
    },

    // ── xʸ — binary power operator ────────────────────────────────────
    power() {
      if (display === 'Error') { A.clear(); return; }
      if (justEvaled) { justEvaled = false; }
      if (endsWithOp()) expr = expr.slice(0, -1) + '^';
      else              expr += '^';
      display = '0';
    },

    // ── n! — immediate factorial on trailing number ────────────────────
    fact() {
      if (display === 'Error') return;
      if (justEvaled) {
        try {
          const n = parseFloat(display);
          const r = fmt(factorial(n));
          expr    = r; display = r;
        } catch (e) { display = 'Error'; expr = ''; }
        return;
      }
      const m = expr.match(/([\d.]+)$/);
      if (!m) return;
      try {
        const n   = parseFloat(m[0]);
        const r   = fmt(factorial(n));
        expr      = expr.slice(0, expr.length - m[0].length) + r;
        display   = r;
      } catch (e) {
        display = 'Error'; expr = '';
      }
    },

    // ── Constants ──────────────────────────────────────────────────────
    pi() {
      const val = fmt(Math.PI);
      if (justEvaled || !expr || expr === '0') {
        expr = val; justEvaled = false;
      } else if (endsWithDigit() || endsWithRP()) {
        expr += '*' + val;
      } else {
        expr += val;
      }
      display = val;
    },

    eul() {
      const val = fmt(Math.E);
      if (justEvaled || !expr || expr === '0') {
        expr = val; justEvaled = false;
      } else if (endsWithDigit() || endsWithRP()) {
        expr += '*' + val;
      } else {
        expr += val;
      }
      display = val;
    },

    // ── Memory ─────────────────────────────────────────────────────────
    memclear()  { memory = 0; },

    memrecall() {
      const val = fmt(memory);
      if (justEvaled || !expr || expr === '0') {
        expr = val; justEvaled = false;
      } else if (endsWithDigit() || endsWithRP()) {
        expr += '*' + val;
      } else {
        expr += val;
      }
      display = val;
    },

    memadd() {
      try {
        const v = evaluate(expr || display);
        memory += v;
      } catch (e) { /* ignore */ }
    },

    memsub() {
      try {
        const v = evaluate(expr || display);
        memory -= v;
      } catch (e) { /* ignore */ }
    },

    // ── 2nd mode toggle ────────────────────────────────────────────────
    second() {
      secondMode = !secondMode;
      if (btnSin)  btnSin.textContent  = secondMode ? 'sin⁻¹' : 'sin';
      if (btnCos)  btnCos.textContent  = secondMode ? 'cos⁻¹' : 'cos';
      if (btnTan)  btnTan.textContent  = secondMode ? 'tan⁻¹' : 'tan';
      if (btnLn)   btnLn.textContent   = secondMode ? 'eˣ'    : 'ln';
      if (btnLog)  btnLog.textContent  = secondMode ? '10ˣ'   : 'log';
    },

    // ── Angle mode toggle ─────────────────────────────────────────────
    anglemode() {
      angleMode = angleMode === 'DEG' ? 'RAD' : 'DEG';
      if (angleModeBtn) angleModeBtn.textContent = angleMode;
    },
  };

  // ── Event Delegation ─────────────────────────────────────────────────
  document.querySelector('.calc-wrapper').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const value  = btn.dataset.value;
    if (!A[action]) return;
    // Actions with a value argument (digit, operator)
    if (value !== undefined) A[action](value);
    else A[action]();
    render();
  });

  // ── Keyboard Support ─────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    const k = e.key;
    if (k >= '0' && k <= '9')          { A.digit(k);              render(); return; }
    if (k === '.')                      { A.decimal();             render(); return; }
    if (k === '+')                      { A.operator('+');         render(); return; }
    if (k === '-')                      { A.operator('−');         render(); return; }
    if (k === '*')                      { A.operator('×');         render(); return; }
    if (k === '/')                      { e.preventDefault(); A.operator('÷'); render(); return; }
    if (k === '^')                      { A.power();               render(); return; }
    if (k === '(')                      { A.lparen();              render(); return; }
    if (k === ')')                      { A.rparen();              render(); return; }
    if (k === 'Enter' || k === '=')     { A.equals();                        return; }
    if (k === 'Backspace')              { A.backspace();           render(); return; }
    if (k === 'Escape')                 { A.clear();               render(); return; }
    if (k === '%')                      { A.percent();             render(); return; }
    if (k === 'p' || k === 'P')         { A.pi();                  render(); return; }
  });

  // ── Init ─────────────────────────────────────────────────────────────
  render();

})();
