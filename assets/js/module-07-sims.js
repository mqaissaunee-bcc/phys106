/* Module 7: light clock, twin paradox spacetime diagram, gravitational lensing, black hole explorer,
   time dilation calculator, GPS relativity calculator, Lorentz-factor drill. */
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
  function gamma(b) { return 1 / Math.sqrt(1 - b * b); }
  function vFromSlider(x) { return 1 - Math.pow(10, -x); } // slider x in [0.05, 4] -> v/c up to 0.9999

  /* ============== Light clock ============== */
  (function lightclock() {
    var svg = $('lc-svg'); if (!svg) return;
    var W = 800, H = 360, L = 180, TOP = 70, BOT = TOP + L;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var t1 = el('text', { x: 120, y: 40, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); t1.textContent = 'Clock at rest (next to you)';
    var t2 = el('text', { x: 520, y: 40, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); t2.textContent = 'Identical clock flying past';
    el('line', { x1: 90, y1: TOP, x2: 150, y2: TOP, 'class': 's-line', 'stroke-width': 4 }, svg); el('line', { x1: 90, y1: BOT, x2: 150, y2: BOT, 'class': 's-line', 'stroke-width': 4 }, svg);
    var p1 = el('circle', { cx: 120, r: 6, 'class': 's-sun' }, svg);
    el('line', { x1: 250, y1: 20, x2: 250, y2: 340, 'class': 's-line', opacity: 0.4 }, svg);
    var mt = el('line', { y1: TOP, y2: TOP, 'class': 's-line', 'stroke-width': 4 }, svg), mb = el('line', { y1: BOT, y2: BOT, 'class': 's-line', 'stroke-width': 4 }, svg);
    var path = el('path', { 'class': 's-hl', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg), p2 = el('circle', { r: 6, 'class': 's-sun' }, svg);
    var c1 = el('text', { x: 120, y: 300, 'text-anchor': 'middle', 'font-size': 14, 'class': 's-label' }, svg), c2 = el('text', { x: 520, y: 300, 'text-anchor': 'middle', 'font-size': 14, 'class': 's-label' }, svg);
    var vIn = $('lc-v'), T = 0;
    function render() {
      var b = vFromSlider(parseFloat(vIn.value)), g = gamma(b);
      var ph = (T % 1), up = ph < 0.5, y1 = up ? BOT - (ph / 0.5) * L : TOP + ((ph - 0.5) / 0.5) * L;
      p1.setAttribute('cy', y1.toFixed(1));
      var ph2 = (T / g) % 1, span = 260;
      // moving clock: horizontal drift proportional to b over one of ITS ticks, wrapped in the panel
      var dxTick = Math.min(span, b * L * 2 / Math.sqrt(1 - Math.min(0.9999, b) * Math.min(0.9999, b)) * 0.25);
      var x0 = 290, xp = x0 + (ph2) * dxTick;
      mt.setAttribute('x1', xp - 30); mt.setAttribute('x2', xp + 30); mb.setAttribute('x1', xp - 30); mb.setAttribute('x2', xp + 30);
      var up2 = ph2 < 0.5, y2 = up2 ? BOT - (ph2 / 0.5) * L : TOP + ((ph2 - 0.5) / 0.5) * L;
      p2.setAttribute('cx', xp); p2.setAttribute('cy', y2);
      path.setAttribute('d', 'M ' + x0 + ' ' + BOT + ' L ' + (x0 + dxTick / 2) + ' ' + TOP + ' L ' + (x0 + dxTick) + ' ' + BOT);
      c1.textContent = 'Ticks: ' + Math.floor(T); c2.textContent = 'Ticks: ' + Math.floor(T / g);
      $('lc-v-out').textContent = (b < 0.999 ? fmt(b * 100, 1) : fmt(b * 100, 3)) + '% of light speed';
      vIn.setAttribute('aria-valuetext', $('lc-v-out').textContent);
      setText('lc-r-g', fmt(g, g < 10 ? 3 : 1));
      setText('lc-r-rate', 'Moving clock runs at ' + fmt(100 / g, 1) + '% of the rate');
      setText('lc-r-len', fmt(1 / g, 3) + ' × its rest length');
      setText('lc-r-year', '1 year aboard = ' + fmt(g, g < 10 ? 2 : 1) + ' years for you');
      setText('lc-note', 'In the moving clock, light must travel the longer diagonal path, but it still moves at exactly the speed of light. So each tick takes longer, as measured by you. The travelers see nothing unusual about their own clock; they see yours running slow.');
    }
    vIn.addEventListener('input', render);
    player($('lc-play'), function (dt) { T += dt * 1.2; render(); }, 'Run the clocks');
    $('lc-reset').addEventListener('click', function () { T = 0; render(); });
    render();
  })();

  /* ============== Twin paradox spacetime diagram ============== */
  (function twins() {
    var svg = $('tw-svg'); if (!svg) return;
    var W = 800, H = 420, X0 = 80, Y0 = 390, SC;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var g = el('g', {}, svg);
    var vIn = $('tw-v'), dIn = $('tw-d');
    function render() {
      while (g.firstChild) g.removeChild(g.firstChild);
      var b = parseFloat(vIn.value), d = parseFloat(dIn.value), ga = gamma(b), Te = 2 * d / b, Tt = Te / ga;
      SC = Math.min(340 / Te, 600 / Math.max(d, 1));
      function P(x, t) { return [X0 + x * SC, Y0 - t * SC]; }
      el('line', { x1: X0, y1: Y0, x2: X0 + 680, y2: Y0, 'class': 's-line' }, g);
      el('line', { x1: X0, y1: Y0, x2: X0, y2: 20, 'class': 's-line' }, g);
      var xl = el('text', { x: X0 + 600, y: Y0 + 20, 'font-size': 12, 'class': 's-label-muted', 'text-anchor': 'end' }, g); xl.textContent = 'distance from Earth (light-years) →';
      var tl = el('text', { x: X0 - 10, y: 30, 'font-size': 12, 'class': 's-label-muted', 'text-anchor': 'end' }, g); tl.textContent = 'time ↑';
      var lL = Math.min(Te * 0.95, 640 / SC), lc = P(lL, lL);
      el('line', { x1: X0, y1: Y0, x2: lc[0], y2: lc[1], 'class': 's-ray', 'stroke-width': 1, 'stroke-dasharray': '4 4' }, g);
      var ll = el('text', { x: lc[0] + 4, y: lc[1], 'font-size': 11, 'class': 's-label-muted' }, g); ll.textContent = 'path of light (45°)';
      var e1 = P(0, 0), e2 = P(0, Te), tp = P(d, Te / 2);
      el('line', { x1: e1[0], y1: e1[1], x2: e2[0], y2: e2[1], 'class': 's-earth', stroke: 'currentColor', 'stroke-width': 4 }, g).setAttribute('class', 's-line');
      el('polyline', { points: e1.join(',') + ' ' + tp.join(',') + ' ' + e2.join(','), 'class': 's-hl', 'stroke-width': 3, fill: 'none' }, g);
      el('circle', { cx: tp[0], cy: tp[1], r: 5, 'class': 's-hl-fill' }, g);
      var a = el('text', { x: e2[0] + 8, y: e2[1] - 6, 'font-size': 12, 'class': 's-label' }, g); a.textContent = 'Reunion';
      var b1 = el('text', { x: tp[0] + 8, y: tp[1], 'font-size': 12, 'class': 's-label' }, g); b1.textContent = 'Turnaround';
      var s1 = el('text', { x: e1[0] + 8, y: (e1[1] + e2[1]) / 2, 'font-size': 12, 'class': 's-label' }, g); s1.textContent = 'Twin on Earth';
      $('tw-v-out').textContent = fmt(b * 100, 1) + '% of c';
      $('tw-d-out').textContent = fmt(d, 1) + ' light-years';
      vIn.setAttribute('aria-valuetext', $('tw-v-out').textContent); dIn.setAttribute('aria-valuetext', $('tw-d-out').textContent);
      setText('tw-r-earth', fmt(Te, 1) + ' years');
      setText('tw-r-trav', fmt(Tt, 1) + ' years');
      setText('tw-r-diff', fmt(Te - Tt, 1) + ' years younger');
      setText('tw-note', 'The traveling twin\u2019s path through spacetime is bent at the turnaround, where she fires her engines and changes direction. The two twins are not in symmetric situations: only the traveler accelerates, and her bent path through spacetime has less elapsed time along it. In spacetime, the straight path between two events is the one that takes the longest time.');
    }
    [vIn, dIn].forEach(function (i) { i.addEventListener('input', render); });
    render();
  })();

  /* ============== Gravitational lensing ============== */
  (function lensing() {
    var svg = $('gl-svg'); if (!svg) return;
    var W = 800, H = 380, CX = 400, CY = 190;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 80, 31);
    var ring = el('circle', { cx: CX, cy: CY, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    var src = el('circle', { cy: CY, r: 5, 'class': 's-line', 'stroke-width': 1.5 }, svg);
    var img1 = el('ellipse', { cy: CY, 'class': 's-star' }, svg), img2 = el('ellipse', { cy: CY, 'class': 's-star' }, svg);
    var lens = el('circle', { cx: CX, cy: CY, r: 10, 'class': 's-hl-fill' }, svg);
    var cap = el('text', { x: 16, y: 26, 'font-size': 12, 'class': 's-label-muted' }, svg); cap.textContent = 'Orange: foreground mass (lens). Outline: where the background star really is. White: where we see it.';
    var bIn = $('gl-b'), mIn = $('gl-m');
    function render() {
      var beta = parseFloat(bIn.value), m = parseFloat(mIn.value), thE = 60 * Math.sqrt(m);
      ring.setAttribute('r', thE);
      var root = Math.sqrt(beta * beta + 4 * thE * thE), tp = (beta + root) / 2, tm = (beta - root) / 2;
      var mu = function (t) { var u = Math.abs(beta) / thE; return u < 1e-3 ? 50 : (u * u + 2) / (2 * u * Math.sqrt(u * u + 4)) + (t > 0 ? 0.5 : -0.5); };
      src.setAttribute('cx', CX + beta);
      [[img1, tp], [img2, tm]].forEach(function (p) {
        var t = p[1], ab = Math.max(0.2, Math.abs(mu(t)));
        p[0].setAttribute('cx', CX + t); p[0].setAttribute('rx', Math.max(2, 3 * Math.sqrt(ab) * 0.6)); p[0].setAttribute('ry', Math.min(thE * 1.2, 3 * Math.sqrt(ab) * 1.6));
      });
      var aligned = Math.abs(beta) < 2;
      ring.setAttribute('class', aligned ? 's-hl' : 's-line'); ring.setAttribute('stroke-width', aligned ? 5 : 1);
      img1.setAttribute('opacity', aligned ? 0 : 1); img2.setAttribute('opacity', aligned ? 0 : 1);
      var u = Math.abs(beta) / thE, A = u < 1e-3 ? Infinity : (u * u + 2) / (u * Math.sqrt(u * u + 4));
      $('gl-b-out').textContent = fmt(beta, 0) + ' units from alignment';
      $('gl-m-out').textContent = fmt(m, 2) + ' × (relative)';
      bIn.setAttribute('aria-valuetext', $('gl-b-out').textContent); mIn.setAttribute('aria-valuetext', 'lens mass ' + fmt(m, 2));
      setText('gl-r-n', aligned ? 'An Einstein ring' : 'Two images, on opposite sides of the lens');
      setText('gl-r-mag', isFinite(A) ? fmt(A, 2) + ' × brighter' : 'very large');
      setText('gl-note', 'Mass curves spacetime, so light from the background star bends as it passes the lens. We see the star shifted outward, split into two images, and brightened. With perfect alignment the light arrives from all around the lens as a ring. A heavier lens makes a larger ring. Astronomers use this to weigh galaxy clusters and even to find planets.');
    }
    [bIn, mIn].forEach(function (i) { i.addEventListener('input', render); });
    player($('gl-play'), function (dt) { var v = parseFloat(bIn.value) + dt * 40; if (v > 200) v = -200; bIn.value = String(v); render(); }, 'Move the star');
    render();
  })();

  /* ============== Black hole explorer ============== */
  (function blackhole() {
    var svg = $('bh-svg'); if (!svg) return;
    var W = 800, H = 340, CX = 200, CY = 170;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 60, 41);
    var ps = el('circle', { cx: CX, cy: CY, 'class': 's-hl', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);
    var hz = el('circle', { cx: CX, cy: CY, fill: '#000', stroke: '#8FA3CC', 'stroke-width': 1.5 }, svg);
    var probe = el('circle', { cy: CY, r: 5, 'class': 's-earth' }, svg);
    var pt = el('text', { 'font-size': 11, 'class': 's-label', 'text-anchor': 'middle' }, svg); pt.textContent = 'clock';
    var cmp = el('text', { x: 430, y: 60, 'font-size': 13, 'class': 's-label' }, svg), cmp2 = el('text', { x: 430, y: 84, 'font-size': 12, 'class': 's-label-muted' }, svg);
    var mIn = $('bh-m'), rIn = $('bh-r');
    var CMP = [[0.02, 'a golf ball\u2019s width (Earth-mass black hole: about 9 mm)'], [6, 'a small town (about 6 km across)'], [60, 'a large city'], [1.2e7, 'the Sun (the Sagittarius A* horizon is about 17 solar radii)'], [4e10, 'our solar system out to Pluto']];
    function render() {
      var Mlog = parseFloat(mIn.value), M = Math.pow(10, Mlog), Rs = 2.95 * M; // km
      var r = parseFloat(rIn.value), f = Math.sqrt(1 - 1 / r);
      var rp = 60; hz.setAttribute('r', rp); ps.setAttribute('r', rp * 1.5);
      var x = CX + rp * Math.min(r, 5.5); probe.setAttribute('cx', x); pt.setAttribute('x', x); pt.setAttribute('y', CY - 12);
      var d = Rs * 2, best = CMP[0]; CMP.forEach(function (c) { if (Math.abs(Math.log10(d / c[0])) < Math.abs(Math.log10(d / best[0]))) best = c; });
      cmp.textContent = 'Event horizon diameter: ' + (d < 0.001 ? fmt(d * 1e6, 1) + ' mm' : d < 1 ? fmt(d * 1000, 1) + ' m' : d < 1e6 ? fmt(d, 1) + ' km' : sci(d, 2) + ' km');
      cmp2.textContent = 'Comparable to ' + best[1];
      $('bh-m-out').textContent = M < 1e3 ? fmt(M, 1) + ' solar masses' : sci(M, 1) + ' solar masses';
      $('bh-r-out').textContent = fmt(r, 2) + ' × horizon radius';
      mIn.setAttribute('aria-valuetext', $('bh-m-out').textContent); rIn.setAttribute('aria-valuetext', $('bh-r-out').textContent);
      setText('bh-r-rs', Rs < 0.001 ? fmt(Rs * 1e6, 1) + ' mm' : Rs < 1 ? fmt(Rs * 1000, 1) + ' m' : Rs < 1e6 ? fmt(Rs, 1) + ' km' : sci(Rs, 2) + ' km');
      setText('bh-r-f', fmt(f * 100, 1) + '% of the rate far away');
      setText('bh-r-hour', '1 hour there = ' + (1 / f < 100 ? fmt(1 / f, 2) + ' hours' : fmt(1 / f, 0) + ' hours') + ' far away');
      setText('bh-note', 'The event horizon radius is about 3 km for every solar mass. Clocks near it run slow compared with clocks far away, and the effect grows without limit as a clock approaches the horizon. The dashed circle at 1.5 horizon radii is the photon sphere, where light itself can orbit.');
    }
    [mIn, rIn].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-bh]'), function (b) { b.addEventListener('click', function () { mIn.value = b.getAttribute('data-bh'); render(); }); });
    render();
  })();

  /* ============== Activity: time dilation trip calculator ============== */
  (function trip() {
    var v = $('td2-v'); if (!v) return;
    var d = $('td2-d');
    function render() {
      var b = parseFloat(v.value) / 100, D = parseFloat(d.value);
      if (!(b > 0 && b < 1 && D > 0)) { setText('td2-note', 'Enter a speed between 0 and 100% of light speed and a positive distance.'); return; }
      var g = gamma(b), Te = D / b, Tt = Te / g;
      setText('td2-r-g', fmt(g, g < 10 ? 4 : 2)); setText('td2-r-e', fmt(Te, 2) + ' years'); setText('td2-r-t', fmt(Tt, 2) + ' years'); setText('td2-r-l', fmt(D / g, 2) + ' light-years');
      setText('td2-note', 'For the travelers, the distance itself is contracted to ' + fmt(D / g, 2) + ' light-years, which is why the trip takes them only ' + fmt(Tt, 2) + ' years. Both views agree on what happens when they arrive.');
    }
    [v, d].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-td2]'), function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-td2').split(','); v.value = p[0]; d.value = p[1]; render(); }); });
    render();
  })();

  /* ============== Activity: GPS without relativity ============== */
  (function gps() {
    var dIn = $('gps-d'); if (!dIn) return;
    function render() {
      var days = parseFloat(dIn.value);
      if (!(days >= 0)) return;
      var us = 38 * days, km = us * 1e-6 * 299792.458;
      setText('gps-r-us', fmt(us, 0) + ' microseconds'); setText('gps-r-km', fmt(km, 1) + ' km');
      setText('gps-note', 'Satellite clocks run fast by about 45 microseconds a day because gravity is weaker up there (general relativity) and slow by about 7 because they move fast (special relativity): a net 38 microseconds a day. Light travels about 300 meters in a microsecond, so ignoring relativity would put your position off by about ' + fmt(km, 1) + ' km after ' + fmt(days, 0) + ' day' + (days === 1 ? '' : 's') + '.');
    }
    dIn.addEventListener('input', render); render();
  })();

  /* ============== Activity: Lorentz factor drill ============== */
  (function drill() {
    var q = $('lf-q'); if (!q) return;
    var opts = $('lf-opts'), fb = $('lf-fb'), next = $('lf-next'), st = $('lf-streak');
    var P = window.PHYS106, KEY = 'phys106-lf-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur;
    var V = [[0.1, '1.005'], [0.5, '1.15'], [0.6, '1.25'], [0.8, '1.67'], [0.866, '2.0'], [0.9, '2.29'], [0.95, '3.2'], [0.99, '7.1'], [0.995, '10.0'], [0.9999, '70.7']];
    function newQ() {
      cur = V[Math.floor(Math.random() * V.length)];
      var hours = [1, 2, 5, 10][Math.floor(Math.random() * 4)];
      cur.h = hours;
      q.textContent = 'A spaceship travels at ' + fmt(cur[0] * 100, 2) + '% of the speed of light. While ' + hours + ' hour' + (hours > 1 ? 's pass' : ' passes') + ' on the ship\u2019s clock, how much time passes on Earth?';
      var others = P.shuffle(V.filter(function (x) { return x !== cur; })).slice(0, 3);
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      P.shuffle([cur].concat(others)).forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.textContent = fmt(hours * parseFloat(x[1]), 2) + ' hours'; b.addEventListener('click', function () { answer(x, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(x, b) {
      var ok = x === cur;
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (y) { y.disabled = true; if (y.textContent === fmt(cur.h * parseFloat(cur[1]), 2) + ' hours') y.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct. ' : '✗ Not quite. ') + 'γ = 1 ÷ √(1 − ' + cur[0] + '²) ≈ ' + cur[1] + ', so ' + cur.h + ' h × ' + cur[1] + ' ≈ ' + fmt(cur.h * parseFloat(cur[1]), 2) + ' hours on Earth.';
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
