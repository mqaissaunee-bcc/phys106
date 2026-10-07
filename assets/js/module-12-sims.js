/* Module 12: galaxy shapes, Cepheid period-luminosity, Hubble's law plotter, expanding-universe model,
   Hubble distance calculator, quasar power calculator, galaxy classification drill. */
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
  // draw a galaxy of a given type into group g at (cx,cy)
  function drawGalaxy(g, cx, cy, type, R, seed) {
    var s = seed || 3; function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    var i, r, a;
    if (type[0] === 'E') {
      var q = 1 - (+type.slice(1)) / 10;
      for (i = 0; i < 500; i++) { r = R * Math.pow(rnd(), 1.6); a = rnd() * TAU; el('circle', { cx: cx + r * Math.cos(a), cy: cy + r * q * Math.sin(a), r: 0.9 + rnd(), fill: '#ffd9a0', opacity: 0.35 + 0.5 * (1 - r / R) }, g); }
      return;
    }
    if (type === 'Irr') {
      var cl = []; for (i = 0; i < 6; i++) cl.push([(rnd() - 0.5) * R * 0.9, (rnd() - 0.5) * R * 0.5, 0.15 + rnd() * 0.3]);
      for (i = 0; i < 380; i++) { var c = cl[i % 6], rr2 = Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * R * c[2] * 0.5, aa = rnd() * TAU; el('circle', { cx: cx + c[0] + rr2 * Math.cos(aa), cy: cy + c[1] + rr2 * 0.7 * Math.sin(aa), r: 0.8 + rnd() * 1.4, fill: rnd() < 0.45 ? '#9ec5ff' : '#ffe6c0', opacity: 0.4 + rnd() * 0.5 }, g); }
      return;
    }
    var bar = type[1] === 'B', stage = type.slice(-1), wind = { a: 0.9, b: 0.6, c: 0.35, 0: 0 }[stage], bulge = { a: 0.35, b: 0.22, c: 0.12, 0: 0.4 }[stage];
    for (i = 0; i < 260; i++) { r = R * bulge * Math.pow(rnd(), 1.4); a = rnd() * TAU; el('circle', { cx: cx + r * Math.cos(a) * (bar ? 1.8 : 1), cy: cy + r * 0.45 * Math.sin(a), r: 1, fill: '#ffd9a0', opacity: 0.8 }, g); }
    if (type === 'S0') { for (i = 0; i < 300; i++) { r = R * Math.sqrt(rnd()); a = rnd() * TAU; el('circle', { cx: cx + r * Math.cos(a), cy: cy + r * 0.45 * Math.sin(a), r: 0.8, fill: '#ffe6c0', opacity: 0.35 }, g); } return; }
    for (var arm = 0; arm < 2; arm++) for (i = 0; i < 260; i++) {
      var t = rnd(), rr = R * (bar ? 0.25 : bulge) + t * R * 0.8, th = arm * Math.PI + t * (1.5 + 3.5 * wind) * Math.PI / 1.5 + (rnd() - 0.5) * 0.35;
      el('circle', { cx: cx + rr * Math.cos(th), cy: cy + rr * 0.45 * Math.sin(th), r: 0.8 + rnd() * 1.2, fill: rnd() < 0.55 ? '#9ec5ff' : '#ffe6c0', opacity: 0.45 + rnd() * 0.45 }, g);
    }
  }
  window.PHYS106_drawGalaxy = drawGalaxy;

  /* ============== Galaxy types ============== */
  (function types() {
    var svg = $('gx-svg'); if (!svg) return;
    var W = 800, H = 340;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var g = el('g', {}, svg);
    var T = [['E0', 'Elliptical (round)', 'Old, reddish stars; almost no cool gas or new star formation; stars orbit in all directions.'], ['E4', 'Elliptical (moderately flattened)', 'Shape depends partly on our viewing angle. Common in the centers of galaxy clusters.'], ['E7', 'Elliptical (very flattened)', 'The most flattened ellipticals; still no disk or arms.'], ['S0', 'Lenticular', 'A disk and bulge like a spiral, but no spiral arms and little gas: a transition between spirals and ellipticals.'], ['Sa', 'Spiral (tightly wound)', 'Large bulge, tightly wound arms, less gas.'], ['Sb', 'Spiral', 'Medium bulge and arms. Andromeda is an Sb.'], ['Sc', 'Spiral (loosely wound)', 'Small bulge, open arms, lots of gas and young blue stars.'], ['SBb', 'Barred spiral', 'Arms start at the ends of a central bar of stars. The Milky Way is a barred spiral.'], ['Irr', 'Irregular', 'No clear shape; often small, gas-rich, and forming stars, like the Magellanic Clouds.']];
    var sIn = $('gx-t');
    function render() {
      var t = T[+sIn.value]; while (g.firstChild) g.removeChild(g.firstChild);
      drawGalaxy(g, 260, 170, t[0], 150, 7);
      var tt = el('text', { x: 520, y: 150, 'font-size': 34, 'font-weight': 700, 'class': 's-label' }, g); tt.textContent = t[0];
      var tn = el('text', { x: 520, y: 182, 'font-size': 15, 'class': 's-label' }, g); tn.textContent = t[1];
      $('gx-t-out').textContent = t[0]; sIn.setAttribute('aria-valuetext', t[0] + ', ' + t[1]);
      setText('gx-r-type', t[1]); setText('gx-note', t[2] + ' (Illustration.)');
    }
    sIn.addEventListener('input', render); render();
  })();

  /* ============== Cepheid period-luminosity ============== */
  (function cepheid() {
    var svg = $('cp-svg'); if (!svg) return;
    var W = 800, H = 340, X0 = 380, X1 = 770, Y0 = 290, Y1 = 60;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, 360, H, 40, 9);
    var star = el('circle', { cx: 170, cy: 170, fill: '#ffe08a' }, svg);
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg); el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line' }, svg);
    var lab = el('text', { x: X0, y: Y1 - 14, 'font-size': 12, 'class': 's-label' }, svg); lab.textContent = 'Brightness over 3 cycles';
    var xl = el('text', { x: (X0 + X1) / 2, y: Y0 + 18, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); xl.textContent = 'time →';
    var curve = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg), dot = el('circle', { r: 5, 'class': 's-star' }, svg);
    var pIn = $('cp-p'), dIn = $('cp-d'), t = 0;
    function shape(ph) { ph = ph % 1; return ph < 0.2 ? ph / 0.2 : 1 - (ph - 0.2) / 0.8; }
    function render() {
      var P = parseFloat(pIn.value), L = Math.pow(10, 2.43 + 1.15 * Math.log10(P)), d = Math.pow(10, parseFloat(dIn.value));
      var dd = ''; for (var i = 0; i <= 300; i++) { var ph = i / 100; dd += (i ? ' L ' : 'M ') + (X0 + i / 300 * (X1 - X0)).toFixed(1) + ' ' + (Y0 - 30 - shape(ph) * (Y0 - Y1 - 60)).toFixed(1); }
      curve.setAttribute('d', dd);
      var ph2 = (t / Math.max(1, P) * 3) % 3; dot.setAttribute('cx', X0 + ph2 / 3 * (X1 - X0)); dot.setAttribute('cy', Y0 - 30 - shape(ph2) * (Y0 - Y1 - 60));
      star.setAttribute('r', 30 + 12 * shape(ph2) + 6 * Math.log10(P));
      $('cp-p-out').textContent = fmt(P, 1) + ' days'; $('cp-d-out').textContent = d < 1e6 ? fmt(d, 0) + ' light-years' : fmt(d / 1e6, 2) + ' million ly';
      pIn.setAttribute('aria-valuetext', $('cp-p-out').textContent); dIn.setAttribute('aria-valuetext', $('cp-d-out').textContent);
      var b = L * 3.828e26 / (4 * Math.PI * Math.pow(d * 9.461e15, 2));
      setText('cp-r-l', fmt(L, 0) + ' × Sun'); setText('cp-r-b', sci(b, 2) + ' W/m²');
      setText('cp-note', 'Henrietta Leavitt discovered in 1912 that Cepheids with longer periods are more luminous. So timing a Cepheid\u2019s pulsation tells you its luminosity; measuring how bright it looks then gives its distance through the inverse-square law. (Approximate relation for classical Cepheids.)');
    }
    [pIn, dIn].forEach(function (i) { i.addEventListener('input', render); });
    $('cp-hubble').addEventListener('click', function () { pIn.value = '31.4'; dIn.value = String(Math.log10(2.5e6)); render(); });
    player($('cp-play'), function (dt) { t += dt * 6; render(); }, 'Pulsate');
    render();
  })();

  /* ============== Hubble's law plotter ============== */
  (function hubble() {
    var svg = $('hb-svg'); if (!svg) return;
    var W = 800, H = 380, X0 = 80, X1 = 760, Y0 = 330, Y1 = 40, DMAX = 400, VMAX = 30000;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg); el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line' }, svg);
    function xd(d) { return X0 + d / DMAX * (X1 - X0); } function yv(v) { return Y0 - v / VMAX * (Y0 - Y1); }
    [0, 100, 200, 300, 400].forEach(function (d) { var t = el('text', { x: xd(d), y: Y0 + 16, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = d; });
    [10000, 20000, 30000].forEach(function (v) { var t = el('text', { x: X0 - 6, y: yv(v) + 4, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = fmt(v, 0); });
    var xl = el('text', { x: (X0 + X1) / 2, y: Y0 + 34, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); xl.textContent = 'distance (megaparsecs; 1 Mpc = 3.26 million light-years)';
    var yl = el('text', { x: 20, y: 185, 'font-size': 12, 'class': 's-label-muted', transform: 'rotate(-90 20 185)', 'text-anchor': 'middle' }, svg); yl.textContent = 'recession velocity (km/s)';
    var s = 11; function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    var PTS = []; for (var i = 0; i < 26; i++) { var d = 10 + rnd() * 380, v = 70 * d * (1 + (rnd() - 0.5) * 0.2) + (rnd() - 0.5) * 800; PTS.push([d, v]); el('circle', { cx: xd(d), cy: yv(v), r: 4, 'class': 's-star' }, svg); }
    var line = el('line', { x1: xd(0), y1: yv(0), 'class': 's-hl', 'stroke-width': 2.5 }, svg);
    var hIn = $('hb-h');
    function render() {
      var H0 = parseFloat(hIn.value), dm = Math.min(DMAX, VMAX / H0);
      line.setAttribute('x2', xd(dm)); line.setAttribute('y2', yv(H0 * dm));
      var ss = 0, best = 0, bs = 0; PTS.forEach(function (p) { var r = p[1] - H0 * p[0]; ss += r * r; best += p[0] * p[1]; bs += p[0] * p[0]; });
      var fit = best / bs, rms = Math.sqrt(ss / PTS.length);
      $('hb-h-out').textContent = fmt(H0, 1) + ' km/s/Mpc'; hIn.setAttribute('aria-valuetext', $('hb-h-out').textContent);
      setText('hb-r-fit', rms < 1500 ? 'Good fit (typical miss ' + fmt(rms, 0) + ' km/s)' : 'Poor fit (typical miss ' + fmt(rms, 0) + ' km/s)');
      setText('hb-r-age', fmt(977.8 / H0, 1) + ' billion years');
      setText('hb-note', 'Each dot is a galaxy with a measured distance and recession velocity. Adjust the slope of the line until it runs through the data: that slope is the Hubble constant. Its inverse, 1/H₀, estimates how long the universe has been expanding. (Best fit for these simulated galaxies: about ' + fmt(fit, 0) + ' km/s/Mpc.)');
    }
    hIn.addEventListener('input', render); render();
  })();

  /* ============== Expanding universe ============== */
  (function expand() {
    var svg = $('ex-svg'); if (!svg) return;
    var W = 800, H = 360, CX = 400, CY = 180;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var g = el('g', {}, svg), lines = el('g', {}, svg);
    var s = 17; function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    var G = []; for (var i = 0; i < 14; i++) G.push([(rnd() - 0.5) * 300, (rnd() - 0.5) * 180]);
    G[0] = [0, 0];
    var aIn = $('ex-a'), home = $('ex-home');
    G.forEach(function (p, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = 'Galaxy ' + String.fromCharCode(65 + i); home.appendChild(o); });
    function render() {
      var a = parseFloat(aIn.value), h = +home.value; while (g.firstChild) g.removeChild(g.firstChild); while (lines.firstChild) lines.removeChild(lines.firstChild);
      var hx = CX, hy = CY, rows = [], K = 0.55;
      G.forEach(function (p, i) {
        var x = CX + (p[0] - G[h][0]) * a * K, y = CY + (p[1] - G[h][1]) * a * K;
        if (i !== h) { el('line', { x1: hx, y1: hy, x2: x, y2: y, 'class': 's-line', 'stroke-width': 0.8, opacity: 0.5 }, lines); var d0 = Math.hypot(p[0] - G[h][0], p[1] - G[h][1]); rows.push([String.fromCharCode(65 + i), d0 * a, d0]); }
        el('circle', { cx: x, cy: y, r: i === h ? 9 : 6, 'class': i === h ? 's-hl-fill' : 's-star' }, g);
        var t = el('text', { x: x + 9, y: y - 7, 'font-size': 11, 'class': 's-label-muted' }, g); t.textContent = String.fromCharCode(65 + i);
      });
      rows.sort(function (x, y) { return x[2] - y[2]; });
      $('ex-a-out').textContent = fmt(a, 2) + '× original size'; aIn.setAttribute('aria-valuetext', $('ex-a-out').textContent);
      var near = rows[0], far = rows[rows.length - 1];
      setText('ex-r-near', 'Galaxy ' + near[0] + ': moved ' + fmt(near[1] - near[2], 0) + ' units');
      setText('ex-r-far', 'Galaxy ' + far[0] + ': moved ' + fmt(far[1] - far[2], 0) + ' units');
      setText('ex-r-ratio', fmt(far[2] / near[2], 1) + '× farther, and moved ' + fmt((far[1] - far[2]) / Math.max(0.001, near[1] - near[2]), 1) + '× as far');
      setText('ex-note', 'The view stays centered on your home galaxy. Space stretches uniformly, so every distance grows by the same factor. A galaxy twice as far away moves twice as far in the same time: that is Hubble\u2019s law. Choose a different home galaxy: the pattern looks exactly the same from every galaxy. There is no center.');
    }
    [aIn, home].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    render();
  })();

  /* ============== Activity: Hubble's law calculator ============== */
  (function hcalc() {
    var v = $('hc-v'); if (!v) return;
    var H0 = $('hc-h');
    function render() {
      var V = parseFloat(v.value), h = parseFloat(H0.value); if (!(V > 0 && h > 0)) return;
      var d = V / h, z = V / 299792.458;
      setText('hc-r-d', fmt(d, 1) + ' Mpc (' + fmt(d * 3.26, 0) + ' million light-years)');
      setText('hc-r-z', fmt(z, 4)); setText('hc-r-lb', 'about ' + fmt(d * 3.26, 0) + ' million years');
      setText('hc-note', 'Distance = velocity ÷ H₀. The light-travel (lookback) time is roughly the distance in light-years for nearby galaxies. For redshifts above about 0.1, astronomers must use full cosmological models.' + (z > 0.1 ? ' This galaxy is far enough that the simple formula becomes approximate.' : ''));
    }
    [v, H0].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-hc]'), function (b) { b.addEventListener('click', function () { v.value = b.getAttribute('data-hc'); render(); }); });
    render();
  })();

  /* ============== Activity: quasar power ============== */
  (function quasar() {
    var L = $('qs-l'); if (!L) return;
    function render() {
      var l = parseFloat(L.value); if (!(l > 0)) return;
      var W = l * 3.828e26, mdot = W / (0.1 * 8.988e16) * 3.156e7 / 1.989e30;
      setText('qs-r-mw', fmt(l / 2.5e10, 0) + ' × the whole Milky Way');
      setText('qs-r-m', fmt(mdot, 1) + ' solar masses per year');
      setText('qs-note', 'Matter falling into a black hole can release about 10% of its mass-energy (E = mc²) as it heats up in the accretion disk, over 10 times more efficient than fusion. Even so, a bright quasar must swallow several Suns\u2019 worth of gas every year.');
    }
    L.addEventListener('input', render);
    Array.prototype.forEach.call(document.querySelectorAll('[data-qs]'), function (b) { b.addEventListener('click', function () { L.value = b.getAttribute('data-qs'); render(); }); });
    render();
  })();

  /* ============== Activity: classify the galaxy ============== */
  (function drill() {
    var q = $('cg-q'); if (!q) return;
    var opts = $('cg-opts'), fb = $('cg-fb'), next = $('cg-next'), st = $('cg-streak');
    var P = window.PHYS106, KEY = 'phys106-cg-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur, order = [], ix = 0;
    var C = ['Spiral', 'Barred spiral', 'Elliptical', 'Lenticular', 'Irregular'];
    var S = [['A flat disk with two graceful arms winding out from a round central bulge, dotted with pink star-forming regions.', 0], ['A smooth, featureless ball of old, reddish stars with no gas or dust lanes.', 2], ['Spiral arms that begin at the two ends of a straight bar of stars across the center.', 1], ['A small, patchy cloud of stars and glowing gas with no definite shape.', 3 + 1], ['A disk and bulge, but no spiral arms and very little gas.', 3], ['A giant, egg-shaped swarm of a trillion old stars at the center of a galaxy cluster.', 2], ['The Large Magellanic Cloud, a small satellite of the Milky Way.', 4], ['The Milky Way, as it would look from far outside.', 1], ['The Andromeda Galaxy (M31).', 0], ['A galaxy whose stars orbit in random directions, with almost no young blue stars.', 2]];
    function newQ() {
      if (ix >= order.length) { order = P.shuffle(S.map(function (_, i) { return i; })); ix = 0; }
      cur = S[order[ix++]]; q.textContent = 'What type of galaxy is this? ' + cur[0];
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      C.forEach(function (c, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.addEventListener('click', function () { answer(i, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(i, b) {
      var ok = i === cur[1];
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x, k) { x.disabled = true; if (k === cur[1]) x.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct.' : '✗ The answer is: ' + C[cur[1]] + '.');
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
