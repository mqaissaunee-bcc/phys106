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
    var more = mk('p', 'refresher-more'); var a = mk('a', null, 'More practice in the Math toolkit'); a.href = root() + 'math-toolkit.html#sci'; more.appendChild(a); more.appendChild(document.createTextNode(' · ')); var a2 = mk('a', null, 'See sizes on the Orders of Magnitude Explorer'); a2.href = root() + 'orders-of-magnitude.html'; more.appendChild(a2); body.appendChild(more);
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


  /* ================= orders of magnitude: landmarks, magnitude line, zeros view ================= */
  var LANDMARKS = {
    length: { unit: 'm', label: 'Length (meters)', lo: -16, hi: 27, items: [[1.7e-15, 'A proton'], [1e-10, 'An atom'], [1e-7, 'A virus'], [8e-6, 'A red blood cell'], [1e-4, 'The width of a hair'], [1.7, 'A person'], [100, 'A football field'], [8.8e3, 'Mount Everest\u2019s height'], [1.27e7, 'Earth\u2019s diameter'], [3.84e8, 'Earth to the Moon'], [1.39e9, 'The Sun\u2019s diameter'], [1.5e11, 'Earth to the Sun (1 AU)'], [4.5e12, 'The Sun to Neptune'], [9.46e15, 'One light-year'], [4.0e16, 'The nearest star'], [9.5e20, 'The Milky Way\u2019s width'], [2.4e22, 'The distance to Andromeda'], [8.8e26, 'The observable universe']] },
    time: { unit: 's', label: 'Time (seconds)', lo: -1, hi: 18, items: [[0.3, 'A blink of an eye'], [60, 'One minute'], [499, 'Sunlight\u2019s trip to Earth'], [8.64e4, 'One day'], [3.16e7, 'One year'], [2.5e9, 'A human lifetime'], [1.6e11, 'Recorded history (5,000 years)'], [9.5e12, 'Modern humans (300,000 years)'], [2.1e15, 'Since the dinosaurs died (66 million years)'], [7.3e15, 'One lap of the Sun around the galaxy'], [1.45e17, 'The age of Earth'], [4.35e17, 'The age of the universe']] },
    mass: { unit: 'kg', label: 'Mass (kilograms)', lo: -31, hi: 54, items: [[9.1e-31, 'An electron'], [1.67e-27, 'A proton'], [1e-6, 'A grain of sand'], [0.145, 'A baseball'], [70, 'A person'], [1500, 'A car'], [1.5e5, 'A blue whale'], [6e9, 'The Great Pyramid'], [7.3e22, 'The Moon'], [6e24, 'Earth'], [1.9e27, 'Jupiter'], [2e30, 'The Sun'], [8.5e36, 'Sagittarius A* (4 million Suns)'], [2e42, 'The Milky Way, with dark matter'], [1.5e53, 'Ordinary matter in the observable universe']] },
    number: { unit: '', label: 'Just the number', lo: -3, hi: 28, items: [[1, 'One'], [1e3, 'One thousand'], [1e6, 'One million'], [8.1e9, 'People on Earth'], [2e11, 'Stars in the Milky Way'], [1e12, 'One trillion'], [3.7e13, 'Cells in your body'], [1e22, 'Stars in the observable universe (at least)'], [7e27, 'Atoms in your body']] }
  };
  function lc(n) { return n.replace(/^(A|An|The) /, function (m) { return m.toLowerCase(); }); }
  function landmarkText(v, cat) { var L = LANDMARKS[cat]; return fmtSci(v, 2) + (L.unit ? ' ' + L.unit : ''); }
  function neighbors(v, cat) {
    var items = LANDMARKS[cat].items.slice().sort(function (a, b) { return a[0] - b[0]; }), below = null, above = null;
    items.forEach(function (it) { if (it[0] <= v) below = it; else if (!above) above = it; });
    return [below, above];
  }
  function sv(tag, attrs, parent) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (parent) parent.appendChild(e); return e; }
  function magLine(cat, value, opt) {
    opt = opt || {}; var L = LANDMARKS[cat], W = opt.width || 330, H = opt.labels ? 170 : 74, X0 = 14, X1 = W - 14, Y = opt.labels ? 88 : 36;
    function xe(e) { return X0 + (Math.min(L.hi, Math.max(L.lo, e)) - L.lo) / (L.hi - L.lo) * (X1 - X0); }
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, 'class': 'mag-svg', role: 'img', 'aria-hidden': opt.ariaLabel ? 'false' : 'true' });
    if (opt.ariaLabel) sv('title', {}, svg).textContent = opt.ariaLabel;
    sv('line', { x1: X0, y1: Y, x2: X1, y2: Y, 'class': 'mag-axis' }, svg);
    var step = (L.hi - L.lo) > 40 ? 10 : 5;
    for (var e = Math.ceil(L.lo); e <= L.hi; e++) {
      var major = e % step === 0;
      sv('line', { x1: xe(e), y1: Y - (major ? 6 : 3), x2: xe(e), y2: Y + (major ? 6 : 3), 'class': 'mag-tick' }, svg);
      if (major) { var t = sv('text', { x: xe(e), y: Y + 20, 'class': 'mag-lab', 'text-anchor': 'middle' }, svg); t.textContent = '10' + sup(e); }
    }
    L.items.forEach(function (it, i) {
      var x = xe(Math.log10(it[0])), sel = opt.selected && opt.selected.indexOf(it[1]) >= 0;
      sv('circle', { cx: x, cy: Y, r: sel ? 6 : 3.5, 'class': sel ? 'mag-dot sel' : 'mag-dot' }, svg);
      if (opt.labels) {
        var up = i % 2 === 0, ty = up ? Y - 16 - (i % 4 === 0 ? 0 : 14) : Y + 36 + (i % 4 === 1 ? 0 : 14);
        sv('line', { x1: x, y1: Y, x2: x, y2: up ? ty + 4 : ty - 11, 'class': 'mag-lead' }, svg);
        var tl = sv('text', { x: x, y: ty, 'class': sel ? 'mag-name sel' : 'mag-name', 'text-anchor': x > W - 90 ? 'end' : x < 60 ? 'start' : 'middle' }, svg); tl.textContent = it[1].replace(/^(A|An|The) /, '');
      }
    });
    if (value !== null && value !== undefined && value > 0 && isFinite(value)) {
      var le = Math.log10(value), x = xe(le);
      sv('polygon', { points: (x - 7) + ',' + (Y - 20) + ' ' + (x + 7) + ',' + (Y - 20) + ' ' + x + ',' + (Y - 8), 'class': 'mag-mark' }, svg);
      if (le < L.lo || le > L.hi) { var o = sv('text', { x: x, y: Y - 24, 'class': 'mag-lab', 'text-anchor': 'middle' }, svg); o.textContent = le < L.lo ? '◄ smaller' : 'larger ►'; }
    }
    if (opt.guess !== undefined && opt.guess !== null) { var gx = xe(opt.guess); sv('line', { x1: gx, y1: Y - 18, x2: gx, y2: Y + 18, 'class': 'mag-guess' }, svg); }
    return svg;
  }
  function magText(v, cat) {
    if (!(v > 0) || !isFinite(v)) return 'The magnitude line shows positive numbers only.';
    var e = Math.floor(Math.log10(v)), nb = neighbors(v, cat), parts = ['Order of magnitude: about 10' + sup(e) + '.'];
    var near = [nb[0], nb[1]].filter(function (x) { return x && Math.abs(Math.log10(v / x[0])) < 0.05; })[0];
    if (near) parts.push('About the same as ' + lc(near[1]) + ' (' + landmarkText(near[0], cat) + ').');
    else if (nb[0] && nb[1]) parts.push('Between ' + lc(nb[0][1]) + ' (' + landmarkText(nb[0][0], cat) + ') and ' + lc(nb[1][1]) + ' (' + landmarkText(nb[1][0], cat) + ').');
    else if (nb[0]) parts.push('Larger than ' + lc(nb[0][1]) + ' (' + landmarkText(nb[0][0], cat) + ').');
    else if (nb[1]) parts.push('Smaller than ' + lc(nb[1][1]) + ' (' + landmarkText(nb[1][0], cat) + ').');
    return parts.join(' ');
  }
  function zerosView(v) {
    var wrap = mk('div', 'zeros');
    if (!isFinite(v) || v === 0) { wrap.appendChild(mk('p', null, 'Enter a nonzero number.')); return wrap; }
    var a = Math.abs(v), p = sciParts(a, 3), m = p[0], e = p[1], md = trim(String(m)).replace('.', ''), cells = [];
    if (e > 30 || e < -12) { wrap.appendChild(mk('p', null, fmtSci(a, 3) + ' is too long to draw digit by digit: that is ' + (e > 0 ? e + ' places to the right' : -e + ' places to the left') + ' of the first digit. The magnitude line shows its size better.')); return wrap; }
    if (e >= 0) {
      var len = Math.max(e + 1, md.length);
      for (var i = 0; i < len; i++) cells.push({ d: i < md.length ? md[i] : '0', kind: i === 0 ? 'lead' : (i < md.length ? 'mant' : 'zero'), place: i >= 1 && i <= e ? i : null });
      cells.splice(e + 1, 0, { d: len > e + 1 ? '.' : '', kind: 'point' });
    } else {
      cells.push({ d: '0', kind: 'zero0' }, { d: '.', kind: 'point' });
      for (var j = 1; j < -e; j++) cells.push({ d: '0', kind: 'zero', place: j });
      for (var k = 0; k < md.length; k++) cells.push({ d: md[k], kind: k === 0 ? 'lead' : 'mant', place: k === 0 ? -e : null });
    }
    var row = mk('div', 'zeros-row'); row.setAttribute('aria-hidden', 'true');
    cells.forEach(function (c) { if (c.kind === 'point' && !c.d) return; var b = mk('span', 'zc ' + c.kind); b.appendChild(mk('span', 'zd', c.d)); b.appendChild(mk('span', 'zp', c.place ? String(c.place) : '')); row.appendChild(b); });
    var zeros = e >= 0 ? Math.max(0, e - (md.length - 1)) : -e - 1;
    var cap = mk('p', 'zeros-cap', (e >= 0 ? trim(String(m)) + ' × 10' + sup(e) + ': the decimal point moves ' + e + ' place' + (e === 1 ? '' : 's') + ' to the right, adding ' + zeros + ' zero' + (zeros === 1 ? '' : 's') + '.' : trim(String(m)) + ' × 10' + sup(e) + ': the decimal point moves ' + (-e) + ' places to the left, with ' + zeros + ' zero' + (zeros === 1 ? '' : 's') + ' after the decimal point.') + ' Small numbers under each box count the places.');
    var sr = mk('p', 'sr-only', 'Written out: ' + cells.map(function (c) { return c.d; }).join(''));
    wrap.appendChild(row); wrap.appendChild(cap); wrap.appendChild(sr);
    return wrap;
  }
  window.MathTools.magLine = magLine; window.MathTools.LANDMARKS = LANDMARKS;

  /* ================= Orders of Magnitude Explorer page ================= */
  function buildExplorer(rootEl) {
    var KEY = PREFIX + 'magnitude-v1', rec = load(KEY, { best: 0 }), cat = 'length', sel = [], game = null, streak = 0;
    var tabs = mk('div', 'mx-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Choose what to measure');
    ['length', 'time', 'mass', 'number'].forEach(function (c) { var b = mk('button', 'mx-tab', LANDMARKS[c].label); b.type = 'button'; b.setAttribute('data-cat', c); b.addEventListener('click', function () { cat = c; sel = []; newGame(); render(); }); tabs.appendChild(b); });
    var lineBox = mk('div', 'mx-line'); lineBox.tabIndex = 0; lineBox.setAttribute('role', 'region'); lineBox.setAttribute('aria-label', 'Magnitude line (scroll sideways on small screens)');
    var list = mk('div', 'mx-list'); var listH = mk('h3', null, 'Landmarks'); var listUl = mk('ul', 'mx-items');
    var detail = mk('p', 'mx-detail'); detail.setAttribute('aria-live', 'polite');
    var cmpH = mk('h3', null, 'Compare two'); var cmp = mk('div', 'mx-cmp'); var sa = mk('select'), sb = mk('select'); sa.setAttribute('aria-label', 'First object'); sb.setAttribute('aria-label', 'Second object');
    var cmpOut = mk('p', 'mx-cmp-out'); cmpOut.setAttribute('aria-live', 'polite'); cmp.appendChild(sa); cmp.appendChild(mk('span', null, ' compared with ')); cmp.appendChild(sb);
    var gameH = mk('h3', null, 'Place it: estimation game'); var gq = mk('p', 'mx-gq'); var glab = mk('label', null, 'Your estimate: '); var gin = mk('input'); gin.type = 'range'; gin.id = 'mx-guess'; glab.setAttribute('for', 'mx-guess');
    var gval = mk('output', 'mx-gval'); var gbtn = mk('button', 'btn-primary', 'Check'); gbtn.type = 'button'; var gnext = mk('button', null, 'New object'); gnext.type = 'button'; var gfb = mk('p', 'mx-gfb'); gfb.setAttribute('aria-live', 'polite'); var gscore = mk('p', 'mx-gscore');
    var grow = mk('div', 'mx-grow'); grow.appendChild(glab); grow.appendChild(gin); grow.appendChild(gval);
    var gact = mk('div', 'act-actions'); gact.appendChild(gbtn); gact.appendChild(gnext);
    list.appendChild(listH); list.appendChild(listUl);
    [tabs, lineBox, detail, list, cmpH, cmp, cmpOut, gameH, gq, grow, gact, gfb, gscore].forEach(function (x) { rootEl.appendChild(x); });
    function nm(it) { return it[1]; }
    function describe(it) { var L = LANDMARKS[cat], v = it[0], w = words(v); return it[1] + ': ' + landmarkText(v, cat) + (w ? ' (' + w + (L.unit ? ' ' + L.unit : '') + ')' : '') + '.'; }
    function fillSelect(s, idx) { s.innerHTML = ''; LANDMARKS[cat].items.forEach(function (it, i) { var o = mk('option', null, it[1]); o.value = String(i); s.appendChild(o); }); s.value = String(idx); }
    function compare() {
      var A = LANDMARKS[cat].items[+sa.value], B = LANDMARKS[cat].items[+sb.value]; if (!A || !B) return;
      var r = A[0] / B[0], big = r >= 1 ? A : B, small = r >= 1 ? B : A, ratio = big[0] / small[0], pw = Math.log10(ratio);
      cmpOut.textContent = ratio < 1.5 ? A[1] + ' and ' + lc(B[1]) + ' are about the same.' : big[1] + ' is about ' + (ratio < 1e4 ? commas(trim(String(Number(ratio.toPrecision(2))))) : fmtSci(ratio, 2)) + ' times ' + (cat === 'time' ? 'longer than' : cat === 'mass' ? 'heavier than' : cat === 'length' ? 'larger than' : 'more than') + ' ' + lc(small[1]) + ': ' + (pw < 1 ? 'less than one power of ten.' : 'about ' + Math.round(pw) + ' power' + (Math.round(pw) === 1 ? '' : 's') + ' of ten.');
      sel = [A[1], B[1]]; drawLine();
    }
    function drawLine() {
      lineBox.innerHTML = '';
      var guess = game && !game.done && game.touched ? parseFloat(gin.value) : null, val = game && game.done ? game.item[0] : null;
      lineBox.appendChild(magLine(cat, val, { width: 900, labels: true, selected: sel, guess: guess, ariaLabel: 'Magnitude line for ' + LANDMARKS[cat].label.toLowerCase() + ', from 10 to the ' + LANDMARKS[cat].lo + ' to 10 to the ' + LANDMARKS[cat].hi + ', with ' + LANDMARKS[cat].items.length + ' landmarks listed below.' }));
    }
    function newGame() {
      var items = LANDMARKS[cat].items, it = items[Math.floor(Math.random() * items.length)];
      game = { item: it, done: false };
      gin.min = String(LANDMARKS[cat].lo); gin.max = String(LANDMARKS[cat].hi); gin.step = '1'; gin.value = String(Math.round((LANDMARKS[cat].lo + LANDMARKS[cat].hi) / 2));
      gq.textContent = 'Where does this go? ' + it[1] + (LANDMARKS[cat].unit ? ' (in ' + LANDMARKS[cat].label.toLowerCase().replace(/^\w+ \(|\)$/g, '') + ')' : '') + '. Slide to your estimate, then check.';
      gfb.textContent = ''; updGuess();
    }
    function updGuess() { gval.textContent = '10' + sup(gin.value) + (LANDMARKS[cat].unit ? ' ' + LANDMARKS[cat].unit : ''); gin.setAttribute('aria-valuetext', '10 to the ' + gin.value + (LANDMARKS[cat].unit ? ' ' + LANDMARKS[cat].unit : '')); drawLine(); }
    gin.addEventListener('input', function () { if (game) game.touched = true; updGuess(); });
    gbtn.addEventListener('click', function () {
      if (!game || game.done) return;
      var truth = Math.log10(game.item[0]), off = Math.round(parseFloat(gin.value) - truth); game.done = true;
      var ok = Math.abs(off) <= 1; streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; save(KEY, rec); }
      gfb.textContent = (ok ? '✓ ' + (off === 0 ? 'Right on the power of ten. ' : 'Within one power of ten. ') : '✗ ') + game.item[1] + ' is ' + landmarkText(game.item[0], cat) + '. ' + (off === 0 ? '' : 'Your estimate was ' + Math.abs(off) + ' power' + (Math.abs(off) === 1 ? '' : 's') + ' of ten (' + (Math.abs(off) < 7 ? commas(String(Math.pow(10, Math.abs(off)))) : '10' + sup(Math.abs(off))) + ' times) too ' + (off > 0 ? 'large.' : 'small.'));
      gfb.className = 'mx-gfb ' + (ok ? 'good' : 'bad');
      gscore.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      sel = [game.item[1]]; drawLine();
    });
    gnext.addEventListener('click', function () { sel = []; newGame(); gin.focus(); });
    sa.addEventListener('change', compare); sb.addEventListener('change', compare);
    function render() {
      Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-cat') === cat)); });
      listUl.innerHTML = '';
      LANDMARKS[cat].items.forEach(function (it) {
        var li = mk('li'), b = mk('button', 'mx-item', it[1]); b.type = 'button';
        b.addEventListener('click', function () { sel = [it[1]]; detail.textContent = describe(it); drawLine(); });
        li.appendChild(b); listUl.appendChild(li);
      });
      detail.textContent = 'Select a landmark to see its size.';
      var n = LANDMARKS[cat].items.length; fillSelect(sa, n - 1); fillSelect(sb, Math.max(0, Math.floor(n / 2)));
      compare();
      gscore.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    newGame(); render();
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
    var viewRow = mk('div', 'calc-views');
    var vLine = mk('button', 'calc-view', 'Magnitude line'); vLine.type = 'button';
    var vZero = mk('button', 'calc-view', 'How many zeros'); vZero.type = 'button';
    var catSel = mk('select', 'calc-cat'); catSel.setAttribute('aria-label', 'What the number measures');
    ['number', 'length', 'time', 'mass'].forEach(function (c) { var o = mk('option', null, LANDMARKS[c].label); o.value = c; catSel.appendChild(o); });
    viewRow.appendChild(vLine); viewRow.appendChild(vZero);
    var viewBox = mk('div', 'calc-viewbox'); viewBox.setAttribute('aria-live', 'polite');
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
    [head, lab, input, out, wordsEl, viewRow, viewBox, pad, histH, hist, acts, help].forEach(function (x) { panel.appendChild(x); });
    document.body.appendChild(panel);

    function renderView() {
      viewBox.innerHTML = '';
      vLine.setAttribute('aria-pressed', String(st.view === 'line')); vZero.setAttribute('aria-pressed', String(st.view === 'zeros'));
      if (!st.view || ans === null) { viewBox.hidden = true; return; }
      viewBox.hidden = false;
      if (st.view === 'line') {
        var c = st.cat || 'number'; catSel.value = c;
        var r = mk('div', 'calc-catrow'); var cl = mk('span', null, 'Compare with: '); r.appendChild(cl); r.appendChild(catSel); viewBox.appendChild(r);
        viewBox.appendChild(magLine(c, Math.abs(ans)));
        viewBox.appendChild(mk('p', 'calc-magtext', magText(Math.abs(ans), c)));
        var ex = mk('a', 'calc-explore', 'Open the Orders of Magnitude Explorer'); ex.href = root() + 'orders-of-magnitude.html'; viewBox.appendChild(ex);
      } else viewBox.appendChild(zerosView(ans));
    }
    function show(v) { out.textContent = st.mode === 'sci' ? fmtSci(v, 6) : fmtNorm(v); var w = words(v); wordsEl.textContent = w ? 'In words: ' + w : ''; renderView(); }
    vLine.addEventListener('click', function () { st.view = st.view === 'line' ? null : 'line'; save(CALC_KEY, st); renderView(); });
    vZero.addEventListener('click', function () { st.view = st.view === 'zeros' ? null : 'zeros'; save(CALC_KEY, st); renderView(); });
    catSel.addEventListener('change', function () { st.cat = catSel.value; save(CALC_KEY, st); renderView(); });
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
    renderMode(); renderHist(); if (ans !== null) show(ans); else renderView();
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
    Array.prototype.forEach.call(document.querySelectorAll('.mag-explorer'), buildExplorer);
    Array.prototype.forEach.call(document.querySelectorAll('button[data-print]'), function (b) { b.addEventListener('click', function () { window.print(); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
