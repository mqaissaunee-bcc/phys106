/* mathtools.js — portable math support for course sites.
   1. A TI-30XS-style scientific calculator panel on every page (no eval; CSP-safe).
   2. Just-in-time scientific-notation refreshers: inserted at the first large number and the first
      small number in each module's readings, and opened from "Scientific notation" skill links.
   3. Numbers in words next to scientific notation in readings ("1.5 × 10⁸ km (150 million km)").
   4. A math readiness check (.readiness[data-source]) with links to review sections.
   Storage prefix comes from <html data-store-prefix="...">, default "phys106-". */
(function () {
  'use strict';
  var PREFIX = document.documentElement.getAttribute('data-store-prefix') || 'phys106-';
  var CALC_KEY = PREFIX + 'calc-v1', READY_KEY = PREFIX + 'readiness-v1';
  var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  var UNSUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function root() { var l = document.querySelector('link[href*="assets/css/site.css"]'); return l ? l.getAttribute('href').split('assets/css/site.css')[0] : ''; }
  function sup(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }

  /* ================= number formatting ================= */
  function commas(s) { var p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return p.join('.'); }
  function trim(s) { return s.indexOf('.') >= 0 ? s.replace(/0+$/, '').replace(/\.$/, '') : s; }
  function sciParts(x, sig) { var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e); m = Number(m.toPrecision(sig)); if (Math.abs(m) >= 10) { m /= 10; e += 1; } return [m, e]; }
  function fmtSci(x, sig) { if (x === 0) return '0'; var p = sciParts(x, sig || 4); return trim(String(p[0])) + ' × 10' + sup(p[1]); }
  function fmtNorm(x) {
    if (x === 0) return '0';
    var a = Math.abs(x);
    if (a >= 1e10 || a < 1e-4) return fmtSci(x, 6);
    return commas(trim(Number(x.toPrecision(10)).toFixed(Math.max(0, 9 - Math.floor(Math.log10(a))))));
  }
  var BIG = [[1e18, 'quintillion'], [1e15, 'quadrillion'], [1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
  var SMALL = [[1e-3, 'thousandths'], [1e-6, 'millionths'], [1e-9, 'billionths'], [1e-12, 'trillionths']];
  function words(x) {
    var a = Math.abs(x), sign = x < 0 ? 'negative ' : '';
    if (!isFinite(x) || a === 0) return '';
    if (a >= 1e21) return 'a number with ' + (Math.floor(Math.log10(a)) + 1) + ' digits';
    for (var i = 0; i < BIG.length; i++) if (a >= BIG[i][0]) { var v = Number((a / BIG[i][0]).toPrecision(3)); return (v === Number((a / BIG[i][0]).toPrecision(8)) ? '' : 'about ') + sign + commas(trim(String(v))) + ' ' + BIG[i][1]; }
    if (a >= 1e-2) return '';
    for (var k = 0; k < SMALL.length; k++) { var u = a / SMALL[k][0]; if (u >= 1 && u < 1000) return 'about ' + sign + commas(trim(String(Number(u.toPrecision(3))))) + ' ' + SMALL[k][1]; }
    return '';
  }

  /* ================= expression parser (no eval) ================= */
  function tokenize(src) {
    var s = src.replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/\s+/g, '').replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/x10\^/gi, '×10^').replace(/pi/gi, 'π').replace(/sqrt/gi, '√');
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]{2,}|[⁰¹⁴⁵⁶⁷⁸⁹⁻]/g, function (m) { return '^(' + m.split('').map(function (c) { return UNSUP[c]; }).join('').replace(/-/g, '−') + ')'; });
    var t = [], i = 0, m;
    while (i < s.length) {
      var r = s.slice(i);
      if ((m = /^(\d+\.?\d*|\.\d+)([eE][+−]?\d+)?/.exec(r))) { t.push({ t: 'n', v: parseFloat(m[1] + (m[2] ? m[2].replace('−', '-') : '')) }); i += m[0].length; continue; }
      if (/^ans/i.test(r)) { t.push({ t: 'ans' }); i += 3; continue; }
      var c = s[i];
      if ('+−×÷^()√π²³'.indexOf(c) >= 0) { t.push({ t: c }); i++; continue; }
      throw new Error('syntax');
    }
    return t;
  }
  function evaluate(src, ans) {
    var t = tokenize(src), p = 0;
    function peek() { return t[p] && t[p].t; }
    function eat(x) { if (peek() !== x) throw new Error('syntax'); p++; }
    function expr() { var v = term(); while (peek() === '+' || peek() === '−') { var o = t[p++].t, w = term(); v = o === '+' ? v + w : v - w; } return v; }
    function startsFactor(k) { return k === 'n' || k === 'ans' || k === 'π' || k === '(' || k === '√'; }
    function term() {
      var v = unary();
      for (;;) {
        var k = peek();
        if (k === '×' || k === '÷') { p++; var w = unary(); if (k === '÷' && w === 0) throw new Error('math'); v = k === '×' ? v * w : v / w; }
        else if (startsFactor(k)) { v = v * power(); }
        else return v;
      }
    }
    function unary() { if (peek() === '−') { p++; return -unary(); } if (peek() === '+') { p++; return unary(); } return power(); }
    function power() { var b = postfix(); if (peek() === '^') { p++; var e = unary(); var r = Math.pow(b, e); if (!isFinite(r)) throw new Error('math'); return r; } return b; }
    function postfix() { var v = primary(); while (peek() === '²' || peek() === '³') { v = Math.pow(v, t[p++].t === '²' ? 2 : 3); } return v; }
    function primary() {
      var k = peek();
      if (k === 'n') return t[p++].v;
      if (k === 'ans') { p++; if (ans === null || ans === undefined) throw new Error('syntax'); return ans; }
      if (k === 'π') { p++; return Math.PI; }
      if (k === '(') { p++; var v = expr(); if (peek() === ')') p++; return v; }
      if (k === '√') { p++; var a = peek() === '(' ? primary() : postfix(); if (a < 0) throw new Error('math'); return Math.sqrt(a); }
      throw new Error('syntax');
    }
    if (!t.length) throw new Error('syntax');
    var v = expr(); if (p !== t.length) throw new Error('syntax'); if (!isFinite(v)) throw new Error('math');
    return v;
  }
  window.MathTools = { evaluate: evaluate, fmtSci: fmtSci, fmtNorm: fmtNorm, words: words };

  /* ================= refresher content ================= */
  var LARGE = '<p><strong>Big numbers, written short.</strong> Scientific notation writes a number as a value from 1 to 10 times a power of ten. The power tells you how many places to move the decimal point to the right.</p>' +
    '<div class="table-wrap"><table class="mt-table"><caption>Powers of ten you will see most</caption><thead><tr><th scope="col">Power</th><th scope="col">Written out</th><th scope="col">In words</th></tr></thead><tbody>' +
    '<tr><td>10³</td><td class="num">1,000</td><td>thousand</td></tr><tr><td>10⁶</td><td class="num">1,000,000</td><td>million</td></tr><tr><td>10⁹</td><td class="num">1,000,000,000</td><td>billion</td></tr><tr><td>10¹²</td><td class="num">1,000,000,000,000</td><td>trillion</td></tr></tbody></table></div>' +
    '<p><strong>Read it:</strong> 1.5 × 10⁸ km means 1.5 followed by moving the decimal 8 places: 150,000,000 km, or 150 million km.</p>' +
    '<p><strong>Write it:</strong> 4,600,000,000 years: put the decimal after the first digit (4.6) and count the places you moved it (9): 4.6 × 10⁹ years.</p>' +
    '<p><strong>Multiply:</strong> multiply the front numbers and add the powers: (2 × 10³) × (3 × 10⁵) = 6 × 10⁸. <strong>Divide:</strong> divide the front numbers and subtract the powers: (8 × 10⁹) ÷ (2 × 10³) = 4 × 10⁶.</p>' +
    '<p><strong>On a TI-30XS:</strong> enter 1.5 × 10⁸ as <span class="tk-keys">1.5</span> <span class="tk-keys">×10ⁿ</span> <span class="tk-keys">8</span>. The calculator on this page (Calc button at the top) has the same key.</p>' +
    '<details class="mt-try"><summary>Try it: write 26,000 light-years in scientific notation</summary><p>2.6 × 10⁴ light-years (move the decimal 4 places).</p></details>';
  var SMALLNUM = '<p><strong>Small numbers, written short.</strong> A negative power of ten moves the decimal point to the <em>left</em>. It means "divide by ten that many times."</p>' +
    '<div class="table-wrap"><table class="mt-table"><caption>Negative powers of ten</caption><thead><tr><th scope="col">Power</th><th scope="col">Written out</th><th scope="col">In words</th></tr></thead><tbody>' +
    '<tr><td>10⁻³</td><td class="num">0.001</td><td>one thousandth (milli-)</td></tr><tr><td>10⁻⁶</td><td class="num">0.000001</td><td>one millionth (micro-)</td></tr><tr><td>10⁻⁹</td><td class="num">0.000000001</td><td>one billionth (nano-)</td></tr></tbody></table></div>' +
    '<p><strong>Read it:</strong> 5 × 10⁻⁷ m means move the decimal 7 places left: 0.0000005 m, which is 500 nanometers, the wavelength of green light.</p>' +
    '<p><strong>The rules are the same:</strong> (4 × 10⁻³) × (2 × 10⁵) = 8 × 10². Adding a negative power works like subtracting.</p>' +
    '<p><strong>On a TI-30XS:</strong> enter 5 × 10⁻⁷ as <span class="tk-keys">5</span> <span class="tk-keys">×10ⁿ</span> <span class="tk-keys">(−)</span> <span class="tk-keys">7</span>. Use the <span class="tk-keys">(−)</span> key, not the subtraction key.</p>' +
    '<details class="mt-try"><summary>Try it: write 0.00042 in scientific notation</summary><p>4.2 × 10⁻⁴ (move the decimal 4 places right to get 4.2).</p></details>';
  function refresher(kind) {
    var d = mk('details', 'refresher'); d.setAttribute('data-refresher', kind);
    var s = mk('summary', null, kind === 'small' ? 'Quick refresher: very small numbers in scientific notation' : 'Quick refresher: scientific notation for very large numbers');
    var body = mk('div', 'refresher-body'); body.innerHTML = kind === 'small' ? SMALLNUM : LARGE;
    var more = mk('p', 'refresher-more'); var a = mk('a', null, 'More practice in the Math toolkit'); a.href = root() + 'math-toolkit.html#sci'; more.appendChild(a); body.appendChild(more);
    d.appendChild(s); d.appendChild(body); return d;
  }
  var POS = /× 10[¹²³⁴⁵⁶⁷⁸⁹][⁰¹²³⁴⁵⁶⁷⁸⁹]*/, NEG = /× 10⁻[⁰¹²³⁴⁵⁶⁷⁸⁹]+/;
  function placeRefreshers() {
    if (!document.querySelector('.reading-section')) return;
    if (document.querySelector('.reading-section [data-term="scientific-notation"]')) return; // this module teaches it directly
    var done = { large: false, small: false };
    var els = document.querySelectorAll('.reading-section > p, .reading-section > ul, .reading-section > ol, .reading-section .activity');
    Array.prototype.forEach.call(els, function (el) {
      if (done.large && done.small) return;
      var txt = el.textContent, isAct = el.classList.contains('activity');
      if (isAct) Array.prototype.forEach.call(el.querySelectorAll('[data-source]'), function (d) { var j = document.getElementById(d.getAttribute('data-source')); if (j) txt += ' ' + j.textContent; });
      var needL = !done.large && POS.test(txt), needS = !done.small && NEG.test(txt);
      if (needS) { el.insertAdjacentElement(isAct ? 'beforebegin' : 'afterend', refresher('small')); done.small = true; }
      if (needL) { el.insertAdjacentElement(isAct ? 'beforebegin' : 'afterend', refresher('large')); done.large = true; }
    });
  }
  function sciDialog() {
    var dlg = document.getElementById('mt-sci-dialog');
    if (!dlg) {
      dlg = mk('dialog', 'mt-dialog'); dlg.id = 'mt-sci-dialog'; dlg.setAttribute('aria-labelledby', 'mt-sci-dialog-h');
      var h = mk('h2', null, 'Scientific notation refresher'); h.id = 'mt-sci-dialog-h';
      var close = mk('button', 'mt-close', 'Close'); close.type = 'button'; close.addEventListener('click', function () { dlg.close(); });
      var head = mk('div', 'mt-dialog-head'); head.appendChild(h); head.appendChild(close);
      var b = mk('div', 'refresher-body'); b.innerHTML = LARGE + SMALLNUM;
      var more = mk('p', 'refresher-more'); var a = mk('a', null, 'More practice in the Math toolkit'); a.href = root() + 'math-toolkit.html#sci'; more.appendChild(a); b.appendChild(more);
      dlg.appendChild(head); dlg.appendChild(b); document.body.appendChild(dlg);
    }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.skill-chip');
    if (a && /#sci$/.test(a.getAttribute('href') || '') && document.querySelector('.reading-section')) { e.preventDefault(); sciDialog(); }
  });

  /* ================= numbers in words, next to scientific notation in readings ================= */
  var UNITS = 'km|m|kg|g|K|W|J|s|years|year|light-years|km/s|m/s|AU|tons|tonnes|stars|galaxies|atoms|photons|neutrinos|solar masses|kilometers|meters';
  var NUMRE = new RegExp('(\\d+(?:\\.\\d+)?) × 10([⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+)(\\s(?:' + UNITS + ')(?![²³/\\w]))?', 'g');
  function numberWords() {
    var scope = document.querySelectorAll('.reading-section p, .reading-section li, .reading-section .callout p');
    Array.prototype.forEach.call(scope, function (el) {
      if (el.closest('.refresher, .worked, .eq, code, .activity, .sim')) return;
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), nodes = [], n;
      while ((n = walker.nextNode())) nodes.push(n);
      nodes.forEach(function (node) {
        var s = node.nodeValue, out = [], last = 0, m, changed = false;
        NUMRE.lastIndex = 0;
        while ((m = NUMRE.exec(s))) {
          var exp = parseInt(m[2].split('').map(function (c) { return UNSUP[c]; }).join(''), 10), val = parseFloat(m[1]) * Math.pow(10, exp);
          var after = s.slice(NUMRE.lastIndex, NUMRE.lastIndex + 30);
          if (/^\s*\(|million|billion|trillion|thousand/.test(after)) continue;
          var w = '';
          if (exp >= 3 && exp <= 20) w = words(val);
          else if (exp < 0 && exp >= -6) w = commas(trim(val.toFixed(-exp + 3)));
          if (!w) continue;
          out.push(document.createTextNode(s.slice(last, NUMRE.lastIndex)));
          out.push(mk('span', 'num-words', ' (' + w + (m[3] || '') + ')'));
          last = NUMRE.lastIndex; changed = true;
        }
        if (!changed) return;
        out.push(document.createTextNode(s.slice(last)));
        var frag = document.createDocumentFragment(); out.forEach(function (x) { frag.appendChild(x); });
        node.parentNode.replaceChild(frag, node);
      });
    });
  }

  /* ================= calculator panel ================= */
  function buildCalc() {
    var tools = document.querySelector('.topbar .tools'); if (!tools) return;
    var st = load(CALC_KEY, { mode: 'norm', hist: [] }), ans = st.hist.length ? st.hist[st.hist.length - 1].v : null;
    var btn = mk('button', 'calc-toggle', 'Calc'); btn.type = 'button'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'calc-panel'); btn.setAttribute('aria-label', 'Scientific calculator');
    tools.insertBefore(btn, tools.firstChild);
    var panel = mk('aside', 'calc-panel'); panel.id = 'calc-panel'; panel.setAttribute('aria-labelledby', 'calc-h'); panel.hidden = true;
    var head = mk('div', 'calc-head'); var h = mk('h2', null, 'Calculator'); h.id = 'calc-h';
    var modeB = mk('button', 'calc-mode'); modeB.type = 'button';
    var closeB = mk('button', 'calc-close', 'Close'); closeB.type = 'button';
    head.appendChild(h); head.appendChild(modeB); head.appendChild(closeB);
    var lab = mk('label', 'sr-only', 'Expression'); lab.setAttribute('for', 'calc-expr');
    var input = mk('input', 'calc-expr'); input.id = 'calc-expr'; input.type = 'text'; input.autocomplete = 'off'; input.spellcheck = false; input.setAttribute('inputmode', 'decimal'); input.placeholder = 'e.g. 3×10^8 ÷ 1.5';
    var out = mk('output', 'calc-out', '0'); out.setAttribute('for', 'calc-expr'); out.setAttribute('aria-live', 'polite');
    var wordsEl = mk('p', 'calc-words');
    var pad = mk('div', 'calc-pad');
    var KEYS = [
      ['clear', 'Clear', 'clear'], ['del', 'Delete', 'delete'], ['(', '(', 'open parenthesis'], [')', ')', 'close parenthesis'], ['^', '^', 'power (the ^ key)'],
      ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '÷', 'divide'], ['²', 'x²', 'square'],
      ['4', '4'], ['5', '5'], ['6', '6'], ['×', '×', 'multiply'], ['√(', '√', 'square root (2nd then x² on the TI-30XS)'],
      ['1', '1'], ['2', '2'], ['3', '3'], ['−', '−', 'subtract'], ['×10^', '×10ⁿ', 'times ten to the power (the ×10ⁿ key)'],
      ['0', '0'], ['.', '.', 'decimal point'], ['−', '(−)', 'negative (the (−) key)'], ['+', '+', 'add'], ['π', 'π', 'pi'],
      ['ans', 'ans', 'previous answer (2nd then (−) on the TI-30XS)'], ['=', 'enter', 'calculate']];
    KEYS.forEach(function (k) {
      var b = mk('button', 'calc-key', k[1]); b.type = 'button';
      if (k[2]) { b.setAttribute('aria-label', k[2]); b.title = k[2]; }
      if (k[0] === '=') b.classList.add('calc-enter');
      if (k[0] === 'clear' || k[0] === 'del') b.classList.add('calc-fn');
      b.addEventListener('click', function () { press(k[0]); });
      pad.appendChild(b);
    });
    var histH = mk('h3', 'calc-hist-h', 'History'); var hist = mk('ol', 'calc-hist');
    var acts = mk('div', 'calc-acts');
    var toNotes = mk('button', 'calc-tonotes', 'Add history to notes'); toNotes.type = 'button';
    var clearH = mk('button', 'calc-clearh', 'Clear history'); clearH.type = 'button';
    acts.appendChild(toNotes); acts.appendChild(clearH);
    var help = mk('p', 'calc-help'); help.innerHTML = 'Keys match the TI-30XS. Type e8 or ×10^8 for × 10⁸. <a href="' + root() + 'math-toolkit.html#sci">Scientific notation help</a>';
    [head, lab, input, out, wordsEl, pad, histH, hist, acts, help].forEach(function (x) { panel.appendChild(x); });
    document.body.appendChild(panel);

    function show(v) { out.textContent = st.mode === 'sci' ? fmtSci(v, 6) : fmtNorm(v); var w = words(v); wordsEl.textContent = w ? 'In words: ' + w : ''; }
    function renderMode() { modeB.textContent = st.mode === 'sci' ? 'Display: SCI' : 'Display: normal'; modeB.setAttribute('aria-label', 'Display mode ' + (st.mode === 'sci' ? 'scientific' : 'normal') + '. Switch mode.'); }
    function renderHist() {
      hist.innerHTML = '';
      st.hist.slice(-8).reverse().forEach(function (h) {
        var li = mk('li'); var e = mk('span', 'calc-h-expr', h.e + ' ='); var r = mk('button', 'calc-h-val', st.mode === 'sci' ? fmtSci(h.v, 6) : fmtNorm(h.v)); r.type = 'button'; r.setAttribute('aria-label', 'Insert ' + r.textContent);
        r.addEventListener('click', function () { insert(String(Number(h.v.toPrecision(12)))); });
        li.appendChild(e); li.appendChild(r); hist.appendChild(li);
      });
      histH.hidden = hist.hidden = acts.hidden = !st.hist.length;
      toNotes.hidden = !window.PHYS106Notes;
    }
    function insert(txt) {
      var a = input.selectionStart === null ? input.value.length : input.selectionStart, b = input.selectionEnd === null ? a : input.selectionEnd;
      input.value = input.value.slice(0, a) + txt + input.value.slice(b); var c = a + txt.length; input.focus(); input.setSelectionRange(c, c);
    }
    function calc() {
      var src = input.value.trim(); if (!src) return;
      try { var v = evaluate(src, ans); ans = v; st.hist.push({ e: src, v: v }); if (st.hist.length > 30) st.hist.shift(); save(CALC_KEY, st); show(v); renderHist(); input.value = ''; }
      catch (err) { out.textContent = err.message === 'math' ? 'Math error' : 'Syntax error'; wordsEl.textContent = err.message === 'math' ? 'Check for division by zero or the square root of a negative number.' : 'Check the parentheses and operators.'; }
    }
    function press(k) {
      if (k === '=') return calc();
      if (k === 'clear') { input.value = ''; out.textContent = '0'; wordsEl.textContent = ''; input.focus(); return; }
      if (k === 'del') { var a = input.selectionStart || input.value.length; if (a > 0) { input.value = input.value.slice(0, a - 1) + input.value.slice(a); input.setSelectionRange(a - 1, a - 1); } input.focus(); return; }
      insert(k);
    }
    function open() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); input.focus(); }
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    btn.addEventListener('click', function () { if (panel.hidden) open(); else close(); });
    closeB.addEventListener('click', close);
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); calc(); } });
    modeB.addEventListener('click', function () { st.mode = st.mode === 'sci' ? 'norm' : 'sci'; save(CALC_KEY, st); renderMode(); renderHist(); if (ans !== null) show(ans); });
    clearH.addEventListener('click', function () { st.hist = []; save(CALC_KEY, st); renderHist(); });
    toNotes.addEventListener('click', function () {
      if (!window.PHYS106Notes || !st.hist.length) return;
      var rows = st.hist.slice(-8).map(function (h) { return '<li><code>' + h.e.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }) + ' = ' + fmtSci(h.v, 6) + '</code></li>'; }).join('');
      window.PHYS106Notes.add('<h3>Calculator work</h3><ol>' + rows + '</ol>', 'Calculator');
    });
    renderMode(); renderHist(); if (ans !== null) show(ans);
  }

  /* ================= readiness check ================= */
  function buildReadiness(rootEl) {
    var src = document.getElementById(rootEl.getAttribute('data-source')); if (!src) return;
    var items; try { items = JSON.parse(src.textContent); } catch (e) { return; }
    var form = mk('form', 'ready-form'); form.setAttribute('novalidate', '');
    items.forEach(function (it, i) {
      var fs = mk('fieldset', 'ready-q'); var lg = mk('legend', null, (i + 1) + '. ' + it.q); fs.appendChild(lg);
      it.choices.forEach(function (c, j) {
        var id = 'rd-' + i + '-' + j, lab = mk('label', 'ready-choice'), inp = mk('input'); inp.type = 'radio'; inp.name = 'rd-' + i; inp.value = String(j); inp.id = id;
        lab.appendChild(inp); lab.appendChild(document.createTextNode(' ' + c)); fs.appendChild(lab);
      });
      form.appendChild(fs);
    });
    var submit = mk('button', 'btn-primary', 'Check my answers'); submit.type = 'submit'; form.appendChild(submit);
    var result = mk('div', 'ready-result'); result.setAttribute('aria-live', 'polite');
    rootEl.appendChild(form); rootEl.appendChild(result);
    var rec = load(READY_KEY, {});
    if (rec.best !== undefined) result.textContent = 'Your best score so far: ' + rec.best + ' of ' + items.length + '.';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var right = 0, review = {};
      items.forEach(function (it, i) {
        var sel = form.querySelector('input[name="rd-' + i + '"]:checked'), fs = form.querySelectorAll('.ready-q')[i];
        var ok = sel && +sel.value === it.answer; if (ok) right++; else review[it.skill] = it.skillTitle;
        var fb = fs.querySelector('.ready-fb') || fs.appendChild(mk('p', 'ready-fb'));
        fb.textContent = (ok ? '✓ Correct. ' : '✗ Answer: ' + it.choices[it.answer] + '. ') + it.explain;
        fb.className = 'ready-fb ' + (ok ? 'good' : 'bad');
      });
      rec.best = Math.max(rec.best || 0, right); rec.last = right; rec.date = new Date().toISOString(); save(READY_KEY, rec);
      result.innerHTML = '';
      result.appendChild(mk('p', 'ready-score', 'You got ' + right + ' of ' + items.length + ' correct.'));
      var keys = Object.keys(review);
      if (!keys.length) result.appendChild(mk('p', null, 'You are ready for the math in this course. The toolkit sections below are here whenever you want a refresher.'));
      else {
        result.appendChild(mk('p', null, 'Review these skills before Module 1 problems (each link opens its toolkit section):'));
        var ul = mk('ul'); keys.forEach(function (k) { var li = mk('li'), a = mk('a', null, review[k]); a.href = '#' + k; li.appendChild(a); ul.appendChild(li); }); result.appendChild(ul);
      }
      result.focus && result.setAttribute('tabindex', '-1'); result.focus();
    });
  }

  function init() {
    buildCalc();
    placeRefreshers();
    numberWords();
    Array.prototype.forEach.call(document.querySelectorAll('.readiness[data-source]'), buildReadiness);
    Array.prototype.forEach.call(document.querySelectorAll('button[data-print]'), function (b) { b.addEventListener('click', function () { window.print(); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
