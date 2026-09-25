/* Module 13: cosmic timeline, CMB cooling, helium from the Big Bang, fate of the universe (Friedmann model),
   critical density calculator, look-back calculator, "which era?" drill. */
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
  var YR = 3.156e7;
  function human(t) { // seconds -> readable
    if (t < 1e-3) return sci(t, 1) + ' s';
    if (t < 60) return fmt(t, t < 1 ? 3 : 1) + ' s';
    if (t < 3600) return fmt(t / 60, 1) + ' minutes';
    if (t < 86400 * 365) return fmt(t / 86400, 0) + ' days';
    var y = t / YR; if (y < 1e6) return fmt(y, 0) + ' years'; if (y < 1e9) return fmt(y / 1e6, 0) + ' million years'; return fmt(y / 1e9, 2) + ' billion years';
  }

  /* ============== Cosmic timeline ============== */
  var ERAS = [
    [-43, 'Planck era', 'All four forces may have been unified. Physics as we know it cannot describe this era; it needs a theory of quantum gravity.'],
    [-38, 'GUT era', 'Gravity has separated. The strong, weak, and electromagnetic forces act as one; inflation may occur near the end.'],
    [-35, 'Inflation and the electroweak era', 'A burst of inflation stretches space enormously; afterward the weak and electromagnetic forces are still unified.'],
    [-10, 'Particle era', 'Particles and antiparticles form from energy and annihilate constantly; a tiny excess of matter survives.'],
    [-3, 'Era of nucleosynthesis', 'Protons and neutrons fuse into helium and a little lithium. By 3 minutes, the universe is about 75% hydrogen, 25% helium by mass.'],
    [2.3, 'Era of nuclei', 'Too hot for atoms: a glowing plasma of nuclei and electrons, with light unable to travel far.'],
    [13.08, 'Era of atoms (recombination and the dark ages)', 'At about 380,000 years, electrons join nuclei to form atoms; light streams free, becoming the cosmic microwave background. Then the "dark ages" until the first stars ignite, a few hundred million years later.'],
    [16.5, 'Era of galaxies', 'From about a billion years on, galaxies grow, merge, and settle into the spirals and ellipticals we see today.']
  ];
  function tempAt(lt) { // log10 t(s) -> K
    var t = Math.pow(10, lt);
    if (lt < 12.2) return 1.5e10 / Math.sqrt(t); // radiation era (approx)
    var y = t / YR, z; // matter era approximation, then today
    z = Math.pow(13.8e9 / y, 2 / 3) - 1;
    return 2.725 * (1 + Math.max(0, z));
  }
  (function timeline() {
    var svg = $('tl-svg'); if (!svg) return;
    var W = 800, H = 260, X0 = 30, X1 = 770, LMIN = -43, LMAX = Math.log10(13.8e9 * YR);
    function xl(l) { return X0 + (l - LMIN) / (LMAX - LMIN) * (X1 - X0); }
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var cols = ['#7b3fa0', '#8e44ad', '#c0392b', '#d35400', '#e67e22', '#f39c12', '#2c3e50', '#2e6fb5'];
    ERAS.forEach(function (e, i) { var x1 = xl(e[0]), x2 = i < ERAS.length - 1 ? xl(ERAS[i + 1][0]) : X1; el('rect', { x: x1, y: 70, width: x2 - x1, height: 70, fill: cols[i], opacity: 0.85 }, svg); });
    [-40, -30, -20, -10, 0, 10].forEach(function (l) { var t = el('text', { x: xl(l), y: 160, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = '10' + String(l).split('').map(function (c) { return SUP[c]; }).join('') + ' s'; });
    var tt = el('text', { x: X1, y: 160, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); tt.textContent = 'today';
    var cap = el('text', { x: X0, y: 190, 'font-size': 11, 'class': 's-label-muted' }, svg); cap.textContent = 'Time since the Big Bang (logarithmic scale: each tick is 10 billion times later than the last)';
    var mk = el('polygon', { 'class': 's-hl-fill' }, svg), ml = el('text', { y: 50, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, 'class': 's-label' }, svg);
    var tIn = $('tl-t');
    function render() {
      var l = parseFloat(tIn.value), x = xl(l), era = ERAS[0]; ERAS.forEach(function (e) { if (l >= e[0]) era = e; });
      mk.setAttribute('points', (x - 8) + ',58 ' + (x + 8) + ',58 ' + x + ',70'); ml.setAttribute('x', Math.max(120, Math.min(680, x))); ml.textContent = era[1];
      var T = tempAt(l);
      $('tl-t-out').textContent = human(Math.pow(10, l)); tIn.setAttribute('aria-valuetext', human(Math.pow(10, l)) + ', ' + era[1]);
      setText('tl-r-era', era[1]); setText('tl-r-T', T > 1e4 ? sci(T, 1) + ' K' : fmt(T, 1) + ' K');
      setText('tl-note', era[2] + ' (Temperatures are approximate.)');
    }
    tIn.addEventListener('input', render);
    player($('tl-play'), function (dt) { var v = parseFloat(tIn.value) + dt * 6; if (v >= LMAX) { tIn.value = String(LMAX); render(); return false; } tIn.value = String(v); render(); }, 'Run the clock');
    render();
  })();

  /* ============== CMB cooling ============== */
  (function cmb() {
    var svg = $('cmb-svg'); if (!svg) return;
    var W = 800, H = 340, X0 = 70, X1 = 760, Y0 = 290, Y1 = 40, LMIN = -7, LMAX = -1.5;
    function xw(lw) { return X0 + (lw - LMIN) / (LMAX - LMIN) * (X1 - X0); }
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg);
    [[-6.4, 'visible'], [-5, 'infrared'], [-3, 'microwave'], [-2, 'radio']].forEach(function (b) { var t = el('text', { x: xw(b[0]), y: Y0 + 18, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = b[1]; });
    el('rect', { x: xw(-6.42), y: Y1, width: xw(-6.15) - xw(-6.42), height: Y0 - Y1, fill: 'url(#cmb-vis)', opacity: 0.35 }, svg);
    var defs = el('defs', {}, svg), lg = el('linearGradient', { id: 'cmb-vis' }, defs); ['#7b2ff7', '#2f6bff', '#22c55e', '#facc15', '#ef4444'].forEach(function (c, i) { el('stop', { offset: (i / 4).toFixed(2), 'stop-color': c }, lg); });
    var curve = el('path', { 'class': 's-hl', 'stroke-width': 2.5 }, svg), pk = el('line', { y1: Y0, y2: Y1, 'class': 's-line', 'stroke-dasharray': '3 3' }, svg);
    var yl = el('text', { x: X0, y: 26, 'font-size': 12, 'class': 's-label' }, svg); yl.textContent = 'Spectrum of the cosmic background radiation (wavelength, log scale)';
    var zIn = $('cmb-z');
    function render() {
      var lz = parseFloat(zIn.value), z = Math.pow(10, lz) - 1, T = 2.725 * (1 + z), lp = 2.898e-3 / T;
      var d = '', max = 0, pts = [];
      for (var i = 0; i <= 240; i++) { var lw = LMIN + i / 240 * (LMAX - LMIN), w = Math.pow(10, lw), x = 1.439e-2 / (w * T), B = x > 700 ? 0 : 1 / (Math.pow(w, 5) * (Math.exp(x) - 1)) * w; pts.push(B); if (B > max) max = B; }
      pts.forEach(function (B, i) { d += (i ? ' L ' : 'M ') + (X0 + i / 240 * (X1 - X0)).toFixed(1) + ' ' + (Y0 - B / max * (Y0 - Y1 - 20)).toFixed(1); });
      curve.setAttribute('d', d); pk.setAttribute('x1', xw(Math.log10(lp))); pk.setAttribute('x2', xw(Math.log10(lp)));
      $('cmb-z-out').textContent = 'universe ' + fmt(1 + z, 0) + '× smaller than today'; zIn.setAttribute('aria-valuetext', $('cmb-z-out').textContent + ', ' + fmt(T, 0) + ' kelvin');
      setText('cmb-r-T', fmt(T, T < 10 ? 3 : 0) + ' K'); setText('cmb-r-z', fmt(z, 0));
      setText('cmb-r-pk', lp < 1e-6 ? fmt(lp * 1e9, 0) + ' nm' : lp < 1e-3 ? fmt(lp * 1e6, 1) + ' μm' : fmt(lp * 1e3, 2) + ' mm');
      setText('cmb-note', 'When atoms formed, about 380,000 years after the Big Bang, the universe was about 3,000 K and glowed like the surface of a cool star, mostly in near-infrared light. Since then space has stretched about 1,100 times, stretching every wavelength by the same factor. Today that glow is a 2.7 K microwave background filling the whole sky.');
    }
    zIn.addEventListener('input', render);
    player($('cmb-play'), function (dt) { var v = parseFloat(zIn.value) - dt * 0.4; if (v <= 0) { zIn.value = '0'; render(); return false; } zIn.value = String(v); render(); }, 'Expand the universe');
    render();
  })();

  /* ============== Helium from the Big Bang ============== */
  (function helium() {
    var svg = $('he-svg'); if (!svg) return;
    var W = 800, H = 300;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var g = el('g', {}, svg), rIn = $('he-r');
    function render() {
      var r = +rIn.value;
      var total = 16, nn = Math.round(total / (1 + r)), pp = total - nn, he = Math.floor(Math.min(nn, pp) / 2), leftP = pp - 2 * he, leftN = nn - 2 * he;
      while (g.firstChild) g.removeChild(g.firstChild);
      var t1 = el('text', { x: 30, y: 30, 'font-size': 13, 'class': 's-label' }, g); t1.textContent = 'Before fusion: ' + pp + ' protons (orange), ' + nn + ' neutrons (gray)';
      for (var i = 0; i < total; i++) el('circle', { cx: 50 + i * 42, cy: 70, r: 14, 'class': i < pp ? 's-sun' : 's-moondark', stroke: '#8FA3CC', 'stroke-width': 1.5 }, g);
      var t2 = el('text', { x: 30, y: 140, 'font-size': 13, 'class': 's-label' }, g); t2.textContent = 'After 3 minutes: ' + he + ' helium nuclei, ' + leftP + ' hydrogen nuclei' + (leftN ? ', ' + leftN + ' leftover neutrons (they decay)' : '');
      var x = 50;
      for (var h = 0; h < he; h++) { [[0, 0, 1], [16, 0, 1], [0, 16, 0], [16, 16, 0]].forEach(function (q) { el('circle', { cx: x + q[0], cy: 180 + q[1], r: 9, 'class': q[2] ? 's-sun' : 's-moondark', stroke: '#8FA3CC', 'stroke-width': 1 }, g); }); x += 56; }
      for (var k = 0; k < leftP; k++) { el('circle', { cx: x + 8, cy: 188, r: 9, 'class': 's-sun' }, g); x += 32; }
      var Y = 4 * he / total;
      $('he-r-out').textContent = r + ' protons per neutron'; rIn.setAttribute('aria-valuetext', $('he-r-out').textContent);
      setText('he-r-y', fmt(Y * 100, 0) + '% helium by mass'); setText('he-r-x', fmt((1 - Y) * 100, 0) + '% hydrogen by mass');
      setText('he-note', 'In the first few minutes, there were about 7 protons for every neutron. Nearly every neutron ended up in helium, which has 2 protons and 2 neutrons. So 2 of every 16 particles became neutrons in helium, plus 2 matching protons: 4 of 16, or 25% of the mass. That is exactly the helium fraction observed in the oldest stars and gas clouds, strong evidence for the Big Bang.');
    }
    rIn.addEventListener('input', render); render();
  })();

  /* ============== Fate of the universe ============== */
  function evolve(Om, OL) { // returns {pts:[[t,a]], age} with t in units of 1/H0, t=0 at Big Bang
    var Ok = 1 - Om - OL;
    function acc(a) { return -Om / (2 * a * a) + OL * a; }
    // backward from a=1 to find age
    var a = 1, v = 1, t = 0, dt = 0.0005, back = [];
    while (a > 0.002 && t > -3) { var k1 = acc(a); v -= k1 * dt; a -= v * dt; t -= dt; back.push([t, a]); if (v < 0) break; }
    var age = -t;
    var pts = back.reverse().map(function (p) { return [p[0] + age, p[1]]; }); pts.push([age, 1]);
    a = 1; v = 1; t = 0;
    while (t < 4 && a > 0.002 && a < 12) { v += acc(a) * dt; a += v * dt; t += dt; pts.push([t + age, a]); }
    return { pts: pts, age: age, Ok: Ok, recollapse: a <= 0.002 };
  }
  (function fate() {
    var svg = $('ft-svg'); if (!svg) return;
    var W = 800, H = 380, X0 = 70, X1 = 760, Y0 = 330, Y1 = 40, TMAX = 4, AMAX = 5;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg); el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line' }, svg);
    function xt(t) { return X0 + t / TMAX * (X1 - X0); } function ya(a) { return Y0 - Math.min(a, AMAX) / AMAX * (Y0 - Y1); }
    [0, 1, 2, 3, 4].forEach(function (t) { var tx = el('text', { x: xt(t), y: Y0 + 16, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); tx.textContent = fmt(t * 14.44, 0) + ' Gyr'; });
    var yl = el('text', { x: 20, y: 185, 'font-size': 12, 'class': 's-label-muted', transform: 'rotate(-90 20 185)', 'text-anchor': 'middle' }, svg); yl.textContent = 'size of the universe (today = 1)';
    var xlab = el('text', { x: (X0 + X1) / 2, y: Y0 + 34, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); xlab.textContent = 'time since the Big Bang';
    var today = el('line', { y1: Y0, y2: Y1, 'class': 's-line', 'stroke-dasharray': '3 3' }, svg), tl = el('text', { y: Y1 + 12, 'font-size': 11, 'class': 's-label' }, svg); tl.textContent = 'today';
    var ref = el('path', { 'class': 's-line', 'stroke-width': 1.5, 'stroke-dasharray': '6 4', opacity: 0.6 }, svg), cur = el('path', { 'class': 's-hl', 'stroke-width': 3 }, svg);
    var mIn = $('ft-m'), lIn = $('ft-l');
    function path(ev) { return 'M ' + ev.pts.filter(function (p, i) { return i % 4 === 0; }).map(function (p) { return xt(p[0]).toFixed(1) + ' ' + ya(p[1]).toFixed(1); }).join(' L '); }
    var refEv = evolve(1, 0); ref.setAttribute('d', path(refEv));
    function render() {
      var Om = parseFloat(mIn.value), OL = parseFloat(lIn.value), ev = evolve(Om, OL);
      cur.setAttribute('d', path(ev)); today.setAttribute('x1', xt(ev.age)); today.setAttribute('x2', xt(ev.age)); tl.setAttribute('x', xt(ev.age) + 4);
      $('ft-m-out').textContent = fmt(Om, 2); $('ft-l-out').textContent = fmt(OL, 2);
      mIn.setAttribute('aria-valuetext', 'matter ' + fmt(Om, 2)); lIn.setAttribute('aria-valuetext', 'dark energy ' + fmt(OL, 2));
      setText('ft-r-age', fmt(ev.age * 14.44, 1) + ' billion years (H₀ = 68)');
      setText('ft-r-geo', Math.abs(ev.Ok) < 0.02 ? 'Flat' : ev.Ok > 0 ? 'Open (curved like a saddle)' : 'Closed (curved like a sphere)');
      var accel = -Om / 2 + OL > 0;
      setText('ft-r-fate', ev.recollapse ? 'Recollapse: a "Big Crunch"' : accel ? 'Expands forever, accelerating' : 'Expands forever, slowing down');
      setText('ft-note', 'Matter\u2019s gravity slows the expansion; dark energy speeds it up. With our universe\u2019s measured mix (about 0.31 matter and 0.69 dark energy, total 1: flat), expansion slowed for the first several billion years and has been accelerating for the last 5 billion or so. The dashed curve shows a matter-only, flat universe for comparison.');
    }
    [mIn, lIn].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ft]'), function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-ft').split(','); mIn.value = v[0]; lIn.value = v[1]; render(); }); });
    render();
  })();

  /* ============== Activity: critical density ============== */
  (function crit() {
    var h = $('cd-h'); if (!h) return;
    function render() {
      var H0 = parseFloat(h.value); if (!(H0 > 0)) return;
      var Hs = H0 / 3.086e19, rho = 3 * Hs * Hs / (8 * Math.PI * 6.674e-11), atoms = rho / 1.67e-27;
      setText('cd-r-rho', sci(rho, 2) + ' kg/m³'); setText('cd-r-at', fmt(atoms, 1) + ' hydrogen atoms per cubic meter');
      setText('cd-r-ord', fmt(atoms * 0.049, 2) + ' atoms per cubic meter');
      setText('cd-note', 'The critical density is the density that would make the universe exactly flat. It is incredibly low: a few hydrogen atoms in a room-sized box. Ordinary matter makes up only about 5% of it.');
    }
    h.addEventListener('input', render); render();
  })();

  /* ============== Activity: look-back calculator ============== */
  (function lookback() {
    var z = $('lb-z'); if (!z) return;
    function ageAt(zz) { var Om = 0.31, OL = 0.69, amax = 1 / (1 + zz), n = 4000, s = 0; for (var i = 1; i <= n; i++) { var a = amax * (i - 0.5) / n; s += 1 / (a * Math.sqrt(Om / (a * a * a) + OL)) * amax / n; } return s * 14.44; }
    function render() {
      var Z = parseFloat(z.value); if (!(Z >= 0)) return;
      var age = ageAt(Z), now = ageAt(0);
      setText('lb-r-s', fmt(1 / (1 + Z), 3) + ' of today\u2019s size (' + fmt(1 + Z, 1) + '× smaller)');
      setText('lb-r-T', fmt(2.725 * (1 + Z), 1) + ' K');
      setText('lb-r-age', age < 0.001 ? 'about ' + fmt(age * 1e6, 0) + ' thousand years old (this simple model ignores radiation; the measured value is 380,000 years)' : age < 1 ? fmt(age * 1000, 0) + ' million years old' : fmt(age, 2) + ' billion years old');
      setText('lb-r-lb', fmt(now - age, 2) + ' billion years ago');
      setText('lb-note', 'Redshift z tells how much the universe has expanded since the light left: every length, including the light\u2019s wavelength, has grown by a factor of 1 + z. (Calculated for a flat universe with 31% matter and 69% dark energy, H₀ = 68 km/s/Mpc.)');
    }
    z.addEventListener('input', render);
    Array.prototype.forEach.call(document.querySelectorAll('[data-lb]'), function (b) { b.addEventListener('click', function () { z.value = b.getAttribute('data-lb'); render(); }); });
    render();
  })();

  /* ============== Activity: which era? ============== */
  (function drill() {
    var q = $('we-q'); if (!q) return;
    var opts = $('we-opts'), fb = $('we-fb'), next = $('we-next'), st = $('we-streak');
    var P = window.PHYS106, KEY = 'phys106-we-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur, order = [], ix = 0;
    var E = ['Planck era', 'Inflation', 'Particle era', 'Era of nucleosynthesis', 'Era of nuclei', 'Era of atoms', 'Era of galaxies'];
    var S = [['The first 10⁻⁴³ seconds, when all forces may have been one and our theories break down.', 0], ['Space expands by a factor of perhaps 10²⁵ in a tiny fraction of a second, smoothing and flattening the universe.', 1], ['Quarks, electrons, and their antiparticles constantly form from energy and annihilate.', 2], ['Protons and neutrons fuse to make helium, finishing by about 3 minutes.', 3], ['A hot plasma of nuclei and free electrons; photons scatter constantly and can\u2019t travel far.', 4], ['Electrons combine with nuclei, and the light we now see as the cosmic microwave background is released.', 5], ['Atoms have formed, the universe is transparent, and it is dark until the first stars ignite.', 5], ['Galaxies grow and merge over billions of years into the spirals and ellipticals we see today.', 6], ['The universe cools to about 3,000 K, about 380,000 years after the Big Bang.', 5], ['Matter slightly outnumbers antimatter, about one part in a billion.', 2]];
    function newQ() {
      if (ix >= order.length) { order = P.shuffle(S.map(function (_, i) { return i; })); ix = 0; }
      cur = S[order[ix++]]; q.textContent = 'Which era? ' + cur[0];
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      E.forEach(function (e, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = e; b.addEventListener('click', function () { answer(i, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(i, b) {
      var ok = i === cur[1];
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x, k) { x.disabled = true; if (k === cur[1]) x.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = ok ? '✓ Correct.' : '✗ The answer is: ' + E[cur[1]] + '.';
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
