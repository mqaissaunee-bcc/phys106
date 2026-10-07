/* Module 6: transit light curves, radial-velocity wobble, comet orbit and tails,
   impact energy calculator, habitable zone calculator, transit-depth drill. */
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

  /* ============== Transit light curve ============== */
  (function transit() {
    var svg = $('tr-svg'); if (!svg) return;
    var W = 800, H = 420, SX = 200, SY = 130, SR = 100, X0 = 420, X1 = 770, Y0 = 60, Y1 = 380;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, 400, 260, 40, 3);
    var defs = el('defs', {}, svg), rg = el('radialGradient', { id: 'tr-limb' }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff6d8' }, rg); el('stop', { offset: '0.8', 'stop-color': '#f5b53d' }, rg); el('stop', { offset: '1', 'stop-color': '#c47a1d' }, rg);
    el('circle', { cx: SX, cy: SY, r: SR, fill: 'url(#tr-limb)' }, svg);
    var planet = el('circle', { cy: SY + 20, fill: '#0b1330', stroke: '#8FA3CC', 'stroke-width': 1 }, svg);
    var cap = el('text', { x: 16, y: 262, 'font-size': 12, 'class': 's-label-muted' }, svg); cap.textContent = 'Star and planet as a distant telescope would see them';
    el('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, 'class': 's-sky', opacity: 0.4 }, svg);
    var ylab = el('text', { x: X0, y: Y0 - 12, 'font-size': 12, 'class': 's-label' }, svg); ylab.textContent = 'Measured brightness of the star over time';
    var curve = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg), dot = el('circle', { r: 5, 'class': 's-star' }, svg);
    var lab100 = el('text', { x: X1 - 4, y: Y0 + 30, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); lab100.textContent = '100%';
    var labMin = el('text', { 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg);
    var rp = $('tr-rp'), rs = $('tr-rs'), ph = $('tr-ph');
    function depthAt(x, k) { // planet center offset x (in stellar radii), planet radius ratio k -> fractional flux blocked (uniform disk)
      var d = Math.abs(x) + 1e-9; if (d >= 1 + k) return 0; if (d <= 1 - k) return k * k;
      var k2 = k * k, a1 = k2 * Math.acos((d * d + k2 - 1) / (2 * d * k)), a2 = Math.acos((d * d + 1 - k2) / (2 * d)), a3 = 0.5 * Math.sqrt(Math.max(0, (-d + k + 1) * (d + k - 1) * (d - k + 1) * (d + k + 1)));
      return (a1 + a2 - a3) / Math.PI;
    }
    function render() {
      var Re = parseFloat(rp.value), Rs = parseFloat(rs.value), f = parseFloat(ph.value);
      var k = Re / (109.1 * Rs), depth = k * k;
      var scale = Math.max(depth * 1.3, 0.0004), pts = '';
      for (var i = 0; i <= 200; i++) { var x = -2.2 + i / 200 * 4.4, fl = 1 - depthAt(x * (1 + k) / 1.8, k); pts += (i ? ' L ' : 'M ') + (X0 + i / 200 * (X1 - X0)).toFixed(1) + ' ' + (Y0 + 30 + (1 - fl) / scale * (Y1 - Y0 - 60)).toFixed(1); }
      curve.setAttribute('d', pts);
      var xs = -2.2 + f * 4.4, pc = xs * (1 + k) / 1.8, fl = 1 - depthAt(pc, k);
      dot.setAttribute('cx', X0 + f * (X1 - X0)); dot.setAttribute('cy', Y0 + 30 + (1 - fl) / scale * (Y1 - Y0 - 60));
      var drawK = Math.max(k, 0.012);
      planet.setAttribute('r', (drawK * SR).toFixed(1)); planet.setAttribute('cx', (SX + pc * SR).toFixed(1));
      labMin.setAttribute('x', X1 - 4); labMin.setAttribute('y', Y0 + 30 + depth / scale * (Y1 - Y0 - 60) + 14); labMin.textContent = fmt(100 - depth * 100, depth < 0.001 ? 4 : 2) + '%';
      $('tr-rp-out').textContent = fmt(Re, 1) + ' × Earth';
      $('tr-rs-out').textContent = fmt(Rs, 2) + ' × Sun';
      $('tr-ph-out').textContent = Math.round(f * 100) + '%';
      rp.setAttribute('aria-valuetext', fmt(Re, 1) + ' Earth radii'); rs.setAttribute('aria-valuetext', fmt(Rs, 2) + ' solar radii');
      setText('tr-r-depth', fmt(depth * 100, depth < 0.001 ? 4 : 3) + '% (' + fmt(depth * 1e6, 0) + ' ppm)');
      setText('tr-r-now', fmt(fl * 100, 4) + '%');
      setText('tr-r-kind', Re < 1.6 ? 'Rocky, Earth-like size' : Re < 4 ? 'Super-Earth or mini-Neptune' : Re < 8 ? 'Neptune-size' : 'Jupiter-size gas giant');
      setText('tr-note', 'The dip in brightness equals the fraction of the star\u2019s disk the planet covers: (planet radius ÷ star radius)². A Jupiter-size planet dims a Sun-like star by about 1%; an Earth-size planet by less than 0.01%, which is why finding Earth-size planets took space telescopes. (The real curve also dims slightly toward the star\u2019s edge; this model ignores that.)');
    }
    [rp, rs, ph].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-tr]'), function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-tr').split(','); rp.value = v[0]; rs.value = v[1]; render(); }); });
    player($('tr-play'), function (dt) { ph.value = String((parseFloat(ph.value) + dt * 0.18) % 1); render(); }, 'Play transit');
    render();
  })();

  /* ============== Radial velocity ============== */
  (function rv() {
    var svg = $('rv-svg'); if (!svg) return;
    var W = 800, H = 400, CX = 190, CY = 200, X0 = 390, X1 = 770, YM = 200;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, 380, H, 50, 23);
    var porb = el('circle', { cx: CX, cy: CY, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg);
    var sorb = el('circle', { cx: CX, cy: CY, 'class': 's-hl', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
    el('circle', { cx: CX, cy: CY, r: 2.5, 'class': 's-label-muted' }, svg);
    var star = el('circle', { r: 26, 'class': 's-sun' }, svg), pl = el('circle', { r: 7, 'class': 's-earth' }, svg);
    var eye = el('text', { x: CX, y: 390, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg); eye.textContent = '↓ toward Earth';
    var c1 = el('text', { x: 16, y: 24, 'font-size': 12, 'class': 's-label-muted' }, svg); c1.textContent = 'Star and planet orbit their shared center (wobble exaggerated)';
    el('line', { x1: X0, y1: YM, x2: X1, y2: YM, 'class': 's-line' }, svg);
    var t1 = el('text', { x: X0, y: 44, 'font-size': 12, 'class': 's-label' }, svg); t1.textContent = 'Star\u2019s velocity toward (+) or away from (−) us';
    var tb = el('text', { x: X0, y: 70, 'font-size': 11, 'class': 's-label-muted' }, svg); tb.textContent = 'moving toward us: blueshift';
    var trd = el('text', { x: X0, y: 350, 'font-size': 11, 'class': 's-label-muted' }, svg); trd.textContent = 'moving away: redshift';
    var curve = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg), dot = el('circle', { r: 5, 'class': 's-star' }, svg);
    var mIn = $('rv-m'), aIn = $('rv-a'), t = 0;
    function render() {
      var Mj = Math.pow(10, parseFloat(mIn.value)), a = Math.pow(10, parseFloat(aIn.value));
      var K = 28.4 * Mj / Math.sqrt(a), P = Math.pow(a, 1.5);
      var rpx = 50 + Math.log10(a / 0.02) / Math.log10(10 / 0.02) * 110, wob = Math.min(22, 4 + Math.log10(1 + K) * 7);
      porb.setAttribute('r', rpx); sorb.setAttribute('r', wob);
      var th = TAU * t;
      pl.setAttribute('cx', CX + rpx * Math.cos(th)); pl.setAttribute('cy', CY + rpx * Math.sin(th));
      star.setAttribute('cx', CX - wob * Math.cos(th)); star.setAttribute('cy', CY - wob * Math.sin(th));
      var d = ''; for (var i = 0; i <= 200; i++) { var ph = i / 200 * 2; d += (i ? ' L ' : 'M ') + (X0 + i / 200 * (X1 - X0)).toFixed(1) + ' ' + (YM - 110 * Math.cos(TAU * ph)).toFixed(1); }
      curve.setAttribute('d', d);
      var fx = (t % 2) / 2; dot.setAttribute('cx', X0 + fx * (X1 - X0)); dot.setAttribute('cy', YM - 110 * Math.cos(TAU * t));
      $('rv-m-out').textContent = Mj >= 0.1 ? fmt(Mj, 2) + ' × Jupiter' : fmt(Mj * 317.8, 2) + ' × Earth';
      $('rv-a-out').textContent = fmt(a, a < 1 ? 3 : 2) + ' AU';
      mIn.setAttribute('aria-valuetext', $('rv-m-out').textContent); aIn.setAttribute('aria-valuetext', $('rv-a-out').textContent);
      setText('rv-r-k', K >= 1 ? fmt(K, 1) + ' m/s' : fmt(K * 100, 1) + ' cm/s');
      setText('rv-r-p', P < 1 ? fmt(P * 365.25, 1) + ' days' : fmt(P, 1) + ' years');
      setText('rv-r-det', K > 3 ? 'Yes, with a good spectrograph' : K > 0.3 ? 'Only with today\u2019s best instruments' : 'No: too small to detect yet');
      setText('rv-note', 'The planet tugs its star around a small circle. As the star moves toward and away from us, its spectral lines shift back and forth (the Doppler effect). The size of the shift gives the planet\u2019s mass; the time for one cycle gives its orbital period. Massive planets close to their stars cause the biggest wobbles, which is why hot Jupiters were found first.');
    }
    [mIn, aIn].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-rv]'), function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-rv').split(','); mIn.value = Math.log10(+v[0]); aIn.value = Math.log10(+v[1]); render(); }); });
    player($('rv-play'), function (dt) { t = (t + dt * 0.35) % 2; render(); }, 'Play');
    render();
  })();

  /* ============== Comet orbit and tails ============== */
  (function comet() {
    var svg = $('com-svg'); if (!svg) return;
    var W = 800, H = 380, e = 0.9, A = 300, B = A * Math.sqrt(1 - e * e), CX = 390, CY = 190;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 70, 29);
    var fx = CX + A * e;
    var d = ''; for (var i = 0; i <= 120; i++) { var E = i / 120 * TAU; d += (i ? ' L ' : 'M ') + (CX + A * Math.cos(E)).toFixed(1) + ' ' + (CY + B * Math.sin(E)).toFixed(1); }
    el('path', { d: d, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    el('circle', { cx: fx, cy: CY, r: 12, 'class': 's-sun' }, svg);
    [['Earth', A / 17.8], ['Jupiter', A * 5.2 / 17.8]].forEach(function (p, i) { el('circle', { cx: fx, cy: CY, r: p[1], 'class': 's-line', 'stroke-width': 0.8, opacity: 0.6 }, svg); var t = el('text', { x: fx, y: CY - p[1] - 4, 'text-anchor': 'middle', 'font-size': 10, 'class': 's-label-muted' }, svg); t.textContent = p[0] + '\u2019s orbit'; });
    var dust = el('path', { 'class': 's-hl-fill', opacity: 0.35 }, svg), ion = el('line', { 'class': 's-line', 'stroke-width': 3, opacity: 0.9 }, svg);
    var coma = el('circle', { 'class': 's-moonlit', opacity: 0.35 }, svg), nuc = el('circle', { r: 3, 'class': 's-moonlit' }, svg);
    var tIn = $('com-t');
    function solveE(M) { var E = Math.PI; for (var i = 0; i < 40; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
    function render() {
      var f = parseFloat(tIn.value), E = solveE(TAU * f);
      var x = CX + A * Math.cos(E), y = CY + B * Math.sin(E);
      var rAU = (Math.hypot(x - fx, y - CY) / A) * 17.8; // scale semi-major axis to Halley-like 17.8 AU
      nuc.setAttribute('cx', x); nuc.setAttribute('cy', y);
      var act = Math.max(0, Math.min(1, (5 - rAU) / 4.5));
      coma.setAttribute('cx', x); coma.setAttribute('cy', y); coma.setAttribute('r', (3 + act * 12).toFixed(1));
      var ux = (x - fx), uy = (y - CY), L = Math.hypot(ux, uy); ux /= L; uy /= L;
      var tl = act * 170;
      ion.setAttribute('x1', x); ion.setAttribute('y1', y); ion.setAttribute('x2', x + ux * tl); ion.setAttribute('y2', y + uy * tl); ion.setAttribute('opacity', act > 0.02 ? 0.9 : 0);
      // dust tail curves behind the orbital motion
      var vx = -A * Math.sin(E), vy = B * Math.cos(E), vl = Math.hypot(vx, vy); vx /= vl; vy /= vl;
      var cx2 = x + (ux * 0.8 - vx * 0.5) * tl, cy2 = y + (uy * 0.8 - vy * 0.5) * tl, w = act * 14;
      dust.setAttribute('d', act > 0.02 ? 'M ' + (x - uy * 2) + ' ' + (y + ux * 2) + ' Q ' + (x + ux * tl * 0.6 - vx * tl * 0.1) + ' ' + (y + uy * tl * 0.6 - vy * tl * 0.1) + ' ' + (cx2 + w) + ' ' + (cy2 + w) + ' L ' + (cx2 - w) + ' ' + (cy2 - w) + ' Q ' + (x + ux * tl * 0.5) + ' ' + (y + uy * tl * 0.5) + ' ' + (x + uy * 2) + ' ' + (y - ux * 2) + ' Z' : '');
      $('com-t-out').textContent = fmt(f * 76, 1) + ' years into a 76-year orbit';
      tIn.setAttribute('aria-valuetext', fmt(f * 76, 1) + ' years; ' + fmt(rAU, 1) + ' AU from the Sun');
      setText('com-r-d', fmt(rAU, 1) + ' AU');
      setText('com-r-state', act > 0.5 ? 'Bright coma and two long tails' : act > 0.02 ? 'Coma forming, short tails' : 'Frozen, inactive nucleus');
      setText('com-note', act > 0.02 ? 'Near the Sun, ices vaporize, releasing gas and dust. The straight ion (plasma) tail is blown directly away from the Sun by the solar wind; the curved dust tail is pushed more gently by sunlight and lags behind the comet\u2019s motion. Notice that on the way out, the tails lead the comet.' : 'Far from the Sun, a comet is just a frozen nucleus a few kilometers across, too faint to see: a dirty snowball with no coma or tail.');
    }
    tIn.addEventListener('input', render);
    player($('com-play'), function (dt) { tIn.value = String((parseFloat(tIn.value) + dt * 0.04) % 1); render(); }, 'Play orbit');
    render();
  })();

  /* ============== Activity: impact energy ============== */
  (function impact() {
    var dIn = $('im-d'); if (!dIn) return;
    var vIn = $('im-v'), rho = $('im-rho'), pre = $('im-pre');
    var PRE = { chel: [18, 19, 3300], tung: [60, 20, 2000], meteor: [50, 13, 7800], chic: [10000, 20, 3000] };
    var COMP = [[0.015, 'the Hiroshima atomic bomb (0.015 Mt)'], [0.5, 'the 2013 Chelyabinsk airburst (about 0.5 Mt)'], [12, 'the 1908 Tunguska blast (about 10–15 Mt)'], [50, 'the largest nuclear bomb ever tested (50 Mt)'], [1e8, 'the dinosaur-killing Chicxulub impact (about 100 million Mt)']];
    function render() {
      var d = parseFloat(dIn.value), v = parseFloat(vIn.value) * 1000, p = parseFloat(rho.value);
      if (!(d > 0 && v > 0 && p > 0)) { setText('im-note', 'Enter positive values.'); return; }
      var m = 4 / 3 * Math.PI * Math.pow(d / 2, 3) * p, E = 0.5 * m * v * v, Mt = E / 4.184e15;
      var near = COMP[0]; COMP.forEach(function (c) { if (Math.abs(Math.log10(Mt / c[0])) < Math.abs(Math.log10(Mt / near[0]))) near = c; });
      setText('im-r-m', sci(m, 2) + ' kg'); setText('im-r-e', sci(E, 2) + ' J');
      setText('im-r-mt', Mt < 1 ? fmt(Mt * 1000, 1) + ' kilotons of TNT' : sci(Mt, 2) + ' megatons of TNT');
      var cr = fmt(d * 20 / 1000, d < 700 ? 2 : 0) + ' km wide (rough)';
      setText('im-r-c', d < 25 ? 'Likely explodes in the air (airburst)' : d < 100 && p < 5000 ? 'A stony body this size usually explodes in the air; if it reached the ground, about ' + cr : 'About ' + cr);
      setText('im-note', 'Closest comparison: ' + near[1] + '. Energy grows with the cube of the diameter and the square of the speed, so size matters enormously.');
    }
    [dIn, vIn, rho].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () { var p = PRE[pre.value]; if (!p) return; dIn.value = p[0]; vIn.value = p[1]; rho.value = p[2]; render(); });
    render();
  })();

  /* ============== Activity: habitable zone ============== */
  (function hz() {
    var L = $('hz-l'); if (!L) return;
    var a = $('hz-a'), pre = $('hz-pre');
    var PRE = { sun: [1, 1], trap: [0.00055, 0.029], prox: [0.0015, 0.0485], kep: [0.0024, 0.43], tau: [0.52, 0.54] };
    function render() {
      var l = parseFloat(L.value), d = parseFloat(a.value);
      if (!(l > 0 && d > 0)) { setText('hz-note', 'Enter positive values.'); return; }
      var inner = 0.95 * Math.sqrt(l), outer = 1.67 * Math.sqrt(l);
      setText('hz-r-in', fmt(inner, inner < 0.1 ? 3 : 2) + ' AU'); setText('hz-r-out', fmt(outer, outer < 0.1 ? 3 : 2) + ' AU');
      setText('hz-r-in-p', d < inner ? 'Too hot: inside the zone' : d > outer ? 'Too cold: beyond the zone' : 'In the habitable zone');
      setText('hz-note', 'The habitable zone is where a planet with an Earth-like atmosphere could have liquid surface water. It scales with the square root of the star\u2019s luminosity. Being in the zone does not guarantee water or life: the planet also needs the right size and atmosphere. (Edges use one common estimate, 0.95 and 1.67 AU for the Sun; published values vary.)');
    }
    [L, a].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () { var p = PRE[pre.value]; if (!p) return; L.value = p[0]; a.value = p[1]; render(); });
    render();
  })();

  /* ============== Activity: transit-depth drill ============== */
  (function drill() {
    var q = $('td-q'); if (!q) return;
    var opts = $('td-opts'), fb = $('td-fb'), next = $('td-next'), st = $('td-streak');
    var P = window.PHYS106, KEY = 'phys106-td-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur;
    var SIZES = [1, 2, 3, 4, 6, 11];
    function newQ() {
      var Re = SIZES[Math.floor(Math.random() * SIZES.length)], depth = Math.pow(Re / 109.1, 2);
      cur = Re;
      q.textContent = 'A Sun-like star dims by ' + fmt(depth * 100, depth < 0.001 ? 4 : 3) + '% (' + fmt(depth * 1e6, 0) + ' parts per million) every time its planet transits. About how big is the planet?';
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      var choices = P.shuffle(SIZES.filter(function (s) { return s !== Re; })).slice(0, 3).concat([Re]);
      P.shuffle(choices).forEach(function (s) { var b = document.createElement('button'); b.type = 'button'; b.textContent = s + ' × Earth\u2019s radius'; b.addEventListener('click', function () { answer(s, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(s, b) {
      var ok = s === cur;
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x) { x.disabled = true; if (x.textContent.indexOf(cur + ' ×') === 0) x.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct. ' : '✗ It is ' + cur + ' × Earth. ') + 'Planet radius = star radius × √(depth) = 109 Earth radii × √' + fmt(Math.pow(cur / 109.1, 2), 6) + ' ≈ ' + cur + ' Earth radii.';
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
