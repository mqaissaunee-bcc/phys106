/* Module 11: white dwarf mass-radius, pulsar lighthouse, galactic rotation curve, star S2 around Sgr A*,
   orbit-mass calculator, remnant density calculator, "which remnant?" drill. */
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
  function starfield(svg, w, h, n, seed) { var g = el('g', { 'aria-hidden': 'true' }, svg), s = seed || 7; function r() { s = (s * 16807) % 2147483647; return s / 2147483647; } for (var i = 0; i < n; i++) el('circle', { cx: (r() * w).toFixed(1), cy: (r() * h).toFixed(1), r: (r() * 1.1 + 0.3).toFixed(2), 'class': 's-star', opacity: (r() * 0.6 + 0.2).toFixed(2) }, g); return g; }
  function player(btn, stepFn, label) {
    var on = false, raf = null, last = null;
    function frame(ts) { if (!on) return; if (last === null) last = ts; var dt = Math.min(0.1, (ts - last) / 1000); last = ts; if (stepFn(REDUCED ? dt * 2.5 : dt) === false) { stop(); return; } raf = requestAnimationFrame(frame); }
    function stop() { on = false; last = null; if (raf) cancelAnimationFrame(raf); btn.textContent = label; btn.setAttribute('aria-pressed', 'false'); }
    btn.addEventListener('click', function () { if (on) { stop(); return; } on = true; btn.textContent = 'Pause'; btn.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(frame); });
  }

  /* ============== White dwarf mass-radius ============== */
  (function wd() {
    var svg = $('wd-svg'); if (!svg) return;
    var W = 800, H = 320, CY = 160;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 50, 4);
    var earth = el('circle', { cx: 230, cy: CY, r: 100, 'class': 's-earth', opacity: 0.8 }, svg);
    var et = el('text', { x: 230, y: 290, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); et.textContent = 'Earth (for scale)';
    var wdC = el('circle', { cx: 540, cy: CY, 'class': 's-star' }, svg);
    var wt = el('text', { x: 540, y: 290, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg);
    var mIn = $('wd-m');
    function render() {
      var M = parseFloat(mIn.value), x = Math.min(0.9999, M / 1.44), R = 8800 * Math.pow(M, -1 / 3) * Math.sqrt(1 - Math.pow(x, 4 / 3));
      wdC.setAttribute('r', Math.max(1.5, R / 6371 * 100)); wt.textContent = 'White dwarf, ' + fmt(M, 2) + ' solar masses';
      var rho = M * 1.989e30 / (4 / 3 * Math.PI * Math.pow(R * 1000, 3));
      $('wd-m-out').textContent = fmt(M, 2) + ' solar masses'; mIn.setAttribute('aria-valuetext', $('wd-m-out').textContent);
      setText('wd-r-r', fmt(R, 0) + ' km (' + fmt(R / 6371, 2) + ' × Earth)');
      setText('wd-r-d', sci(rho, 2) + ' kg/m³');
      setText('wd-r-tsp', fmt(rho * 5e-6 / 1000, 1) + ' tonnes');
      setText('wd-note', M > 1.38 ? 'Close to the Chandrasekhar limit of about 1.4 solar masses, the white dwarf shrinks dramatically. Past the limit, electron degeneracy pressure fails and it cannot exist.' : 'Strangely, a more massive white dwarf is smaller: its stronger gravity squeezes its electrons into less space, and degeneracy pressure pushes back only when they are packed tighter.');
    }
    mIn.addEventListener('input', render); render();
  })();

  /* ============== Pulsar lighthouse ============== */
  (function pulsar() {
    var svg = $('ps-svg'); if (!svg) return;
    var W = 800, H = 360, CX = 200, CY = 160;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 60, 8);
    var beams = el('g', {}, svg);
    var b1 = el('polygon', { 'class': 's-hl-fill', opacity: 0.45 }, beams), b2 = el('polygon', { 'class': 's-hl-fill', opacity: 0.45 }, beams);
    el('circle', { cx: CX, cy: CY, r: 16, 'class': 's-moonlit' }, svg);
    var ax = el('line', { 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    var eye = el('text', { x: 440, y: CY + 5, 'font-size': 13, 'class': 's-label' }, svg); eye.textContent = '👁 Earth →';
    el('line', { x1: 40, y1: 320, x2: 770, y2: 320, 'class': 's-line' }, svg);
    var tr = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg);
    var tl = el('text', { x: 40, y: 300, 'font-size': 12, 'class': 's-label-muted' }, svg); tl.textContent = 'Signal received at Earth';
    var slow = el('text', { x: 16, y: 24, 'font-size': 12, 'class': 's-label-muted' }, svg);
    var pIn = $('ps-p'), ang = 0, hist = [];
    function beam(p, a) { var L = 330, w = 0.18; p.setAttribute('points', CX + ',' + CY + ' ' + (CX + L * Math.cos(a - w)) + ',' + (CY + L * Math.sin(a - w)) + ' ' + (CX + L * Math.cos(a + w)) + ',' + (CY + L * Math.sin(a + w))); }
    function draw() {
      beam(b1, ang); beam(b2, ang + Math.PI);
      ax.setAttribute('x1', CX - 60 * Math.cos(ang + 1.2)); ax.setAttribute('y1', CY - 60 * Math.sin(ang + 1.2)); ax.setAttribute('x2', CX + 60 * Math.cos(ang + 1.2)); ax.setAttribute('y2', CY + 60 * Math.sin(ang + 1.2));
      var d = ''; hist.forEach(function (v, i) { d += (i ? ' L ' : 'M ') + (40 + i * 2) + ' ' + (320 - v * 60).toFixed(1); }); tr.setAttribute('d', d);
    }
    function sample() { var a = ((ang % TAU) + TAU) % TAU, dA = Math.min(Math.abs(a), Math.abs(a - TAU), Math.abs(a - Math.PI)); hist.push(dA < 0.18 ? 1 : 0); if (hist.length > 365) hist.shift(); }
    function render() {
      var P = Math.pow(10, parseFloat(pIn.value)), f = 1 / P, v = TAU * 10 * f;
      $('ps-p-out').textContent = P < 0.1 ? fmt(P * 1000, 2) + ' ms' : fmt(P, 2) + ' s';
      pIn.setAttribute('aria-valuetext', $('ps-p-out').textContent + ' per rotation');
      setText('ps-r-f', fmt(f, f < 10 ? 2 : 0) + ' rotations per second');
      setText('ps-r-v', fmt(v, 0) + ' km/s (' + fmt(v / 3000, v / 3000 < 1 ? 2 : 1) + '% of light speed)');
      setText('ps-r-type', P < 0.02 ? 'Millisecond pulsar, spun up by a companion' : P < 0.1 ? 'Young pulsar, like the Crab' : 'Ordinary or older pulsar');
      slow.textContent = 'Animation slowed down about ' + fmt(Math.max(1, f / 0.5), 0) + '×';
      setText('ps-note', 'A pulsar\u2019s beams sweep around as it spins. Whenever a beam crosses Earth, we see a pulse, like a lighthouse. The Crab pulsar spins 30 times a second; the fastest known pulsars spin over 700 times a second, their surfaces moving at a sizable fraction of the speed of light.');
    }
    pIn.addEventListener('input', render);
    player($('ps-play'), function (dt) { ang += dt * TAU * 0.5; sample(); sample(); draw(); }, 'Spin');
    render(); draw();
  })();

  /* ============== Galactic rotation curve ============== */
  (function rotation() {
    var svg = $('rc-svg'); if (!svg) return;
    var W = 800, H = 380, X0 = 420, X1 = 770, Y0 = 330, Y1 = 40;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var gal = el('g', {}, svg), s = 5; function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 400; i++) { var r = Math.pow(rnd(), 1.4) * 170, a = rnd() * TAU + r * 0.03; el('circle', { cx: 200 + r * Math.cos(a), cy: 190 + r * Math.sin(a) * 0.45, r: 0.9 + rnd(), 'class': 's-star', opacity: 0.4 + 0.5 * (1 - r / 170) }, gal); }
    el('ellipse', { cx: 200, cy: 190, rx: 22, ry: 12, 'class': 's-sun', opacity: 0.7 }, svg);
    var orb = el('ellipse', { cx: 200, cy: 190, 'class': 's-hl', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
    var st = el('circle', { r: 5, 'class': 's-earth' }, svg);
    function xr(r) { return X0 + r / 30 * (X1 - X0); } function yv(v) { return Y0 - v / 300 * (Y0 - Y1); }
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg); el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line' }, svg);
    [0, 10, 20, 30].forEach(function (r) { var t = el('text', { x: xr(r), y: Y0 + 16, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = r + ' kpc'; });
    [100, 200, 300].forEach(function (v) { var t = el('text', { x: X0 - 6, y: yv(v) + 4, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = v; });
    var yl = el('text', { x: X0, y: Y1 - 14, 'font-size': 12, 'class': 's-label' }, svg); yl.textContent = 'Orbital speed (km/s) vs. distance from center';
    function vVis(r) { var M = 9e10 * Math.pow(r / (r + 3), 2); return 65.6 * Math.sqrt(M / 1e9 / Math.max(r, 0.2)); }
    function vObs(r) { return 230 * (1 - Math.exp(-r / 1.8)); }
    var dv = '', dob = ''; for (var r = 0.2; r <= 30; r += 0.2) { dv += (dv ? ' L ' : 'M ') + xr(r).toFixed(1) + ' ' + yv(vVis(r)).toFixed(1); dob += (dob ? ' L ' : 'M ') + xr(r).toFixed(1) + ' ' + yv(vObs(r)).toFixed(1); }
    var pv = el('path', { d: dv, 'class': 's-line', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, svg), po = el('path', { d: dob, 'class': 's-hl', 'stroke-width': 3 }, svg);
    var lv = el('text', { x: xr(12), y: yv(vVis(12)) + 18, 'font-size': 11, 'class': 's-label-muted' }, svg); lv.textContent = 'predicted from visible matter';
    var lo = el('text', { x: xr(18), y: yv(vObs(18)) - 8, 'font-size': 11, 'class': 's-label' }, svg); lo.textContent = 'observed';
    var mk = el('line', { y1: Y0, y2: Y1, 'class': 's-line', 'stroke-width': 1 }, svg);
    var rIn = $('rc-r'), sh = $('rc-dm'), t = 0;
    function render() {
      var r = parseFloat(rIn.value), vo = vObs(r), vv = vVis(r);
      orb.setAttribute('rx', r / 30 * 170 * 1.2); orb.setAttribute('ry', r / 30 * 170 * 1.2 * 0.45);
      var a = t * vo / Math.max(r, 0.5) / 60; st.setAttribute('cx', 200 + r / 30 * 204 * Math.cos(a)); st.setAttribute('cy', 190 + r / 30 * 204 * 0.45 * Math.sin(a));
      mk.setAttribute('x1', xr(r)); mk.setAttribute('x2', xr(r));
      pv.setAttribute('opacity', sh.checked ? 1 : 0); lv.setAttribute('opacity', sh.checked ? 1 : 0);
      var Mdyn = vo * vo * r / (65.6 * 65.6) * 1e9;
      $('rc-r-out').textContent = fmt(r, 1) + ' kpc (' + fmt(r * 3.26, 0) + ' thousand ly)'; rIn.setAttribute('aria-valuetext', $('rc-r-out').textContent);
      setText('rc-r-vo', fmt(vo, 0) + ' km/s'); setText('rc-r-vv', fmt(vv, 0) + ' km/s');
      setText('rc-r-m', sci(Mdyn, 1) + ' solar masses (' + fmt(100 * (1 - Math.min(1, 9e10 * Math.pow(r / (r + 3), 2) / Mdyn)), 0) + '% unseen)');
      setText('rc-note', 'If most of the galaxy\u2019s mass were in the stars and gas we can see, orbital speeds should drop far from the center, as the planets\u2019 speeds drop far from the Sun. Instead they stay nearly flat. Something invisible is adding gravity: dark matter. (Illustrative model; the Sun is at about 8 kpc.)');
    }
    [rIn, sh].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    player($('rc-play'), function (dt) { t += dt * 60; render(); }, 'Orbit');
    render();
  })();

  /* ============== S2 around Sgr A* ============== */
  (function s2() {
    var svg = $('s2-svg'); if (!svg) return;
    var W = 800, H = 360, A = 240, e = 0.886, B = A * Math.sqrt(1 - e * e), CX = 360, CY = 180, fx = CX + A * e;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 90, 19);
    var d = ''; for (var i = 0; i <= 160; i++) { var E = i / 160 * TAU; d += (i ? ' L ' : 'M ') + (CX + A * Math.cos(E)).toFixed(1) + ' ' + (CY + B * Math.sin(E)).toFixed(1); }
    el('path', { d: d, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    el('circle', { cx: fx, cy: CY, r: 5, fill: '#000', stroke: '#F5B53D', 'stroke-width': 2 }, svg);
    var bl = el('text', { x: fx + 10, y: CY + 20, 'font-size': 12, 'class': 's-label' }, svg); bl.textContent = 'Sagittarius A*';
    var star = el('circle', { r: 6, 'class': 's-star' }, svg), trail = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg);
    var tIn = $('s2-t'), aAU = 1031, P = 16.05, M = Math.pow(aAU, 3) / (P * P);
    function solveE(Mm) { var E = Mm; for (var k = 0; k < 40; k++) E -= (E - e * Math.sin(E) - Mm) / (1 - e * Math.cos(E)); return E; }
    function render() {
      var f = parseFloat(tIn.value), E = solveE(TAU * f), x = CX + A * Math.cos(E), y = CY + B * Math.sin(E);
      star.setAttribute('cx', x); star.setAttribute('cy', y);
      var dd = ''; for (var k = 0; k <= 60; k++) { var fk = (((f - 0.1 * k / 60) % 1) + 1) % 1; var Ek = solveE(TAU * fk); dd += (k ? ' L ' : 'M ') + (CX + A * Math.cos(Ek)).toFixed(1) + ' ' + (CY + B * Math.sin(Ek)).toFixed(1); }
      trail.setAttribute('d', dd);
      var r = aAU * (1 - e * Math.cos(E)), v = 29.78 * Math.sqrt(M * (2 / r - 1 / aAU));
      $('s2-t-out').textContent = fmt(f * P, 1) + ' years'; tIn.setAttribute('aria-valuetext', $('s2-t-out').textContent + ' into the orbit');
      setText('s2-r-d', fmt(r, 0) + ' AU (' + fmt(r * 8.317 / 60, 1) + ' light-hours)');
      setText('s2-r-v', fmt(v, 0) + ' km/s (' + fmt(v / 3000, 1) + '% of light speed)');
      setText('s2-r-m', sci(M, 2) + ' solar masses');
      setText('s2-note', 'The star S2 orbits the galactic center every 16 years. Its orbit is so small and fast that the object it circles must have about 4 million solar masses packed into a region smaller than our solar system: only a black hole fits. Andrea Ghez and Reinhard Genzel shared the 2020 Nobel Prize in Physics for these measurements.');
    }
    tIn.addEventListener('input', render);
    player($('s2-play'), function (dt) { tIn.value = String((parseFloat(tIn.value) + dt * 0.05) % 1); render(); }, 'Play orbit');
    render();
  })();

  /* ============== Activity: weigh anything with an orbit ============== */
  (function weigh() {
    var a = $('om-a'); if (!a) return;
    var p = $('om-p'), pre = $('om-pre');
    var PRE = { sun: [1, 1, 'the Sun', 1], s2: [1031, 16.05, 'Sagittarius A*', 4.3e6], gal: [1.65e9, 2.3e8, 'the Milky Way inside the Sun\u2019s orbit', null], jup: [0.00282, 0.004843, 'Jupiter (from its moon Io)', 0.000954] };
    function render() {
      var A = parseFloat(a.value), Pp = parseFloat(p.value); if (!(A > 0 && Pp > 0)) return;
      var M = A * A * A / (Pp * Pp), k = pre.value, pr = PRE[k];
      setText('om-r-m', (M < 0.01 || M > 1e4 ? sci(M, 2) : fmt(M, 3)) + ' solar masses');
      setText('om-note', pr && Math.abs(A - pr[0]) / pr[0] < 1e-6 ? 'This is the mass of ' + pr[2] + '.' + (pr[3] ? ' Accepted value: about ' + (pr[3] < 0.01 || pr[3] > 1e4 ? sci(pr[3], 2) : fmt(pr[3], 3)) + ' solar masses.' : ' Compare this with the roughly 10¹¹ solar masses of visible stars and gas in the whole galaxy.') : 'M = a³ ÷ p², with a in AU, p in years, and M in solar masses.');
    }
    [a, p].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () { var pr = PRE[pre.value]; if (!pr) return; a.value = pr[0]; p.value = pr[1]; render(); });
    render();
  })();

  /* ============== Activity: density of remnants ============== */
  (function dens() {
    var m = $('dr-m'); if (!m) return;
    var r = $('dr-r'), pre = $('dr-pre');
    var PRE = { sun: [1, 696000], wd: [1, 6000], ns: [1.4, 10], earth: [3e-6, 6371] };
    function render() {
      var M = parseFloat(m.value), R = parseFloat(r.value); if (!(M > 0 && R > 0)) return;
      var rho = M * 1.989e30 / (4 / 3 * Math.PI * Math.pow(R * 1000, 3)), tsp = rho * 5e-6;
      setText('dr-r-rho', sci(rho, 2) + ' kg/m³ (water: 1,000)');
      setText('dr-r-t', tsp < 1000 ? fmt(tsp, 2) + ' kg' : tsp < 1e6 ? fmt(tsp / 1000, 1) + ' tonnes' : sci(tsp / 1000, 1) + ' tonnes');
      setText('dr-note', 'A teaspoon holds 5 cm³. Squeeze a star\u2019s mass into a smaller ball and its density climbs as 1 ÷ radius³.');
    }
    [m, r].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () { var p = PRE[pre.value]; if (!p) return; m.value = p[0]; r.value = p[1]; render(); });
    render();
  })();

  /* ============== Activity: which remnant? ============== */
  (function drill() {
    var q = $('wr-q'); if (!q) return;
    var opts = $('wr-opts'), fb = $('wr-fb'), next = $('wr-next'), st = $('wr-streak');
    var P = window.PHYS106, KEY = 'phys106-wr-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur, order = [], ix = 0;
    var R = ['White dwarf', 'Neutron star', 'Black hole'];
    var S = [
      ['A star born with 1 solar mass (like the Sun) dies. What does it leave behind?', 0, 'Low-mass stars shed their envelopes and leave a white dwarf.'],
      ['A star born with 5 solar masses dies. What remains?', 0, 'Stars up to about 8 solar masses end as white dwarfs.'],
      ['A star born with 15 solar masses explodes as a supernova. What remains?', 1, 'Its collapsed core, about 1.4–2 solar masses, becomes a neutron star.'],
      ['A star born with 40 solar masses collapses. What most likely remains?', 2, 'The heaviest cores exceed any degeneracy pressure and collapse to black holes.'],
      ['A remnant about the size of Earth, supported by electron degeneracy pressure.', 0, 'White dwarfs are Earth-sized.'],
      ['A remnant about 20 km across, supported by neutron degeneracy pressure.', 1, 'Neutron stars are city-sized.'],
      ['A remnant with no surface at all, only an event horizon.', 2, 'Nothing escapes from inside the horizon.'],
      ['A remnant sending radio pulses 30 times a second from the Crab Nebula.', 1, 'Pulsars are rapidly spinning neutron stars.'],
      ['A remnant whose mass can never exceed about 1.4 solar masses.', 0, 'That is the Chandrasekhar limit.'],
      ['An invisible object of 21 solar masses pulling gas from a companion in Cygnus X-1.', 2, 'Far above the neutron star limit, so it must be a black hole.'],
      ['A remnant that erupts as a nova when hydrogen from its companion ignites on its surface.', 0, 'Novae happen on accreting white dwarfs.'],
      ['Two of these merged in 2017, producing gravitational waves and newly made gold.', 1, 'GW170817 was a neutron star merger.']
    ];
    function newQ() {
      if (ix >= order.length) { order = P.shuffle(S.map(function (_, i) { return i; })); ix = 0; }
      cur = S[order[ix++]]; q.textContent = cur[0];
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      R.forEach(function (x, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = x; b.addEventListener('click', function () { answer(i, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(i, b) {
      var ok = i === cur[1];
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x, k) { x.disabled = true; if (k === cur[1]) x.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct. ' : '✗ The answer is: ' + R[cur[1]] + '. ') + cur[2];
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
