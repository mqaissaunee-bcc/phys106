/* Module 10: Jeans collapse, life tracks on the H-R diagram, massive-star onion layers, binding energy curve,
   fuel lifetime calculator, element origins explorer, "what happens next?" drill. */
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

  /* ============== Jeans collapse ============== */
  (function jeans() {
    var svg = $('jn-svg'); if (!svg) return;
    var W = 800, H = 340, CX = 250, CY = 170;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 60, 12);
    var cloud = el('circle', { cx: CX, cy: CY, 'class': 's-hl-fill', opacity: 0.3 }, svg);
    var arrows = el('g', {}, svg);
    var lg = el('text', { x: 470, y: 90, 'font-size': 13, 'class': 's-label' }, svg); lg.textContent = 'Inward arrows: gravity';
    var lp = el('text', { x: 470, y: 114, 'font-size': 13, 'class': 's-label-muted' }, svg); lp.textContent = 'Outward arrows: gas pressure';
    var verdict = el('text', { x: 470, y: 180, 'font-size': 20, 'font-weight': 700, 'class': 's-label' }, svg);
    var tIn = $('jn-t'), nIn = $('jn-n'), mIn = $('jn-m');
    function arrow(x1, y1, x2, y2, cls, w) { el('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'class': cls, 'stroke-width': w }, arrows); }
    function render() {
      var T = parseFloat(tIn.value), n = Math.pow(10, parseFloat(nIn.value)), M = Math.pow(10, parseFloat(mIn.value));
      var MJ = 2 * Math.pow(T / 10, 1.5) * Math.pow(n / 1e4, -0.5), coll = M > MJ;
      var r = 40 + 30 * Math.log10(M + 1);
      cloud.setAttribute('r', r);
      while (arrows.firstChild) arrows.removeChild(arrows.firstChild);
      var gl = Math.min(60, 12 + 12 * Math.log10(M / 0.5 + 1)), pl = Math.min(60, 12 + 12 * Math.log10(MJ / 0.5 + 1));
      for (var k = 0; k < 8; k++) {
        var a = k / 8 * TAU, ca = Math.cos(a), sa = Math.sin(a);
        arrow(CX + (r + gl) * ca, CY + (r + gl) * sa, CX + r * ca, CY + r * sa, 's-hl', 3);
        var a2 = a + TAU / 16; arrow(CX + (r - pl) * Math.cos(a2), CY + (r - pl) * Math.sin(a2), CX + (r - 4) * Math.cos(a2), CY + (r - 4) * Math.sin(a2), 's-line', 2);
      }
      verdict.textContent = coll ? 'Gravity wins: collapse!' : 'Pressure wins: stable';
      $('jn-t-out').textContent = fmt(T, 0) + ' K'; $('jn-n-out').textContent = sci(n, 0) + ' per cm³'; $('jn-m-out').textContent = fmt(M, M < 10 ? 1 : 0) + ' solar masses';
      tIn.setAttribute('aria-valuetext', $('jn-t-out').textContent); nIn.setAttribute('aria-valuetext', $('jn-n-out').textContent); mIn.setAttribute('aria-valuetext', $('jn-m-out').textContent);
      setText('jn-r-mj', fmt(MJ, MJ < 10 ? 2 : 0) + ' solar masses');
      setText('jn-r-v', coll ? 'Collapses (mass is above the minimum)' : 'Stable (mass is below the minimum)');
      setText('jn-note', 'A cloud collapses only if its mass exceeds a minimum set by its temperature and density (the Jeans mass). Cold, dense clouds have small minimum masses, which is why stars form in the coldest, densest molecular clouds. Heating a cloud raises the minimum; compressing it lowers it.');
    }
    [tIn, nIn, mIn].forEach(function (i) { i.addEventListener('input', render); }); render();
  })();

  /* ============== Life tracks on the H-R diagram ============== */
  var X0 = 70, X1 = 760, Y0 = 380, Y1 = 30;
  function xT(lt) { return X0 + (Math.log10(40000) - lt) / (Math.log10(40000) - Math.log10(2500)) * (X1 - X0); }
  function yL(ll) { return Y0 - (ll + 4) / 10 * (Y0 - Y1); }
  (function tracks() {
    var svg = $('lt2-svg'); if (!svg) return;
    el('rect', { width: 800, height: 440, 'class': 's-space' }, svg);
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg); el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line' }, svg);
    [30000, 10000, 5000, 3000].forEach(function (T) { var t = el('text', { x: xT(Math.log10(T)), y: Y0 + 16, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = fmt(T, 0) + ' K'; });
    [-2, 0, 2, 4, 6].forEach(function (e) { var t = el('text', { x: X0 - 6, y: yL(e) + 4, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = '10' + String(e).split('').map(function (c) { return SUP[c]; }).join(''); });
    var xl = el('text', { x: 415, y: 420, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); xl.textContent = '← hotter      surface temperature      cooler →';
    var yl = el('text', { x: 16, y: 210, 'font-size': 12, 'class': 's-label-muted', transform: 'rotate(-90 16 210)', 'text-anchor': 'middle' }, svg); yl.textContent = 'luminosity (Sun = 1)';
    var ms = el('path', { 'class': 's-hl', 'stroke-width': 18, opacity: 0.1, 'stroke-linecap': 'round', d: 'M ' + xT(4.6) + ' ' + yL(5.5) + ' L ' + xT(3.76) + ' ' + yL(0) + ' L ' + xT(3.45) + ' ' + yL(-3) }, svg);
    var TR = {
      low: [[3.60, 1.0, 0, 'Protostar', 'Contracting and heating; not yet fusing hydrogen.'], [3.64, 0.2, 0.02, 'Protostar', 'Still contracting toward the main sequence.'], [3.755, -0.15, 0.05, 'Main sequence', 'Fusing hydrogen into helium in its core. The Sun is here now.'], [3.76, 0.25, 10, 'End of the main sequence', 'The core runs out of hydrogen.'], [3.70, 0.4, 10.7, 'Subgiant', 'Hydrogen fuses in a shell around an inert, shrinking helium core.'], [3.52, 3.3, 11.5, 'Red giant', 'The envelope has swollen to roughly 100–200 times the Sun\u2019s radius.'], [3.70, 1.7, 11.52, 'Helium core fusion', 'After the helium flash, helium fuses into carbon in the core.'], [3.47, 3.7, 11.62, 'Double-shell burning (AGB)', 'Helium and hydrogen fuse in shells; the star swells again and sheds its outer layers.'], [4.7, 3.5, 11.63, 'Planetary nebula', 'The exposed hot core lights up the ejected gas.'], [4.8, 1.0, 11.64, 'White dwarf', 'The bare, Earth-sized carbon core, cooling for billions of years.'], [4.2, -3, 25, 'Cooling white dwarf', 'Slowly fading; no fusion, only stored heat.']],
      high: [[3.9, 4.5, 0, 'Protostar', 'Massive protostars form fast, in about 100,000 years.'], [4.55, 4.7, 0.0001, 'Main sequence', 'Hydrogen fuses rapidly via the CNO cycle.'], [4.45, 5.0, 0.008, 'End of the main sequence', 'Core hydrogen exhausted after about 8 million years.'], [4.3, 5.1, 0.0081, 'Blue supergiant', 'Helium fusion begins in the core.'], [3.55, 5.2, 0.0088, 'Red supergiant', 'Swollen to hundreds of solar radii, like Betelgeuse.'], [3.8, 5.2, 0.0089, 'Yellow supergiant loop', 'Heavier elements fuse in the core and shells.'], [3.55, 5.25, 0.009, 'Red supergiant: final stages', 'Carbon, neon, oxygen, and silicon fuse in quick succession; an iron core builds.'], [3.55, 5.25, 0.0090001, 'Supernova!', 'The iron core collapses in under a second and the star explodes, leaving a neutron star or black hole.']]
    };
    var path = el('path', { 'class': 's-hl', 'stroke-width': 2, 'stroke-dasharray': '4 3', fill: 'none' }, svg);
    var done = el('path', { 'class': 's-hl', 'stroke-width': 3, fill: 'none' }, svg);
    var star = el('circle', { r: 8 }, svg), stl = el('text', { 'font-size': 13, 'font-weight': 700, 'class': 's-label' }, svg);
    var mSel = $('lt2-m'), pIn = $('lt2-p');
    function pt(p) { return xT(p[0]).toFixed(1) + ' ' + yL(p[1]).toFixed(1); }
    function render() {
      var tr = TR[mSel.value], f = parseFloat(pIn.value) * (tr.length - 1), i = Math.min(tr.length - 2, Math.floor(f)), u = f - i;
      path.setAttribute('d', 'M ' + tr.map(pt).join(' L '));
      var a = tr[i], b = tr[i + 1], lt = a[0] + (b[0] - a[0]) * u, ll = a[1] + (b[1] - a[1]) * u, age = a[2] + (b[2] - a[2]) * u;
      done.setAttribute('d', 'M ' + tr.slice(0, i + 1).map(pt).join(' L ') + ' L ' + xT(lt).toFixed(1) + ' ' + yL(ll).toFixed(1));
      var T = Math.pow(10, lt), cur = u < 0.9 ? a : b, last = mSel.value === 'high' && f >= tr.length - 1.5;
      star.setAttribute('cx', xT(lt)); star.setAttribute('cy', yL(ll)); star.setAttribute('fill', starRGB(Math.min(T, 40000))); star.setAttribute('r', last ? 16 : 8);
      stl.setAttribute('x', xT(lt) + 14); stl.setAttribute('y', yL(ll) - 10); stl.textContent = cur[3];
      $('lt2-p-out').textContent = Math.round(parseFloat(pIn.value) * 100) + '% through its life';
      pIn.setAttribute('aria-valuetext', cur[3]);
      setText('lt2-r-stage', cur[3]); setText('lt2-r-age', age < 0.001 ? fmt(age * 1e6, 0) + ' thousand years' : age < 1 ? fmt(age * 1000, 2) + ' million years' : fmt(age, 2) + ' billion years');
      setText('lt2-r-tl', fmt(T, 0) + ' K, ' + (Math.pow(10, ll) < 0.01 ? sci(Math.pow(10, ll), 1) : fmt(Math.pow(10, ll), Math.pow(10, ll) < 10 ? 2 : 0)) + ' × Sun');
      setText('lt2-note', cur[4] + ' (Track shapes and times are simplified.)');
    }
    [mSel, pIn].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    player($('lt2-play'), function (dt) { var v = parseFloat(pIn.value) + dt * 0.06; if (v >= 1) { pIn.value = '1'; render(); return false; } pIn.value = String(v); render(); }, 'Play a life');
    render();
  })();

  /* ============== Onion layers ============== */
  (function onion() {
    var svg = $('on-svg'); if (!svg) return;
    var W = 800, H = 360, CX = 200, CY = 180;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var g = el('g', {}, svg);
    var ST = [
      ['Hydrogen fusion', [['H', '#f39c12']], '7 million years', 'Hydrogen → helium in the core.'],
      ['Helium fusion', [['H', '#f39c12'], ['He', '#e67e22']], '500,000 years', 'Helium → carbon and oxygen in the core; hydrogen fuses in a shell.'],
      ['Carbon fusion', [['H', '#f39c12'], ['He', '#e67e22'], ['C', '#d35400']], '600 years', 'Carbon → neon, sodium, magnesium.'],
      ['Neon fusion', [['H', '#f39c12'], ['He', '#e67e22'], ['C', '#d35400'], ['Ne', '#c0392b']], '1 year', 'Neon → oxygen and magnesium.'],
      ['Oxygen fusion', [['H', '#f39c12'], ['He', '#e67e22'], ['C', '#d35400'], ['Ne', '#c0392b'], ['O', '#8e44ad']], '6 months', 'Oxygen → silicon, sulfur, and more.'],
      ['Silicon fusion', [['H', '#f39c12'], ['He', '#e67e22'], ['C', '#d35400'], ['Ne', '#c0392b'], ['O', '#8e44ad'], ['Si', '#2c3e50']], '1 day', 'Silicon → iron. Iron fusion releases no energy, so the iron core just grows.'],
      ['Iron core collapse', [['H', '#f39c12'], ['He', '#e67e22'], ['C', '#d35400'], ['Ne', '#c0392b'], ['O', '#8e44ad'], ['Si', '#2c3e50'], ['Fe', '#7f8c8d']], 'less than 1 second', 'The iron core, about the size of Earth, collapses to a neutron star about 20 km across, and the star explodes.']];
    var sIn = $('on-s');
    function render() {
      var k = +sIn.value, s = ST[k]; while (g.firstChild) g.removeChild(g.firstChild);
      var n = s[1].length;
      s[1].forEach(function (l, i) {
        var r = 150 * (1 - i / (n + 0.4));
        el('circle', { cx: CX, cy: CY, r: r, fill: l[1], stroke: '#0b1330', 'stroke-width': 1.5 }, g);
        var t = el('text', { x: CX, y: CY - r + 16, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#fff' }, g); t.textContent = l[0];
      });
      var ttl = el('text', { x: 420, y: 90, 'font-size': 22, 'font-weight': 700, 'class': 's-label' }, g); ttl.textContent = s[0];
      var d1 = el('text', { x: 420, y: 124, 'font-size': 15, 'class': 's-label' }, g); d1.textContent = (/^less/.test(s[2]) ? 'Lasts ' : 'Lasts about ') + s[2];
      $('on-s-out').textContent = s[0]; sIn.setAttribute('aria-valuetext', s[0] + ', lasts about ' + s[2]);
      setText('on-r-fuel', s[0].replace(' fusion', '').replace('Iron core collapse', 'none: iron cannot release energy'));
      setText('on-r-time', s[2]); setText('on-note', s[3] + ' Each new stage runs hotter and burns faster, because each fuel releases less energy and the star loses more energy to neutrinos. (Durations for a star of about 25 solar masses.)');
    }
    sIn.addEventListener('input', render); render();
  })();

  /* ============== Binding energy curve ============== */
  (function binding() {
    var svg = $('be-svg'); if (!svg) return;
    var W = 800, H = 360, X0b = 70, X1b = 760, Y0b = 320, Y1b = 30;
    var N = [[1, 0, 'H-1'], [2, 1.11, 'H-2'], [4, 7.07, 'He-4'], [6, 5.33, 'Li-6'], [12, 7.68, 'C-12'], [16, 7.98, 'O-16'], [20, 8.03, 'Ne-20'], [28, 8.45, 'Si-28'], [56, 8.79, 'Fe-56'], [62, 8.79, 'Ni-62'], [84, 8.72, 'Kr-84'], [107, 8.55, 'Ag-107'], [138, 8.39, 'Ba-138'], [197, 7.92, 'Au-197'], [208, 7.87, 'Pb-208'], [238, 7.57, 'U-238']];
    function xa(A) { return X0b + Math.sqrt(A) / Math.sqrt(240) * (X1b - X0b); }
    function yb(B) { return Y0b - B / 9.5 * (Y0b - Y1b); }
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    el('line', { x1: X0b, y1: Y0b, x2: X1b, y2: Y0b, 'class': 's-line' }, svg); el('line', { x1: X0b, y1: Y0b, x2: X0b, y2: Y1b, 'class': 's-line' }, svg);
    el('rect', { x: X0b, y: Y1b, width: xa(56) - X0b, height: Y0b - Y1b, 'class': 's-earth', opacity: 0.08 }, svg);
    el('rect', { x: xa(56), y: Y1b, width: X1b - xa(56), height: Y0b - Y1b, 'class': 's-hl-fill', opacity: 0.06 }, svg);
    var f1 = el('text', { x: xa(12), y: Y0b - 12, 'font-size': 12, 'class': 's-label' }, svg); f1.textContent = 'fusion releases energy →';
    var f2 = el('text', { x: xa(150), y: Y0b - 12, 'font-size': 12, 'class': 's-label', 'text-anchor': 'middle' }, svg); f2.textContent = '← fission releases energy';
    var yl = el('text', { x: 18, y: 175, 'font-size': 12, 'class': 's-label-muted', transform: 'rotate(-90 18 175)', 'text-anchor': 'middle' }, svg); yl.textContent = 'binding energy per nucleon (MeV)';
    var xl = el('text', { x: 415, y: 350, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); xl.textContent = 'mass number (protons + neutrons)';
    var d = ''; N.forEach(function (n, i) { d += (i ? ' L ' : 'M ') + xa(n[0]).toFixed(1) + ' ' + yb(n[1]).toFixed(1); });
    el('path', { d: d, 'class': 's-hl', 'stroke-width': 2 }, svg);
    N.forEach(function (n) { el('circle', { cx: xa(n[0]), cy: yb(n[1]), r: 3.5, 'class': 's-star' }, svg); var t = el('text', { x: xa(n[0]) + 5, y: yb(n[1]) + (n[0] < 10 ? 14 : -7), 'font-size': 10, 'class': 's-label-muted' }, svg); t.textContent = n[2]; });
    var hl = el('circle', { r: 9, 'class': 's-hl', 'stroke-width': 2 }, svg), sel = $('be-n');
    N.forEach(function (n, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = n[2]; sel.appendChild(o); });
    function render() {
      var n = N[+sel.value]; hl.setAttribute('cx', xa(n[0])); hl.setAttribute('cy', yb(n[1]));
      setText('be-r-b', fmt(n[1], 2) + ' MeV per nucleon');
      setText('be-r-f', n[0] < 56 ? 'Fusing it into heavier nuclei (toward iron) releases energy' : n[0] <= 62 ? 'Neither: it is at the peak, the most tightly bound' : 'Splitting it (fission) releases energy; fusing it absorbs energy');
      setText('be-note', 'The higher a nucleus on this curve, the more tightly its protons and neutrons are bound. Nuclear reactions release energy when they move toward the peak at iron. That is why fusion powers stars up to iron and no further, and why nuclear power plants split heavy uranium.');
    }
    sel.addEventListener('change', render); sel.value = '8'; render();
  })();

  /* ============== Activity: fuel lifetime calculator ============== */
  (function fuel() {
    var m = $('fl-m'); if (!m) return;
    var l = $('fl-l');
    function render() {
      var M = parseFloat(m.value), L = parseFloat(l.value); if (!(M > 0 && L > 0)) return;
      var E = 0.1 * M * 1.989e30 * 0.007 * 8.988e16, t = E / (L * 3.828e26) / 3.156e7;
      setText('fl-r-e', sci(E, 2) + ' J'); setText('fl-r-t', t >= 1e9 ? fmt(t / 1e9, 2) + ' billion years' : fmt(t / 1e6, 1) + ' million years');
      setText('fl-note', 'Only the core, about 10% of the star\u2019s mass, gets hot enough to fuse hydrogen, and fusion converts 0.7% of that mass into energy. Divide that energy by the luminosity and you get the main-sequence lifetime.');
    }
    [m, l].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-fl]'), function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-fl').split(','); m.value = v[0]; l.value = v[1]; render(); }); });
    render();
  })();

  /* ============== Activity: where did the elements come from? ============== */
  (function origins() {
    var sel = $('eo-el'); if (!sel) return;
    var E = [
      ['Hydrogen (H)', 'The Big Bang', 'Almost all hydrogen was made in the first few minutes of the universe. About 10% of your body\u2019s mass is hydrogen, including the hydrogen in your body\u2019s water.'],
      ['Helium (He)', 'The Big Bang, plus fusion in stars', 'About a quarter of the universe\u2019s helium mass came from the Big Bang; stars have added more since.'],
      ['Lithium (Li)', 'The Big Bang, cosmic rays, and some stars', 'A small amount was made in the Big Bang; cosmic rays splitting heavier nuclei and certain stars made more.'],
      ['Carbon (C)', 'Low-mass and massive stars', 'Helium fusion (three helium nuclei making one carbon) in red giants; blown into space in planetary nebulae and stellar winds. The backbone of all life.'],
      ['Nitrogen (N)', 'Low- and intermediate-mass stars', 'Made during the CNO cycle and shed by aging stars. It makes up 78% of Earth\u2019s air.'],
      ['Oxygen (O)', 'Massive stars', 'Made by helium capture in massive stars and released in supernovae. By mass, about 65% of your body is oxygen.'],
      ['Silicon (Si)', 'Massive stars and supernovae', 'Made by oxygen fusion in massive stars. The main ingredient in rocks, sand, and computer chips.'],
      ['Calcium (Ca)', 'Massive stars and supernovae', 'Made in the final fusion stages and explosions of massive stars. It builds your bones and teeth.'],
      ['Iron (Fe)', 'Supernovae, especially exploding white dwarfs', 'Silicon fusion builds iron cores in massive stars; white-dwarf supernovae (Module 11) make much of the universe\u2019s iron. The iron in your blood came from exploded stars.'],
      ['Copper (Cu)', 'Massive stars (slow neutron capture) and supernovae', 'Built up by neutrons captured one at a time in massive stars, plus explosive nucleosynthesis.'],
      ['Silver (Ag)', 'Neutron capture: aging giant stars and violent events', 'Made partly by slow neutron capture in aging stars and partly by rapid neutron capture in explosive events.'],
      ['Barium (Ba)', 'Slow neutron capture in aging low-mass stars', 'Built up gradually in AGB stars (Section 10.6) that capture neutrons over thousands of years.'],
      ['Gold (Au)', 'Neutron star mergers (and possibly rare supernovae)', 'Needs rapid neutron capture. The 2017 neutron star merger GW170817 showed such collisions make gold and platinum in large amounts.'],
      ['Platinum (Pt)', 'Neutron star mergers', 'Another rapid-neutron-capture element; the metal in catalytic converters was forged in cosmic collisions.'],
      ['Lead (Pb)', 'Slow neutron capture in aging stars, plus decay of heavier elements', 'Much of it comes from AGB stars; some is the end product of uranium and thorium decay.'],
      ['Uranium (U)', 'Neutron star mergers and rare supernovae', 'Made by rapid neutron capture. Its slow radioactive decay helps heat Earth\u2019s interior today.']];
    E.forEach(function (e, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = e[0]; sel.appendChild(o); });
    function render() { var e = E[+sel.value]; setText('eo-r-src', e[1]); setText('eo-note', e[2]); }
    sel.addEventListener('change', render); render();
  })();

  /* ============== Activity: what happens next? ============== */
  (function drill() {
    var q = $('nx-q'); if (!q) return;
    var opts = $('nx-opts'), fb = $('nx-fb'), next = $('nx-next'), st = $('nx-streak');
    var P = window.PHYS106, KEY = 'phys106-nx-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur;
    var LOW = ['Molecular cloud', 'Protostar', 'Main-sequence star', 'Red giant', 'Helium core fusion', 'Double-shell burning red giant', 'Planetary nebula', 'White dwarf'];
    var HIGH = ['Molecular cloud', 'Protostar', 'Main-sequence star', 'Supergiant', 'Iron core', 'Supernova', 'Neutron star or black hole'];
    var ALL = LOW.concat(HIGH).filter(function (x, i, a) { return a.indexOf(x) === i; });
    function newQ() {
      var hi = Math.random() < 0.5, seq = hi ? HIGH : LOW, i = Math.floor(Math.random() * (seq.length - 1));
      cur = { a: seq[i + 1], hi: hi, now: seq[i] };
      q.textContent = 'A ' + (hi ? 'high-mass star (20 solar masses)' : 'low-mass star like the Sun') + ' is at this stage: ' + seq[i] + '. What comes next?';
      var others = P.shuffle(ALL.filter(function (x) { return x !== cur.a && x !== cur.now; })).slice(0, 3);
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      P.shuffle([cur.a].concat(others)).forEach(function (x) { var b = document.createElement('button'); b.type = 'button'; b.textContent = x; b.addEventListener('click', function () { answer(x, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(x, b) {
      var ok = x === cur.a;
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (y) { y.disabled = true; if (y.textContent === cur.a) y.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct. ' : '✗ Next comes: ' + cur.a + '. ') + 'Full sequence: ' + (cur.hi ? HIGH : LOW).join(' → ') + '.';
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
