/**
 * Iuppiter Calculator — popup.js
 * Fully offline. No network requests. No analytics. No external dependencies.
 */

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────
  const state = {
    current:      '0',   // what's shown in the main display
    previous:     '',    // first operand (string)
    operator:     null,  // pending operator symbol
    justEvaled:   false, // true right after pressing =
    hasDecimal:   false, // whether current entry has a decimal point
  };

  // ── DOM ──────────────────────────────────────────────────────────────
  const resultEl    = document.getElementById('result');
  const expressionEl = document.getElementById('expression');

  // ── Render ───────────────────────────────────────────────────────────
  function render() {
    resultEl.textContent = state.current;
    resultEl.classList.toggle('error', state.current === 'Error');
    if (state.operator && state.previous !== '') {
      expressionEl.textContent = state.previous + ' ' + state.operator;
    } else {
      expressionEl.textContent = '';
    }
    // Highlight active operator button
    document.querySelectorAll('.btn-op').forEach(btn => {
      btn.classList.toggle(
        'active',
        btn.dataset.value === state.operator && state.previous !== '' && !state.justEvaled
      );
    });
    // Shrink font for long numbers
    const len = state.current.replace('-', '').replace('.', '').length;
    if (len >= 12) {
      resultEl.style.fontSize = '1.2rem';
    } else if (len >= 9) {
      resultEl.style.fontSize = '1.6rem';
    } else if (len >= 7) {
      resultEl.style.fontSize = '2rem';
    } else {
      resultEl.style.fontSize = '';
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  function formatNumber(n) {
    if (!isFinite(n)) return 'Error';
    // Up to 10 significant digits, strip trailing zeros
    let str = parseFloat(n.toPrecision(10)).toString();
    // Avoid scientific notation for reasonable ranges
    if (Math.abs(n) < 1e10 && Math.abs(n) >= 1e-7) {
      str = parseFloat(n.toPrecision(10)).toString();
    }
    return str;
  }

  function compute(a, op, b) {
    const x = parseFloat(a);
    const y = parseFloat(b);
    if (!isFinite(x) || !isFinite(y)) return 'Error';
    switch (op) {
      case '+': return formatNumber(x + y);
      case '−': return formatNumber(x - y);
      case '×': return formatNumber(x * y);
      case '÷':
        if (y === 0) return 'Error';
        return formatNumber(x / y);
      default:  return b;
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────
  const actions = {
    digit(value) {
      if (state.current === 'Error') { actions.clear(); }
      if (state.justEvaled) {
        state.current = value;
        state.justEvaled = false;
        state.hasDecimal = false;
      } else if (state.current === '0') {
        state.current = value;
      } else {
        if (state.current.replace('-', '').replace('.', '').length >= 12) return;
        state.current += value;
      }
    },

    decimal() {
      if (state.current === 'Error') { actions.clear(); }
      if (state.justEvaled) {
        state.current = '0.';
        state.justEvaled = false;
        state.hasDecimal = true;
        return;
      }
      if (!state.current.includes('.')) {
        state.current += '.';
      }
    },

    operator(value) {
      if (state.current === 'Error') { actions.clear(); return; }
      if (state.previous !== '' && !state.justEvaled && state.current !== state.previous) {
        // Chain: compute first, then set new operator
        const result = compute(state.previous, state.operator, state.current);
        state.previous = result;
        state.current = result;
      } else {
        state.previous = state.current;
      }
      state.operator = value;
      state.justEvaled = false;
    },

    equals() {
      if (!state.operator || state.previous === '') return;
      if (state.current === 'Error') { actions.clear(); return; }
      const result = compute(state.previous, state.operator, state.current);
      state.current = result;
      state.previous = '';
      state.operator = null;
      state.justEvaled = true;
      state.hasDecimal = result.includes('.');
    },

    clear() {
      state.current    = '0';
      state.previous   = '';
      state.operator   = null;
      state.justEvaled = false;
      state.hasDecimal = false;
    },

    sign() {
      if (state.current === '0' || state.current === 'Error') return;
      if (state.current.startsWith('-')) {
        state.current = state.current.slice(1);
      } else {
        state.current = '-' + state.current;
      }
    },

    percent() {
      if (state.current === 'Error') return;
      const val = parseFloat(state.current) / 100;
      state.current = formatNumber(val);
      state.hasDecimal = state.current.includes('.');
    },

    backspace() {
      if (state.justEvaled || state.current === 'Error') {
        actions.clear();
        return;
      }
      if (state.current.length === 1 || (state.current.length === 2 && state.current.startsWith('-'))) {
        state.current = '0';
      } else {
        state.current = state.current.slice(0, -1);
      }
      state.hasDecimal = state.current.includes('.');
    },
  };

  // ── Event Delegation ─────────────────────────────────────────────────
  document.querySelector('.calc-buttons').addEventListener('click', function (e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const action = btn.dataset.action;
    const value  = btn.dataset.value;
    if (!action || !actions[action]) return;
    actions[action](value);
    render();
  });

  // ── Keyboard Support ─────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    const k = e.key;
    if (k >= '0' && k <= '9')       { actions.digit(k);       render(); return; }
    if (k === '.')                   { actions.decimal();       render(); return; }
    if (k === '+')                   { actions.operator('+');   render(); return; }
    if (k === '-')                   { actions.operator('−');   render(); return; }
    if (k === '*')                   { actions.operator('×');   render(); return; }
    if (k === '/')                   { e.preventDefault(); actions.operator('÷'); render(); return; }
    if (k === 'Enter' || k === '=')  { actions.equals();        render(); return; }
    if (k === 'Backspace')           { actions.backspace();     render(); return; }
    if (k === 'Escape')              { actions.clear();         render(); return; }
    if (k === '%')                   { actions.percent();       render(); return; }
  });

  // ── Init ─────────────────────────────────────────────────────────────
  render();

})();
