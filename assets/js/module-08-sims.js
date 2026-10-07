/* Module 8: build an atom, double slit, wave packet (uncertainty), quantum tunneling,
   de Broglie calculator, annihilation calculator, "name the force" drill. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(n, a, p) { var e = document.createElementNS(NS, n); if (a) Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (p) p.appendChild(e); return e; }
  function $(id) { return document.getElementById(id); }
  function setText(id, t) { var n = $(id); if (n) n.textContent = t; }
  function fmt(x, d) { d = d === undefined ? 1 : d; if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString('en-US'); return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d }); }
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function sci(x, d) { if (!x) return '0'; var e = Math.floor(Math.log10(Math.abs(x))); if (e >= -2 && e <= 4) return fmt(x, d === undefined ? 2 : d); var m = x / Math.pow(10, e); return m.toFixed(d === undefined ? 1 : d) + ' × 10' + String(e).split('').map(function (c) { return SUP[c]; }).join(''); }
  function player(btn, stepFn, label) {
    var on = false, raf = null, last = null;
    function frame(ts) { if (!on) return; if (last === null) last = ts; var dt = Math.min(0.1, (ts - last) / 1000); last = ts; if (stepFn(REDUCED ? dt * 2.5 : dt) === false) { stop(); return; } raf = requestAnimationFrame(frame); }
    function stop() { on = false; last = null; if (raf) cancelAnimationFrame(raf); btn.textContent = label; btn.setAttribute('aria-pressed', 'false'); }
    btn.addEventListener('click', function () { if (on) { stop(); return; } on = true; btn.textContent = 'Pause'; btn.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(frame); });
  }

  /* ============== Build an atom ============== */
  (function atom() {
    var svg = $('atom-svg'); if (!svg) return;
    var W = 800, H = 360, CX = 250, CY = 180;
    var NAMES = ['', 'hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen', 'oxygen', 'fluorine', 'neon', 'sodium', 'magnesium', 'aluminum', 'silicon', 'phosphorus', 'sulfur', 'chlorine', 'argon', 'potassium', 'calcium', 'scandium', 'titanium', 'vanadium', 'chromium', 'manganese', 'iron'];
    var SYM = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe'];
    var STABLE = { 1: [0, 1], 2: [1, 2], 3: [3, 4], 4: [5], 5: [5, 6], 6: [6, 7], 7: [7, 8], 8: [8, 9, 10], 9: [10], 10: [10, 11, 12], 11: [12], 12: [12, 13, 14], 13: [14], 14: [14, 15, 16], 15: [16], 16: [16, 17, 18, 20], 17: [18, 20], 18: [18, 20, 22], 19: [20, 22], 20: [20, 22, 23, 24, 26], 21: [24], 22: [24, 25, 26, 27, 28], 23: [28], 24: [26, 28, 29, 30], 25: [30], 26: [28, 30, 31, 32] };
    var CAP = [2, 8, 8, 18];
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var shells = el('g', {}, svg), nuc = el('g', {}, svg), elec = el('g', {}, svg);
    var big = el('text', { x: 590, y: 150, 'text-anchor': 'middle', 'font-size': 64, 'font-weight': 700, 'class': 's-label' }, svg);
    var nm = el('text', { x: 590, y: 196, 'text-anchor': 'middle', 'font-size': 18, 'class': 's-label' }, svg);
    var note2 = el('text', { x: 590, y: 330, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); note2.textContent = 'Not to scale: a real nucleus would be far too small to see.';
    var pIn = $('atom-p'), nIn = $('atom-n'), eIn = $('atom-e');
    function render() {
      var Z = +pIn.value, N = +nIn.value, E = +eIn.value, A = Z + N, q = Z - E;
      [shells, nuc, elec].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
      var tot = Z + N, pp = 0, nn = 0;
      for (var i = 0; i < tot; i++) {
        var r = 4.5 * Math.sqrt(i), th = i * 2.4, isP = pp < Z && (nn >= N || i % 2 === 0);
        if (isP) pp++; else nn++;
        el('circle', { cx: CX + r * Math.cos(th), cy: CY + r * Math.sin(th), r: 5.5, 'class': isP ? 's-sun' : 's-moondark', stroke: '#8FA3CC', 'stroke-width': isP ? 0 : 1.2 }, nuc);
      }
      var left = E, n = 0;
      CAP.forEach(function (c, si) {
        var rr = 50 + si * 36; el('circle', { cx: CX, cy: CY, r: rr, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, shells);
        var put = Math.min(c, left); left -= put;
        for (var j = 0; j < put; j++) { var t = j / put * TAU + si; el('circle', { cx: CX + rr * Math.cos(t), cy: CY + rr * Math.sin(t), r: 4, 'class': 's-earth' }, elec); }
      });
      big.textContent = SYM[Z];
      var st = STABLE[Z] || [], stable = st.indexOf(N) !== -1;
      nm.textContent = NAMES[Z] + '-' + A;
      $('atom-p-out').textContent = Z; $('atom-n-out').textContent = N; $('atom-e-out').textContent = E;
      setText('atom-r-el', NAMES[Z].charAt(0).toUpperCase() + NAMES[Z].slice(1) + ' (atomic number ' + Z + ')');
      setText('atom-r-iso', NAMES[Z] + '-' + A + (stable ? ' (stable)' : ' (unstable: radioactive)'));
      setText('atom-r-q', q === 0 ? 'Neutral atom' : (q > 0 ? '+' + q : q) + ': an ion');
      var sh = [], l2 = E; CAP.forEach(function (c) { if (l2 > 0) { sh.push(Math.min(c, l2)); l2 -= c; } });
      setText('atom-r-sh', sh.join(', ') || 'none');
      setText('atom-note', 'The number of protons decides the element. Changing the neutrons makes a different isotope of the same element; changing the electrons makes an ion. Electrons fill shells from the inside out because of the exclusion principle (Section 8.6); an atom with a full outer shell, like neon, is chemically inert. Stable isotopes of ' + NAMES[Z] + ' have ' + st.join(', ') + ' neutrons.');
    }
    [pIn, nIn, eIn].forEach(function (i) { i.addEventListener('input', render); });
    render();
  })();

  /* ============== Double slit ============== */
  (function dslit() {
    var svg = $('ds-svg'); if (!svg) return;
    var W = 800, H = 380, SX = 460, SW = 300, NB = 60;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    el('circle', { cx: 50, cy: 190, r: 10, 'class': 's-earth' }, svg);
    var gl = el('text', { x: 50, y: 220, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); gl.textContent = 'electron gun';
    var wall = el('g', {}, svg);
    el('rect', { x: SX, y: 20, width: 30, height: 340, 'class': 's-sky', opacity: 0.8 }, svg);
    var dots = el('g', {}, svg), bars = el('g', {}, svg), curve = el('path', { 'class': 's-hl', 'stroke-width': 1.5 }, svg);
    var cap = el('text', { x: 500, y: 16, 'font-size': 11, 'class': 's-label-muted' }, svg); cap.textContent = 'screen: each dot is one electron → count of hits';
    var eye = el('text', { x: 230, y: 360, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg);
    var dIn = $('ds-d'), det = $('ds-det'), hits = [], counts = new Array(NB).fill(0);
    function I(u) { var D = parseFloat(dIn.value), A = 0.9, s = Math.PI * A * u, sinc = Math.abs(s) < 1e-6 ? 1 : Math.sin(s) / s; if (det.checked) { var sh = 0.05 * D; return Math.min(1, Math.exp(-Math.pow((u - sh) / 0.13, 2)) + Math.exp(-Math.pow((u + sh) / 0.13, 2))); } return Math.pow(Math.cos(Math.PI * D * u), 2) * sinc * sinc; }
    function drawWall() {
      while (wall.firstChild) wall.removeChild(wall.firstChild);
      var D = parseFloat(dIn.value), gap = 12 + D * 6;
      el('rect', { x: 226, y: 20, width: 8, height: 170 - gap - 6, 'class': 's-line', fill: '#8FA3CC' }, wall);
      el('rect', { x: 226, y: 190 - gap + 6, width: 8, height: 2 * gap - 12, 'class': 's-line', fill: '#8FA3CC' }, wall);
      el('rect', { x: 226, y: 190 + gap + 6, width: 8, height: 170 - gap - 6, 'class': 's-line', fill: '#8FA3CC' }, wall);
      if (det.checked) { el('circle', { cx: 250, cy: 190 - gap, r: 7, 'class': 's-hl-fill' }, wall); el('circle', { cx: 250, cy: 190 + gap, r: 7, 'class': 's-hl-fill' }, wall); eye.textContent = 'detectors watching which slit each electron uses'; }
      else eye.textContent = 'two slits, no detectors';
    }
    function sample() { for (var t = 0; t < 500; t++) { var u = Math.random() * 2 - 1; if (Math.random() < I(u)) return u; } return 0; }
    function addHit() {
      var u = sample(); hits.push(u);
      var y = 190 + u * 170, b = Math.min(NB - 1, Math.floor((u + 1) / 2 * NB)); counts[b]++;
      if (hits.length <= 3000) el('circle', { cx: SX + 6 + Math.random() * 18, cy: y, r: 1.2, 'class': 's-star' }, dots);
    }
    function drawBars() {
      while (bars.firstChild) bars.removeChild(bars.firstChild);
      var mx = Math.max.apply(null, counts) || 1;
      counts.forEach(function (c, i) { var h = c / mx * 250; el('rect', { x: SX + 40, y: 20 + i * (340 / NB), width: h, height: 340 / NB - 1, 'class': 's-hl-fill', opacity: 0.6 }, bars); });
      var d = ''; for (var k = 0; k <= 200; k++) { var u = k / 100 - 1; d += (k ? ' L ' : 'M ') + (SX + 40 + I(u) * 250).toFixed(1) + ' ' + (190 + u * 170).toFixed(1); }
      curve.setAttribute('d', d); curve.setAttribute('opacity', hits.length > 200 ? 0.9 : 0);
      setText('ds-r-n', hits.length.toLocaleString('en-US'));
      setText('ds-r-pat', hits.length < 50 ? 'Too few hits to tell: they look random' : det.checked ? 'Two bands, one behind each slit: no interference' : 'Bright and dark stripes: an interference pattern');
      $('ds-d-out').textContent = fmt(parseFloat(dIn.value), 1);
      setText('ds-note', det.checked ? 'Watching which slit each electron passes through destroys the interference pattern. The electrons now behave like particles going through one slit or the other.' : 'Each electron lands at one spot, like a particle, yet the pattern builds up only as if each one passed through both slits as a wave and interfered with itself.');
    }
    function reset() { hits = []; counts.fill(0); while (dots.firstChild) dots.removeChild(dots.firstChild); drawWall(); drawBars(); }
    dIn.addEventListener('input', reset); det.addEventListener('change', reset);
    $('ds-100').addEventListener('click', function () { for (var i = 0; i < 100; i++) addHit(); drawBars(); });
    $('ds-reset').addEventListener('click', reset);
    player($('ds-play'), function (dt) { var n = Math.max(1, Math.round(dt * 60)); for (var i = 0; i < n; i++) addHit(); drawBars(); if (hits.length > 6000) return false; }, 'Fire electrons');
    reset();
  })();

  /* ============== Wave packet (uncertainty) ============== */
  (function packet() {
    var svg = $('wp-svg'); if (!svg) return;
    var W = 800, H = 340;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var t1 = el('text', { x: 30, y: 26, 'font-size': 12, 'class': 's-label' }, svg); t1.textContent = 'Where the particle might be (its wave)';
    var t2 = el('text', { x: 530, y: 26, 'font-size': 12, 'class': 's-label' }, svg); t2.textContent = 'Its possible momenta';
    el('line', { x1: 30, y1: 180, x2: 470, y2: 180, 'class': 's-line' }, svg); el('line', { x1: 530, y1: 300, x2: 770, y2: 300, 'class': 's-line' }, svg);
    var wave = el('path', { 'class': 's-hl', 'stroke-width': 1.8 }, svg), env = el('path', { 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg), mom = el('path', { 'class': 's-earth', opacity: 0.8 }, svg);
    var xIn = $('wp-dx');
    function render() {
      var dx = parseFloat(xIn.value), k0 = 7, d = '', e = '', m = '';
      for (var i = 0; i <= 440; i++) { var x = (i - 220) / 40, g = Math.exp(-x * x / (4 * dx * dx)); d += (i ? ' L ' : 'M ') + (30 + i) + ' ' + (180 - 120 * g * Math.cos(k0 * x)).toFixed(1); e += (i ? ' L ' : 'M ') + (30 + i) + ' ' + (180 - 120 * g).toFixed(1); }
      var dk = 1 / (2 * dx);
      for (var j = 0; j <= 240; j++) { var k = (j - 120) / 12, gk = Math.exp(-k * k / (2 * dk * dk)); m += (j ? ' L ' : 'M ') + (530 + j) + ' ' + (300 - 240 * gk * Math.min(1, 0.5 / dk)).toFixed(1); }
      wave.setAttribute('d', d); env.setAttribute('d', e); mom.setAttribute('d', m + ' L 770 300 L 530 300 Z');
      $('wp-dx-out').textContent = fmt(dx, 2);
      xIn.setAttribute('aria-valuetext', 'position spread ' + fmt(dx, 2));
      setText('wp-r-x', fmt(dx, 2) + ' units'); setText('wp-r-p', fmt(dk, 2) + ' units'); setText('wp-r-prod', fmt(dx * dk, 2) + ' (the minimum possible)');
      setText('wp-note', 'To pin down where a wave is, you must add together many wavelengths, and each wavelength means a different momentum. A narrow packet (well-known position) has a wide spread of momenta, and vice versa. Their product can never be smaller than a fixed minimum: that is the uncertainty principle.');
    }
    xIn.addEventListener('input', render); render();
  })();

  /* ============== Tunneling ============== */
  (function tunnel() {
    var svg = $('tn-svg'); if (!svg) return;
    var W = 800, H = 320, BX = 360, Y0 = 170;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var bar = el('rect', { y: 40, height: 230, 'class': 's-hl-fill', opacity: 0.25 }, svg);
    var bl = el('text', { y: 32, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg); bl.textContent = 'energy barrier';
    var wv = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg);
    var l1 = el('text', { x: 40, y: 300, 'font-size': 12, 'class': 's-label-muted' }, svg); l1.textContent = 'incoming electron wave';
    var l2 = el('text', { x: 760, y: 300, 'text-anchor': 'end', 'font-size': 12, 'class': 's-label-muted' }, svg); l2.textContent = 'wave that got through';
    var wIn = $('tn-w'), hIn = $('tn-h');
    function render() {
      var Lnm = parseFloat(wIn.value), dE = parseFloat(hIn.value);
      var kappa = Math.sqrt(2 * 9.11e-31 * dE * 1.602e-19) / 1.0546e-34, T = Math.exp(-2 * kappa * Lnm * 1e-9);
      var bw = Lnm * 300; bar.setAttribute('x', BX); bar.setAttribute('width', bw); bl.setAttribute('x', BX + bw / 2);
      var d = '', amp = 90, kx = 0.12;
      for (var x = 20; x <= BX; x += 2) d += (x === 20 ? 'M ' : ' L ') + x + ' ' + (Y0 - amp * Math.sin(kx * x)).toFixed(1);
      var a0 = amp * Math.sin(kx * BX), decay = kappa * Lnm * 1e-9 / bw;
      for (var x2 = BX; x2 <= BX + bw; x2 += 2) d += ' L ' + x2 + ' ' + (Y0 - a0 * Math.exp(-decay * (x2 - BX))).toFixed(1);
      var at = amp * Math.sqrt(T), ph = Math.asin(Math.max(-1, Math.min(1, a0 * Math.exp(-decay * bw) / Math.max(at, 1e-9)))) || 0;
      for (var x3 = BX + bw; x3 <= 780; x3 += 2) d += ' L ' + x3 + ' ' + (Y0 - at * Math.sin(kx * (x3 - BX - bw) + ph)).toFixed(1);
      wv.setAttribute('d', d);
      $('tn-w-out').textContent = fmt(Lnm, 2) + ' nm'; $('tn-h-out').textContent = fmt(dE, 1) + ' eV';
      wIn.setAttribute('aria-valuetext', fmt(Lnm, 2) + ' nanometers'); hIn.setAttribute('aria-valuetext', fmt(dE, 1) + ' electron volts');
      setText('tn-r-t', T > 1e-3 ? fmt(T * 100, 2) + '%' : sci(T, 1));
      setText('tn-r-one', T > 1e-12 ? '1 in ' + (1 / T < 1e6 ? fmt(1 / T, 0) : sci(1 / T, 1)) : 'essentially never');
      setText('tn-note', 'A classical ball without enough energy could never cross the barrier. A quantum particle\u2019s wave leaks into the barrier, shrinking fast, and a small wave emerges on the far side: there is a chance the particle tunnels through. Thicker or higher barriers make that chance drop steeply. In the Sun\u2019s core, protons tunnel through their electrical repulsion to fuse.');
    }
    [wIn, hIn].forEach(function (i) { i.addEventListener('input', render); }); render();
  })();

  /* ============== Activity: de Broglie calculator ============== */
  (function debroglie() {
    var m = $('db-m'); if (!m) return;
    var v = $('db-v'), pre = $('db-pre');
    var PRE = { e: [9.11e-31, 3e6], p: [1.67e-27, 3e5], you: [70, 1.4], ball: [0.145, 40], dust: [1e-15, 0.001] };
    function render() {
      var M = parseFloat(m.value), V = parseFloat(v.value); if (!(M > 0 && V > 0)) { setText('db-note', 'Enter positive values.'); return; }
      var L = 6.626e-34 / (M * V), cmp = L > 1e-9 ? 'larger than an atom: wave behavior is obvious' : L > 3e-11 ? 'about the size of an atom: electrons diffract through crystals' : L > 1e-15 ? 'smaller than an atom but bigger than a nucleus' : 'far smaller than a proton: no measurable wave behavior';
      setText('db-r-l', sci(L, 2) + ' m'); setText('db-r-c', cmp);
      setText('db-note', 'Every moving object has a wavelength λ = h ÷ (mass × speed). Only for tiny masses is it large enough to matter.');
    }
    [m, v].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () { var p = PRE[pre.value]; if (!p) return; m.value = p[0]; v.value = p[1]; render(); });
    render();
  })();

  /* ============== Activity: matter meets antimatter ============== */
  (function anni() {
    var g = $('an-g'); if (!g) return;
    function render() {
      var grams = parseFloat(g.value); if (!(grams > 0)) return;
      var E = 2 * grams / 1000 * 8.988e16, kt = E / 4.184e12, homes = E / (10500 * 3.6e6);
      setText('an-r-e', sci(E, 2) + ' J'); setText('an-r-kt', kt < 1000 ? fmt(kt, 1) + ' kilotons of TNT' : fmt(kt / 1000, 1) + ' megatons of TNT'); setText('an-r-h', fmt(homes, 0) + ' U.S. homes for a year');
      setText('an-note', 'Matter and antimatter annihilate completely, converting all of both masses into energy (E = mc²). Nuclear fusion in the Sun converts only 0.7% of its fuel\u2019s mass into energy. Making antimatter, though, takes far more energy than it gives back; physicists have produced only billionths of a gram.');
    }
    g.addEventListener('input', render); render();
  })();

  /* ============== Activity: name the force ============== */
  (function drill() {
    var q = $('nf-q'); if (!q) return;
    var opts = $('nf-opts'), fb = $('nf-fb'), next = $('nf-next'), st = $('nf-streak');
    var P = window.PHYS106, KEY = 'phys106-nf-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur, order = [], ix = 0;
    var F = ['Strong force', 'Electromagnetic force', 'Weak force', 'Gravity'];
    var S = [
      ['Holds protons and neutrons together in an atomic nucleus, despite the protons\u2019 electrical repulsion.', 0, 'The strong force is the strongest, but it only reaches across a nucleus.'],
      ['Holds quarks together inside a proton.', 0, 'Quarks are bound by the strong force, carried by gluons.'],
      ['Keeps you from falling through your chair.', 1, 'Electrons in the chair\u2019s atoms repel electrons in yours: every "contact" force is electromagnetic.'],
      ['Holds electrons in orbit around an atom\u2019s nucleus.', 1, 'Opposite charges attract.'],
      ['Makes lightning flash.', 1, 'Lightning is a huge electrical discharge.'],
      ['Holds molecules together in chemical bonds.', 1, 'All of chemistry is electromagnetism among electrons.'],
      ['Turns a proton into a neutron in the first step of the Sun\u2019s fusion chain.', 2, 'Only the weak force can change one type of quark into another.'],
      ['Makes carbon-14 decay into nitrogen-14 (used in radiocarbon dating).', 2, 'Beta decay is a weak-force process.'],
      ['Lets neutrinos pass through Earth almost untouched, interacting only rarely.', 2, 'Neutrinos feel only the weak force (and gravity).'],
      ['Keeps the Moon in orbit around Earth.', 3, 'Long range and always attractive, gravity dominates on large scales.'],
      ['Holds galaxies and clusters of galaxies together.', 3, 'Big objects are electrically neutral, so gravity wins at large scales.'],
      ['Makes a dropped apple fall.', 3, 'Newton\u2019s famous example.'],
      ['Causes friction when you rub your hands together.', 1, 'Friction comes from electromagnetic interactions between surface atoms.']
    ];
    function newQ() {
      if (ix >= order.length) { order = P.shuffle(S.map(function (_, i) { return i; })); ix = 0; }
      cur = S[order[ix++]]; q.textContent = 'Which force is responsible? ' + cur[0];
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      F.forEach(function (f, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = f; b.addEventListener('click', function () { answer(i, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(i, b) {
      var ok = i === cur[1];
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x, k) { x.disabled = true; if (k === cur[1]) x.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct. ' : '✗ The answer is: ' + F[cur[1]] + '. ') + cur[2];
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
