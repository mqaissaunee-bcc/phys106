/* Module 9: journey into the Sun, parallax, H-R diagram, cluster turnoff ages,
   brightness-distance calculator, main-sequence lifetime calculator, H-R region drill. */
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
  function starRGB(T) { var t = T / 100, r, g, b; r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332); g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755); b = t >= 66 ? 255 : (t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305.0); function c(v) { return Math.max(0, Math.min(255, Math.round(v))); } return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')'; }

  /* ============== Journey into the Sun ============== */
  (function sun() {
    var svg = $('sun-svg'); if (!svg) return;
    var W = 800, H = 360, CX = 60, CY = 330, R = 300;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var LAY = [[1.5, 'corona', '#6f7fb0'], [1.03, 'chromosphere', '#c0392b'], [1.0, 'convection zone', '#e67e22'], [0.7, 'radiation zone', '#f39c12'], [0.25, 'core', '#fff3b0']];
    LAY.forEach(function (l) { var r = Math.min(l[0], 1.35) * R; el('path', { d: 'M ' + CX + ' ' + (CY - r) + ' A ' + r + ' ' + r + ' 0 0 1 ' + (CX + r) + ' ' + CY + ' L ' + CX + ' ' + CY + ' Z', fill: l[2], opacity: l[1] === 'corona' ? 0.25 : 0.85 }, svg); });
    [[0.12, 'core'], [0.47, 'radiation zone'], [0.85, 'convection zone']].forEach(function (p) { var a = -0.35, t = el('text', { x: CX + p[0] * R * Math.cos(a), y: CY + p[0] * R * Math.sin(a), 'font-size': 12, 'class': 's-badge-text' }, svg); t.textContent = p[1]; });
    var t2 = el('text', { x: CX + 1.08 * R, y: CY - 1.12 * R * 0.35, 'font-size': 12, 'class': 's-label' }, svg); t2.textContent = 'corona';
    var probe = el('line', { 'class': 's-hl', 'stroke-width': 3 }, svg), dot = el('circle', { r: 8, 'class': 's-star', stroke: '#000', 'stroke-width': 1.5 }, svg);
    var rIn = $('sun-r');
    function data(r) {
      if (r < 0.25) return ['Core', 15e6 - (15e6 - 7e6) * r / 0.25, 150 * Math.exp(-r * 8), 'Nuclear fusion turns hydrogen into helium.'];
      if (r < 0.7) return ['Radiation zone', 7e6 - (7e6 - 2e6) * (r - 0.25) / 0.45, 20 * Math.exp(-(r - 0.25) * 9), 'Energy creeps outward as photons, absorbed and re-emitted countless times.'];
      if (r < 1.0) return ['Convection zone', 2e6 * Math.pow(5800 / 2e6, (r - 0.7) / 0.3), 0.2 * Math.pow(2e-7 / 0.2, (r - 0.7) / 0.3), 'Hot gas rises, cools at the surface, and sinks, like boiling water.'];
      if (r < 1.005) return ['Photosphere (visible surface)', 5800, 2e-7, 'The layer we see; light escapes to space from here.'];
      if (r < 1.03) return ['Chromosphere', 1e4, 1e-11, 'A thin, warmer layer seen as a red rim during eclipses.'];
      return ['Corona', 1.5e6, 1e-15, 'The million-degree outer atmosphere, visible during total eclipses; it streams away as the solar wind.'];
    }
    function render() {
      var r = parseFloat(rIn.value), d = data(r), a = -0.9, x = CX + r * R * Math.cos(a), y = CY + r * R * Math.sin(a);
      probe.setAttribute('x1', CX); probe.setAttribute('y1', CY); probe.setAttribute('x2', x); probe.setAttribute('y2', y);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y);
      $('sun-r-out').textContent = fmt(r, 2) + ' × Sun\u2019s radius';
      rIn.setAttribute('aria-valuetext', fmt(r, 2) + ' solar radii, ' + d[0]);
      setText('sun-r-layer', d[0]); setText('sun-r-t', d[1] >= 1e6 ? fmt(d[1] / 1e6, 1) + ' million K' : fmt(d[1], 0) + ' K');
      setText('sun-r-d', d[2] > 0.01 ? fmt(d[2], 2) + ' g/cm³' : sci(d[2], 1) + ' g/cm³');
      setText('sun-note', d[3] + ' (Values are approximate.)');
    }
    rIn.addEventListener('input', render); render();
  })();

  /* ============== Parallax ============== */
  (function parallax() {
    var svg = $('par-svg'); if (!svg) return;
    var W = 800, H = 360, SX = 170, SY = 250;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var bg = starfield(svg, 800, 70, 30, 5);
    el('circle', { cx: SX, cy: SY, r: 10, 'class': 's-sun' }, svg);
    el('ellipse', { cx: SX, cy: SY, rx: 80, ry: 22, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    var e1 = el('circle', { cx: SX - 80, cy: SY, r: 6, 'class': 's-earth' }, svg), e2 = el('circle', { cx: SX + 80, cy: SY, r: 6, 'class': 's-earth' }, svg);
    var j1 = el('text', { x: SX - 80, y: SY + 24, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label' }, svg); j1.textContent = 'January';
    var j2 = el('text', { x: SX + 80, y: SY + 24, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label' }, svg); j2.textContent = 'July';
    var star = el('circle', { r: 6, 'class': 's-hl-fill' }, svg), l1 = el('line', { 'class': 's-line', 'stroke-width': 1 }, svg), l2 = el('line', { 'class': 's-line', 'stroke-width': 1 }, svg);
    var sk = el('text', { x: 16, y: 18, 'font-size': 11, 'class': 's-label-muted' }, svg); sk.textContent = 'distant background stars';
    var i1 = el('circle', { cy: 50, r: 5, 'class': 's-earth' }, svg), i2 = el('circle', { cy: 50, r: 5, 'class': 's-hl-fill' }, svg);
    el('rect', { x: 470, y: 110, width: 300, height: 200, 'class': 's-sky', opacity: 0.5 }, svg);
    var vt = el('text', { x: 620, y: 132, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg); vt.textContent = 'What your telescope sees';
    var v1 = el('circle', { cy: 210, r: 6, 'class': 's-earth' }, svg), v2 = el('circle', { cy: 210, r: 6, 'class': 's-hl-fill' }, svg);
    var vl = el('text', { x: 620, y: 290, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); vl.textContent = 'blue: January position · orange: July position';
    var dIn = $('par-d');
    function render() {
      var d = Math.pow(10, parseFloat(dIn.value)), p = 1 / d, sy = SY - 40 - Math.min(140, 30 * Math.log10(d * 10 + 1) + 10);
      star.setAttribute('cx', SX); star.setAttribute('cy', sy);
      l1.setAttribute('x1', SX - 80); l1.setAttribute('y1', SY); l2.setAttribute('x1', SX + 80); l2.setAttribute('y1', SY);
      var ex = function (x0) { var dx = SX - x0, dy = sy - SY, t = (50 - SY) / dy; return x0 + dx * t; };
      var a1 = ex(SX - 80), a2 = ex(SX + 80);
      l1.setAttribute('x2', a1); l1.setAttribute('y2', 50); l2.setAttribute('x2', a2); l2.setAttribute('y2', 50);
      i1.setAttribute('cx', a1); i2.setAttribute('cx', a2);
      var shift = Math.min(130, 120 * p / 0.8); v1.setAttribute('cx', 620 + shift); v2.setAttribute('cx', 620 - shift);
      $('par-d-out').textContent = fmt(d, d < 10 ? 2 : 0) + ' parsecs';
      dIn.setAttribute('aria-valuetext', fmt(d, 2) + ' parsecs, parallax ' + fmt(p, 3) + ' arcseconds');
      setText('par-r-p', p >= 0.01 ? fmt(p, 3) + '″' : sci(p, 2) + '″');
      setText('par-r-ly', fmt(d * 3.26, 1) + ' light-years');
      setText('par-r-meas', p > 0.02 ? 'Yes, from the ground or space' : p > 1e-5 ? 'Only with a space telescope like Gaia' : 'Too small, even for Gaia');
      setText('par-note', 'As Earth moves around the Sun, a nearby star seems to shift back and forth against far more distant stars. The parallax angle is half that shift. Distance in parsecs = 1 ÷ parallax in arcseconds, so the farther the star, the smaller the shift. Even the nearest star\u2019s parallax is under 1 arcsecond.');
    }
    dIn.addEventListener('input', render);
    Array.prototype.forEach.call(document.querySelectorAll('[data-par]'), function (b) { b.addEventListener('click', function () { dIn.value = Math.log10(+b.getAttribute('data-par')); render(); }); });
    render();
  })();

  /* ============== H-R diagram ============== */
  var STARS = [
    ['Sun', 1, 5772, 'G2 V', 'ms'], ['Sirius A', 25.4, 9940, 'A1 V', 'ms'], ['Sirius B', 0.056, 25000, 'white dwarf', 'wd'], ['Vega', 40, 9600, 'A0 V', 'ms'],
    ['Alpha Centauri A', 1.52, 5790, 'G2 V', 'ms'], ['Alpha Centauri B', 0.5, 5260, 'K1 V', 'ms'], ['Proxima Centauri', 0.0017, 3040, 'M5.5 V', 'ms'], ['Barnard\u2019s Star', 0.0035, 3130, 'M4 V', 'ms'],
    ['Altair', 10.6, 7700, 'A7 V', 'ms'], ['Procyon A', 6.9, 6530, 'F5 IV–V', 'ms'], ['Procyon B', 0.00049, 7740, 'white dwarf', 'wd'], ['40 Eridani B', 0.013, 16500, 'white dwarf', 'wd'],
    ['Arcturus', 170, 4290, 'K1.5 III', 'giant'], ['Aldebaran', 440, 3910, 'K5 III', 'giant'], ['Capella', 79, 4970, 'G8 III', 'giant'], ['Pollux', 33, 4590, 'K0 III', 'giant'],
    ['Betelgeuse', 100000, 3600, 'M2 Ia', 'super'], ['Rigel', 120000, 12100, 'B8 Ia', 'super'], ['Antares', 75000, 3570, 'M1.5 Iab', 'super'], ['Deneb', 200000, 8500, 'A2 Ia', 'super'],
    ['Polaris', 1260, 6015, 'F7 Ib', 'super'], ['Spica', 20500, 25300, 'B1 V', 'ms'], ['Regulus', 316, 12460, 'B8 IV', 'ms'], ['Epsilon Eridani', 0.34, 5084, 'K2 V', 'ms'],
    ['Tau Ceti', 0.52, 5344, 'G8 V', 'ms'], ['Bellatrix', 9200, 22000, 'B2 III', 'giant'], ['Canopus', 10700, 7350, 'A9 II', 'super'], ['Achernar', 3150, 15000, 'B6 V', 'ms']];
  function msLT(M) { var T = M < 1 ? 5772 * Math.pow(M, 0.35) : 5772 * Math.pow(M, 0.6), L = M < 10 ? Math.pow(M, 3.5) : 3162 * Math.pow(M / 10, 2.3); return [L, T]; }
  function msLatT(T) { var best = null; for (var M = 0.08; M < 80; M *= 1.02) { var lt = msLT(M); if (!best || Math.abs(Math.log(lt[1] / T)) < Math.abs(Math.log(best[1] / T))) best = lt; } return best[0]; }
  var X0 = 70, X1 = 760, Y0 = 380, Y1 = 30;
  function xT(T) { return X0 + (Math.log10(40000) - Math.log10(T)) / (Math.log10(40000) - Math.log10(2500)) * (X1 - X0); }
  function yL(L) { return Y0 - (Math.log10(L) + 4) / 10 * (Y0 - Y1); }
  function hrAxes(svg) {
    el('rect', { width: 800, height: 440, 'class': 's-space' }, svg);
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg); el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line' }, svg);
    [30000, 10000, 6000, 3000].forEach(function (T) { var t = el('text', { x: xT(T), y: Y0 + 16, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = fmt(T, 0) + ' K'; });
    [['O', 35000], ['B', 20000], ['A', 8500], ['F', 6700], ['G', 5700], ['K', 4500], ['M', 3200]].forEach(function (s) { var t = el('text', { x: xT(s[1]), y: Y0 + 31, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, 'class': 's-label' }, svg); t.textContent = s[0]; });
    [-4, -2, 0, 2, 4, 6].forEach(function (e) { var t = el('text', { x: X0 - 6, y: yL(Math.pow(10, e)) + 4, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = '10' + String(e).split('').map(function (c) { return SUP[c]; }).join(''); });
    var yl = el('text', { x: 16, y: 210, 'font-size': 12, 'class': 's-label-muted', transform: 'rotate(-90 16 210)', 'text-anchor': 'middle' }, svg); yl.textContent = 'luminosity (Sun = 1)';
    var xl = el('text', { x: 415, y: 432, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); xl.textContent = '← hotter      surface temperature and spectral type      cooler →';
    [0.01, 1, 100, 1000].forEach(function (R) {
      var d = ''; for (var T = 40000; T >= 2500; T *= 0.97) { var L = R * R * Math.pow(T / 5772, 4); if (L < 1e-4 || L > 1e6) continue; d += (d ? ' L ' : 'M ') + xT(T).toFixed(1) + ' ' + yL(L).toFixed(1); }
      el('path', { d: d, 'class': 's-line', 'stroke-width': 0.8, 'stroke-dasharray': '2 5', opacity: 0.6 }, svg);
      var Tl = R >= 100 ? 3000 : R === 1 ? 3300 : 30000, Ll = R * R * Math.pow(Tl / 5772, 4);
      if (Ll > 1e-4 && Ll < 1e6) { var t = el('text', { x: xT(Tl) + 3, y: yL(Ll) - 3, 'font-size': 10, 'class': 's-label-muted' }, svg); t.textContent = R + ' R☉'; }
    });
  }
  (function hr() {
    var svg = $('hr-svg'); if (!svg) return;
    hrAxes(svg);
    var ms = el('path', { 'class': 's-hl', 'stroke-width': 22, opacity: 0.12, 'stroke-linecap': 'round' }, svg);
    var d = ''; for (var M = 0.1; M <= 40; M *= 1.1) { var lt = msLT(M); d += (d ? ' L ' : 'M ') + xT(Math.min(lt[1], 40000)).toFixed(1) + ' ' + yL(Math.min(lt[0], 9e5)).toFixed(1); }
    ms.setAttribute('d', d);
    var dots = STARS.map(function (s, i) { var c = el('circle', { cx: xT(s[2]), cy: yL(s[1]), r: 5, fill: starRGB(s[2]), stroke: '#fff', 'stroke-width': 0.5 }, svg); return c; });
    var hl = el('circle', { r: 11, 'class': 's-hl', 'stroke-width': 2 }, svg), lab = el('text', { 'font-size': 12, 'font-weight': 700, 'class': 's-label' }, svg);
    var you = el('circle', { r: 7, 'class': 's-hl', 'stroke-width': 2.5, 'stroke-dasharray': '3 2' }, svg);
    var sel = $('hr-star'), T = $('hr-t'), L = $('hr-l');
    STARS.forEach(function (s, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = s[0]; sel.appendChild(o); });
    function region(Tv, Lv) { var Lms = msLatT(Tv); if (Lv < Lms / 30 && Tv > 5000) return 'White dwarf region'; if (Lv > Lms * 30) return Lv > 3e4 ? 'Supergiant region' : 'Giant region'; if (Lv < Lms / 30) return 'Below the main sequence'; return 'Main sequence'; }
    function render() {
      var s = STARS[+sel.value]; hl.setAttribute('cx', xT(s[2])); hl.setAttribute('cy', yL(s[1])); lab.setAttribute('x', xT(s[2]) + 14); lab.setAttribute('y', yL(s[1]) - 8); lab.textContent = s[0];
      setText('hr-r-star', s[0] + ': ' + s[3] + ', ' + fmt(s[2], 0) + ' K, ' + (s[1] < 0.01 ? sci(s[1], 1) : fmt(s[1], s[1] < 1 ? 3 : 0)) + ' × Sun\u2019s luminosity');
      setText('hr-r-rad', fmt(Math.sqrt(s[1]) / Math.pow(s[2] / 5772, 2), 3) + ' × Sun\u2019s radius');
      var Tv = Math.pow(10, parseFloat(T.value)), Lv = Math.pow(10, parseFloat(L.value));
      you.setAttribute('cx', xT(Tv)); you.setAttribute('cy', yL(Lv));
      $('hr-t-out').textContent = fmt(Tv, 0) + ' K'; $('hr-l-out').textContent = (Lv < 0.01 ? sci(Lv, 1) : fmt(Lv, Lv < 10 ? 2 : 0)) + ' × Sun';
      T.setAttribute('aria-valuetext', fmt(Tv, 0) + ' kelvin'); L.setAttribute('aria-valuetext', $('hr-l-out').textContent + ' luminosity');
      setText('hr-r-you', region(Tv, Lv) + '; radius ' + fmt(Math.sqrt(Lv) / Math.pow(Tv / 5772, 2), Math.sqrt(Lv) / Math.pow(Tv / 5772, 2) < 1 ? 3 : 1) + ' × Sun');
      setText('hr-note', 'Each dot is a real star, colored by its temperature. Most lie along the main sequence (shaded band). Giants and supergiants sit above it: cool but very luminous, so they must be huge. White dwarfs sit below: hot but dim, so they must be tiny. Dotted lines mark stars of equal radius.');
    }
    [sel, T, L].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    sel.value = '0'; render();
    window.PHYS106_HR = { region: region };
  })();

  /* ============== Cluster turnoff ============== */
  (function cluster() {
    var svg = $('cl-svg'); if (!svg) return;
    hrAxes(svg);
    var g = el('g', {}, svg), mk = el('line', { x1: X0, x2: X1, 'class': 's-hl', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' }, svg), mt = el('text', { x: X1 - 4, 'text-anchor': 'end', 'font-size': 12, 'class': 's-label' }, svg);
    var s = 3, MASS = []; function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 260; i++) MASS.push(Math.pow(10, -0.9 + rnd() * 2.2 * Math.pow(rnd(), 0.6)));
    var aIn = $('cl-a');
    function render() {
      while (g.firstChild) g.removeChild(g.firstChild);
      var age = Math.pow(10, parseFloat(aIn.value)), Mto = Math.pow(age / 10, -1 / 2.5), n = 0;
      MASS.forEach(function (M, k) {
        var life = 10 * Math.pow(M, -2.5), L, T;
        var lt = msLT(M);
        if (life > age) { L = lt[0]; T = lt[1]; n++; }
        else if (life > age * 0.8) { L = lt[0] * 20; T = 4500 - 600 * ((k % 7) / 7); }
        else return;
        el('circle', { cx: xT(Math.min(T, 39000)), cy: yL(Math.min(L, 9e5)), r: 3, fill: starRGB(T) }, g);
      });
      var Lto = msLT(Mto)[0]; mk.setAttribute('y1', yL(Lto)); mk.setAttribute('y2', yL(Lto)); mt.setAttribute('y', yL(Lto) - 6); mt.textContent = 'turnoff';
      $('cl-a-out').textContent = age < 1 ? fmt(age * 1000, 0) + ' million years' : fmt(age, 2) + ' billion years';
      aIn.setAttribute('aria-valuetext', $('cl-a-out').textContent);
      setText('cl-r-m', fmt(Mto, 2) + ' × Sun\u2019s mass'); setText('cl-r-n', n + ' of ' + MASS.length);
      setText('cl-note', 'All stars in a cluster formed at about the same time. Massive stars use up their fuel first and leave the main sequence to become giants, so the main sequence gets "eaten away" from the top. The point where it ends, the main-sequence turnoff, tells the cluster\u2019s age.');
    }
    aIn.addEventListener('input', render);
    player($('cl-play'), function (dt) { var v = parseFloat(aIn.value) + dt * 0.25; if (v >= 1.14) { aIn.value = '1.14'; render(); return false; } aIn.value = String(v); render(); }, 'Age the cluster');
    render();
  })();

  /* ============== Activity: brightness and distance ============== */
  (function bd() {
    var L = $('bd-l'); if (!L) return;
    var d = $('bd-d'), pre = $('bd-pre');
    var PRE = { sun: [1, 4.848e-6], sir: [25.4, 2.64], alp: [1.52, 1.34], bet: [100000, 168], rig: [120000, 264] };
    function render() {
      var l = parseFloat(L.value), dp = parseFloat(d.value); if (!(l > 0 && dp > 0)) return;
      var b = l * 3.828e26 / (4 * Math.PI * Math.pow(dp * 3.086e16, 2)), rel = b / (3.828e26 / (4 * Math.PI * Math.pow(10 * 3.086e16, 2)));
      setText('bd-r-b', sci(b, 2) + ' W/m²'); setText('bd-r-vs', sci(b / 1361, 2) + ' × sunlight at Earth');
      setText('bd-r-ly', fmt(dp * 3.26, dp < 1e-3 ? 6 : 1) + ' light-years');
      setText('bd-note', 'Apparent brightness = luminosity ÷ (4π × distance²). A star can look bright because it is powerful or because it is close; to tell which, you need its distance.');
    }
    [L, d].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () { var p = PRE[pre.value]; if (!p) return; L.value = p[0]; d.value = p[1]; render(); });
    render();
  })();

  /* ============== Activity: lifetime calculator ============== */
  (function life() {
    var m = $('lt-m'); if (!m) return;
    function render() {
      var M = parseFloat(m.value); if (!(M > 0)) return;
      var L = M < 10 ? Math.pow(M, 3.5) : 3162 * Math.pow(M / 10, 2.3), t = 10 * M / L;
      setText('lt-r-l', (L < 0.01 ? sci(L, 2) : fmt(L, L < 10 ? 2 : 0)) + ' × Sun');
      setText('lt-r-t', t > 1000 ? sci(t * 1e9, 1) + ' years' : t >= 1 ? fmt(t, 2) + ' billion years' : fmt(t * 1000, t < 0.01 ? 1 : 0) + ' million years');
      setText('lt-r-cmp', t > 13.8 ? 'Longer than the age of the universe: every star this small ever born is still shining' : t > 4.6 ? 'Longer than the Sun has existed so far' : 'Shorter than the age of the solar system');
      setText('lt-note', 'Lifetime ≈ 10 billion years × mass ÷ luminosity. A more massive star has more fuel, but it burns it far faster (luminosity ≈ mass³·⁵ for most stars, rising more slowly above about 10 solar masses), so it dies much sooner. (Approximate relations for main-sequence stars.)');
    }
    m.addEventListener('input', render); render();
  })();

  /* ============== Activity: H-R region drill ============== */
  (function drill() {
    var q = $('hrd-q'); if (!q) return;
    var opts = $('hrd-opts'), fb = $('hrd-fb'), next = $('hrd-next'), st = $('hrd-streak');
    var P = window.PHYS106, KEY = 'phys106-hrd-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur;
    var R = ['Main-sequence star', 'Giant', 'Supergiant', 'White dwarf'];
    var WHY = ['Its temperature and luminosity match hydrogen-burning stars like the Sun.', 'Cool yet luminous, so it must be large: about 10–100 times the Sun\u2019s radius.', 'Extremely luminous, hundreds of times the Sun\u2019s radius or more.', 'Hot but very dim, so it must be tiny, about Earth\u2019s size.'];
    function gen() {
      var k = Math.floor(Math.random() * 4), T, L;
      if (k === 0) { var M = Math.pow(10, -0.8 + Math.random() * 1.9), lt = msLT(M); T = lt[1]; L = lt[0]; }
      else if (k === 1) { T = 3800 + Math.random() * 1400; L = 30 + Math.random() * 600; }
      else if (k === 2) { T = 3500 + Math.random() * 20000; L = 3e4 + Math.random() * 2e5; }
      else { T = 8000 + Math.random() * 20000; L = Math.pow(10, -3.5 + Math.random() * 2); }
      return { k: k, T: Math.round(T / 100) * 100, L: L };
    }
    function newQ() {
      cur = gen();
      q.textContent = 'A star has a surface temperature of ' + fmt(cur.T, 0) + ' K and a luminosity of ' + (cur.L < 0.01 ? sci(cur.L, 1) : fmt(cur.L, cur.L < 10 ? 2 : 0)) + ' times the Sun\u2019s. Where does it sit on the H-R diagram?';
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      R.forEach(function (r, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = r; b.addEventListener('click', function () { answer(i, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(i, b) {
      var ok = i === cur.k;
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x, k) { x.disabled = true; if (k === cur.k) x.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      var Rr = Math.sqrt(cur.L) / Math.pow(cur.T / 5772, 2);
      fb.textContent = (ok ? '✓ Correct. ' : '✗ It\u2019s a ' + R[cur.k].toLowerCase() + '. ') + WHY[cur.k] + ' (Radius ≈ ' + (Rr < 0.1 ? fmt(Rr, 3) : fmt(Rr, 1)) + ' × Sun.)';
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
