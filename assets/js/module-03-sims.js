/* Module 3 simulations and activities: Newton's cannon, blackbody spectra, spectral lines + Doppler,
   telescope resolution, weight on other worlds, weigh a planet, Doppler drill. */
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
    return { stop: stop, running: function () { return on; } };
  }
  // visible wavelength (nm) to CSS color
  function wlColor(w) {
    var r = 0, g = 0, b = 0;
    if (w >= 380 && w < 440) { r = -(w - 440) / 60; b = 1; } else if (w < 490) { g = (w - 440) / 50; b = 1; } else if (w < 510) { g = 1; b = -(w - 510) / 20; }
    else if (w < 580) { r = (w - 510) / 70; g = 1; } else if (w < 645) { r = 1; g = -(w - 645) / 65; } else if (w <= 750) { r = 1; }
    var f = w < 420 ? 0.3 + 0.7 * (w - 380) / 40 : w > 700 ? 0.3 + 0.7 * (750 - w) / 50 : 1;
    if (w < 380 || w > 750) f = 0;
    function c(v) { return Math.round(255 * Math.pow(v * f, 0.8)); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }
  function rainbow(defs, id) {
    var lg = el('linearGradient', { id: id, x1: '0', x2: '1', y1: '0', y2: '0' }, defs);
    for (var w = 380; w <= 750; w += 10) el('stop', { offset: ((w - 380) / 370).toFixed(3), 'stop-color': wlColor(w) }, lg);
    return lg;
  }
  // approximate star color from temperature (K)
  function starRGB(T) {
    var t = T / 100, r, g, b;
    r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -0.1332);
    g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -0.0755);
    b = t >= 66 ? 255 : (t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305.0);
    function c(v) { return Math.max(0, Math.min(255, Math.round(v))); }
    return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')';
  }

  /* ============== Newton's cannon ============== */
  (function cannon() {
    var svg = $('cannon-svg'); if (!svg) return;
    var W = 800, H = 440, CX = 400, CY = 230, RE = 6371, GM = 398600, ALT = 400, PX = 70 / RE;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, H, 90, 13);
    el('circle', { cx: CX, cy: CY, r: RE * PX, 'class': 's-earth' }, svg);
    el('circle', { cx: CX, cy: CY, r: (RE + ALT) * PX, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg);
    el('line', { x1: CX, y1: CY - RE * PX, x2: CX, y2: CY - (RE + ALT) * PX, 'class': 's-hl', 'stroke-width': 3 }, svg);
    var cap = el('text', { x: CX + 8, y: CY - (RE + ALT) * PX - 8, 'font-size': 12, 'class': 's-label' }, svg); cap.textContent = 'Cannon, 400 km up (not to scale)';
    var path = el('path', { 'class': 's-hl', 'stroke-width': 2.5 }, svg);
    var ball = el('circle', { r: 5, 'class': 's-star' }, svg);
    var v = $('can-v'), pts = [], outcome = '', idx = 0;
    function simulate(vk) {
      var x = 0, y = RE + ALT, vx = vk, vy = 0, dt = 4, out = [[x, y]], t = 0, r0 = Math.hypot(x, y), turned = 0, prevAng = Math.atan2(y, x), crashed = false, escaped = false;
      for (var i = 0; i < 20000; i++) {
        var r = Math.hypot(x, y), a = -GM / (r * r * r);
        vx += a * x * dt / 2; vy += a * y * dt / 2; x += vx * dt; y += vy * dt;
        r = Math.hypot(x, y); a = -GM / (r * r * r); vx += a * x * dt / 2; vy += a * y * dt / 2; t += dt;
        var ang = Math.atan2(y, x), d = ang - prevAng; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; turned += d; prevAng = ang;
        if (i % 3 === 0) out.push([x, y]);
        if (r < RE) { crashed = true; out.push([x, y]); break; }
        if (r * PX > 520) { escaped = true; break; }
        if (Math.abs(turned) >= TAU) { out.push([x, y]); break; }
      }
      return { pts: out, crashed: crashed, escaped: escaped, t: t };
    }
    function render() {
      var vk = parseFloat(v.value), r = RE + ALT, res = simulate(vk);
      pts = res.pts; idx = pts.length - 1;
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + (CX + p[0] * PX).toFixed(1) + ' ' + (CY - p[1] * PX).toFixed(1); }).join(' ');
      path.setAttribute('d', d);
      var last = pts[pts.length - 1]; ball.setAttribute('cx', CX + last[0] * PX); ball.setAttribute('cy', CY - last[1] * PX);
      var vc = Math.sqrt(GM / r), ve = Math.sqrt(2 * GM / r);
      var energy = vk * vk / 2 - GM / r, a = -GM / (2 * energy);
      $('can-v-out').textContent = vk.toFixed(2) + ' km/s';
      v.setAttribute('aria-valuetext', vk.toFixed(2) + ' kilometers per second');
      if (res.crashed) outcome = 'Falls back to Earth';
      else if (Math.abs(vk - vc) < 0.08) outcome = 'Circular orbit';
      else if (vk >= ve) outcome = 'Escapes Earth';
      else outcome = 'Elliptical orbit';
      setText('can-r-out', outcome);
      setText('can-r-circ', vc.toFixed(2) + ' km/s');
      setText('can-r-esc', ve.toFixed(2) + ' km/s');
      if (energy < 0 && !res.crashed) {
        var P = TAU * Math.sqrt(a * a * a / GM) / 60, apo = 2 * a - r - RE;
        setText('can-r-per', P < 1440 ? fmt(P, 0) + ' minutes' : fmt(P / 60, 1) + ' hours');
        setText('can-r-apo', fmt(Math.max(apo, ALT), 0) + ' km up');
      } else { setText('can-r-per', res.crashed ? '— (hits the ground)' : 'none: never returns'); setText('can-r-apo', '—'); }
      var note = {
        'Falls back to Earth': 'Too slow: the ground curves away less than the ball falls, so it hits Earth. Faster shots land farther away.',
        'Circular orbit': 'At about 7.7 km/s the ball falls toward Earth exactly as fast as Earth’s surface curves away beneath it. It is falling all the time and never lands: that is an orbit. The International Space Station does this every 92 minutes.',
        'Elliptical orbit': 'Faster than circular speed, the ball climbs away on the far side and comes back around: an elliptical orbit with the cannon at perigee (closest point).',
        'Escapes Earth': 'Above escape speed the ball’s energy is enough to climb out of Earth’s gravity for good. It never comes back.'
      }[outcome];
      setText('cannon-note', note);
    }
    v.addEventListener('input', render);
    Array.prototype.forEach.call(document.querySelectorAll('[data-can]'), function (b) { b.addEventListener('click', function () { v.value = b.getAttribute('data-can'); render(); }); });
    var k = 0;
    player($('can-play'), function (dt) {
      if (k === 0) { path.setAttribute('stroke-dasharray', ''); }
      k = Math.min(pts.length - 1, k + Math.max(1, Math.round(dt * 120)));
      var p = pts[k]; ball.setAttribute('cx', CX + p[0] * PX); ball.setAttribute('cy', CY - p[1] * PX);
      if (k >= pts.length - 1) { k = 0; return false; }
    }, 'Fire');
    render();
  })();

  /* ============== Blackbody spectra ============== */
  (function blackbody() {
    var svg = $('bb-svg'); if (!svg) return;
    var W = 800, H = 400, X0 = 70, X1 = 770, Y0 = 340, Y1 = 30, L0 = 100, L1 = 3000;
    var defs = el('defs', {}, svg); rainbow(defs, 'bb-rainbow');
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    function xw(l) { return X0 + (l - L0) / (L1 - L0) * (X1 - X0); }
    el('rect', { x: xw(380), y: Y1, width: xw(750) - xw(380), height: Y0 - Y1, fill: 'url(#bb-rainbow)', opacity: 0.35 }, svg);
    var tv = el('text', { x: (xw(380) + xw(750)) / 2, y: Y1 + 14, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg); tv.textContent = 'visible';
    var tu = el('text', { x: xw(240), y: Y1 + 14, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); tu.textContent = 'ultraviolet';
    var ti = el('text', { x: xw(1600), y: Y1 + 14, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); ti.textContent = 'infrared';
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line', 'stroke-width': 1.5 }, svg);
    el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line', 'stroke-width': 1.5 }, svg);
    for (var l = 500; l <= 3000; l += 500) { el('line', { x1: xw(l), y1: Y0, x2: xw(l), y2: Y0 + 6, 'class': 's-line' }, svg); var t = el('text', { x: xw(l), y: Y0 + 22, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg); t.textContent = l + ' nm'; }
    var yl = el('text', { x: 18, y: (Y0 + Y1) / 2, 'font-size': 12, 'class': 's-label-muted', transform: 'rotate(-90 18 ' + (Y0 + Y1) / 2 + ')', 'text-anchor': 'middle' }, svg); yl.textContent = 'light emitted per nm (relative)';
    var sunC = el('path', { 'class': 's-line', 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
    var sunT = el('text', { 'font-size': 12, 'class': 's-label-muted' }, svg); sunT.textContent = 'Sun, 5,800 K';
    var cur = el('path', { 'class': 's-hl', 'stroke-width': 3 }, svg);
    var peak = el('line', { 'class': 's-hl', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
    var swatch = el('circle', { cx: 720, cy: 90, r: 26 }, svg);
    var swT = el('text', { x: 720, y: 136, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg); swT.textContent = 'color';
    function planck(lnm, T) { var l = lnm * 1e-9; return 1 / (Math.pow(l, 5) * (Math.exp(0.014388 / (l * T)) - 1)); }
    var Tin = $('bb-t');
    function curve(T, scale) {
      var d = '';
      for (var l = L0; l <= L1; l += 10) { var y = Y0 - planck(l, T) / scale * (Y0 - Y1 - 30); d += (d ? ' L ' : 'M ') + xw(l).toFixed(1) + ' ' + Math.max(Y1 - 5, y).toFixed(1); }
      return d;
    }
    function render() {
      var T = Math.round(Math.pow(10, parseFloat(Tin.value)) / 50) * 50;
      var peakL = 2.898e6 / T, maxT = Math.max(T, 5800), scale = planck(Math.min(Math.max(2.898e6 / maxT, L0), L1), maxT);
      cur.setAttribute('d', curve(T, scale)); sunC.setAttribute('d', curve(5800, scale));
      var sp = 2.898e6 / 5800; sunT.setAttribute('x', xw(sp) + 6); sunT.setAttribute('y', Y0 - planck(sp, 5800) / scale * (Y0 - Y1 - 30) - 6);
      var px = xw(Math.min(L1, Math.max(L0, peakL)));
      peak.setAttribute('x1', px); peak.setAttribute('x2', px); peak.setAttribute('y1', Y0); peak.setAttribute('y2', Y1);
      swatch.setAttribute('fill', T < 1000 ? 'none' : starRGB(T)); swatch.setAttribute('class', T < 1000 ? 's-line' : '');
      var band = peakL < 380 ? 'ultraviolet' : peakL <= 750 ? 'visible light' : 'infrared';
      var col = T < 1000 ? 'Invisible (glows only in infrared)' : T < 3700 ? 'Red' : T < 5200 ? 'Orange' : T < 6000 ? 'Yellow-white' : T < 7500 ? 'White' : T < 10000 ? 'Blue-white' : 'Blue';
      $('bb-t-out').textContent = fmt(T, 0) + ' K';
      Tin.setAttribute('aria-valuetext', fmt(T, 0) + ' kelvin');
      setText('bb-r-peak', fmt(peakL, 0) + ' nm (' + band + ')');
      setText('bb-r-color', col);
      setText('bb-r-power', sci(Math.pow(T / 5800, 4), 2) + ' × the Sun');
      setText('bb-note', T < 1500 ? 'A cool object like this glows mostly in infrared. Warm objects, including you at about 310 K, emit infrared light you cannot see.'
        : 'Hotter objects emit more light at every wavelength (the curve gets taller everywhere) and their peak shifts to shorter, bluer wavelengths. Doubling the temperature multiplies the light per square meter by 16.');
    }
    Tin.addEventListener('input', render);
    Array.prototype.forEach.call(document.querySelectorAll('[data-bb]'), function (b) { b.addEventListener('click', function () { Tin.value = Math.log10(+b.getAttribute('data-bb')); render(); }); });
    render();
  })();

  /* ============== Spectral lines + Doppler ============== */
  (function spectra() {
    var svg = $('spec-svg'); if (!svg) return;
    var W = 800, H = 300, X0 = 40, X1 = 760, L0 = 380, L1 = 750, C = 299792.458;
    var LINES = { H: [656.3, 486.1, 434.0, 410.2], He: [447.1, 471.3, 492.2, 501.6, 587.6, 667.8, 706.5], Na: [568.8, 589.0, 589.6, 616.1], Ne: [585.2, 588.2, 603.0, 614.3, 626.6, 633.4, 640.2, 650.6, 692.9, 703.2], Hg: [404.7, 435.8, 546.1, 577.0, 579.1] };
    var defs = el('defs', {}, svg); rainbow(defs, 'spec-rainbow');
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    function xw(l) { return X0 + (l - L0) / (L1 - L0) * (X1 - X0); }
    var t1 = el('text', { x: X0, y: 28, 'font-size': 13, 'class': 's-label' }, svg); t1.textContent = 'Laboratory spectrum (at rest)';
    var t2 = el('text', { x: X0, y: 158, 'font-size': 13, 'class': 's-label' }, svg); t2.textContent = 'Spectrum of the moving source';
    var labG = el('g', {}, svg), obsG = el('g', {}, svg);
    for (var l = 400; l <= 750; l += 50) { var tt = el('text', { x: xw(l), y: 288, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); tt.textContent = l + ' nm'; }
    var elSel = $('spec-el'), typeSel = $('spec-type'), vIn = $('spec-v');
    function strip(g, y, lines, type) {
      while (g.firstChild) g.removeChild(g.firstChild);
      var h = 90;
      if (type === 'emission') el('rect', { x: X0, y: y, width: X1 - X0, height: h, fill: '#000' }, g);
      else el('rect', { x: X0, y: y, width: X1 - X0, height: h, fill: 'url(#spec-rainbow)' }, g);
      if (type === 'continuous') return;
      lines.forEach(function (lw) {
        if (lw < L0 || lw > L1) return;
        el('rect', { x: (xw(lw) - 1.6).toFixed(1), y: y, width: 3.2, height: h, fill: type === 'emission' ? wlColor(lw) : '#000' }, g);
      });
      el('rect', { x: X0, y: y, width: X1 - X0, height: h, fill: 'none', 'class': 's-line', 'stroke-width': 1 }, g);
    }
    function render() {
      var v = parseFloat(vIn.value), type = typeSel.value, rest = LINES[elSel.value];
      var z = v / C, obs = rest.map(function (l) { return l * (1 + z); });
      strip(labG, 36, rest, type === 'continuous' ? 'continuous' : type);
      strip(obsG, 166, obs, type);
      $('spec-v-out').textContent = (v > 0 ? '+' : '') + fmt(v, 0) + ' km/s';
      vIn.setAttribute('aria-valuetext', Math.abs(v) + ' kilometers per second ' + (v > 0 ? 'away from you' : v < 0 ? 'toward you' : ''));
      var ref = rest[0];
      setText('spec-r-dir', v > 0 ? 'Moving away: redshift' : v < 0 ? 'Moving toward you: blueshift' : 'Not moving along your line of sight');
      setText('spec-r-shift', (v >= 0 ? '+' : '−') + fmt(Math.abs(ref * z), 2) + ' nm');
      setText('spec-r-line', fmt(ref, 1) + ' → ' + fmt(ref * (1 + z), 1) + ' nm');
      setText('spec-note', type === 'continuous' ? 'A hot, dense object produces a continuous rainbow with no lines, so there is nothing to measure a shift from. That is why astronomers need lines.'
        : type === 'emission' ? 'A hot, thin gas glows only at specific wavelengths set by its atoms: an emission spectrum. The pattern identifies the element; the shift of the whole pattern reveals motion.'
          : 'Cooler gas in front of a hot source absorbs the same wavelengths it would emit, leaving dark lines: an absorption spectrum. Stars show absorption spectra.');
    }
    [elSel, typeSel, vIn].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    render();
  })();

  /* ============== Telescope resolution ============== */
  (function scope() {
    var svg = $('tel-svg'); if (!svg) return;
    var W = 800, H = 320, CX = 400, CY = 160;
    var defs = el('defs', {}, svg);
    var rg = el('radialGradient', { id: 'tel-blur' }, defs);
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '1' }, rg); el('stop', { offset: '0.35', 'stop-color': '#fff', 'stop-opacity': '0.55' }, rg); el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }, rg);
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var g = el('g', {}, svg);
    var cap = el('text', { x: 20, y: 26, 'font-size': 13, 'class': 's-label-muted' }, svg); cap.textContent = 'What the telescope shows of a pair of stars';
    var bar = el('line', { y1: H - 30, y2: H - 30, 'class': 's-hl', 'stroke-width': 2 }, svg);
    var barT = el('text', { y: H - 38, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg);
    var D = $('tel-d'), lam = $('tel-l'), sep = $('tel-s'), pre = $('tel-preset');
    function render() {
      var Dm = Math.pow(10, parseFloat(D.value)), lm = Math.pow(10, parseFloat(lam.value)) * 1e-9, s = Math.pow(10, parseFloat(sep.value));
      var th = 2.5e5 * lm / Dm; // arcseconds
      var k = 260 / Math.max(s * 1.4, th * 3.2);
      var rpx = Math.max(3, th * k * 0.9), dx = s * k / 2;
      while (g.firstChild) g.removeChild(g.firstChild);
      [-dx, dx].forEach(function (o) { el('circle', { cx: CX + o, cy: CY, r: rpx * 1.6, fill: 'url(#tel-blur)', 'class': 'tel-star' }, g); });
      var barArc = Math.pow(10, Math.floor(Math.log10(Math.max(s, th) * 1.2)));
      bar.setAttribute('x1', CX - barArc * k / 2); bar.setAttribute('x2', CX + barArc * k / 2); barT.setAttribute('x', CX);
      barT.textContent = (barArc >= 1 ? fmt(barArc, 0) : barArc) + '″ scale bar';
      var gather = Math.pow(Dm / 0.007, 2);
      $('tel-d-out').textContent = Dm < 1 ? fmt(Dm * 100, Dm < 0.1 ? 1 : 0) + ' cm' : fmt(Dm, 1) + ' m';
      $('tel-l-out').textContent = lm >= 1e-3 ? fmt(lm * 100, 0) + ' cm (radio)' : lm >= 1e-6 ? fmt(lm * 1e6, 1) + ' µm (infrared)' : fmt(lm * 1e9, 0) + ' nm (visible)';
      $('tel-s-out').textContent = (s < 1 ? fmt(s, 3) : fmt(s, 1)) + '″';
      [D, lam, sep].forEach(function (i) { i.setAttribute('aria-valuetext', document.getElementById(i.id + '-out').textContent); });
      setText('tel-r-res', (th < 1 ? fmt(th, 3) : fmt(th, 1)) + ' arcseconds');
      setText('tel-r-split', s > th * 1.05 ? 'Yes: two separate stars' : s > th * 0.8 ? 'Barely: a stretched blob' : 'No: looks like one star');
      setText('tel-r-light', sci(gather, 2) + ' × your eye');
      setText('tel-note', 'Bigger apertures and shorter wavelengths give sharper images (smaller angular resolution). A bigger aperture also collects more light, by the square of its diameter. From the ground, air turbulence blurs visible images to about 0.5–1″ no matter how large the telescope, unless it uses adaptive optics.');
    }
    [D, lam, sep].forEach(function (i) { i.addEventListener('input', render); });
    var P = { eye: [0.007, 550], back: [0.2, 550], hub: [2.4, 550], jwst: [6.5, 2000], elt: [39, 550], radio: [100, 2.1e8] };
    pre.addEventListener('change', function () { var p = P[pre.value]; if (!p) return; D.value = Math.log10(p[0]); lam.value = Math.log10(p[1]); render(); });
    render();
  })();

  /* ============== Activity: weight on other worlds ============== */
  (function weight() {
    var w = $('wt-w'); if (!w) return;
    var G = [['Moon', 0.165], ['Mercury', 0.378], ['Venus', 0.905], ['Earth', 1], ['Mars', 0.379], ['Jupiter (cloud tops)', 2.53], ['Saturn (cloud tops)', 1.07], ['Uranus', 0.904], ['Neptune', 1.14], ['Pluto', 0.063], ['Sun (surface)', 27.9]];
    var unit = $('wt-u');
    function render() {
      var x = parseFloat(w.value), u = unit.value, tb = $('wt-body'); tb.innerHTML = '';
      if (!(x > 0)) return;
      G.forEach(function (g) { var tr = document.createElement('tr'); [g[0], fmt(g[1], 3) + ' g', fmt(x * g[1], 0) + ' ' + u].forEach(function (t, i) { var td = document.createElement(i ? 'td' : 'th'); if (!i) td.setAttribute('scope', 'row'); else td.className = 'num'; td.textContent = t; tr.appendChild(td); }); tb.appendChild(tr); });
      setText('wt-note', 'Your mass (the amount of you) is the same everywhere; only the pull of gravity changes. On the Moon a ' + fmt(x, 0) + '-' + u + ' person could jump about six times higher.');
    }
    [w, unit].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    render();
  })();

  /* ============== Activity: weigh a planet with its moon ============== */
  (function weigh() {
    var a = $('wp-a'); if (!a) return;
    var p = $('wp-p'), G = 6.674e-11;
    var PRE = { moon: [384400, 27.32, 'Earth', 5.97e24], io: [421700, 1.769, 'Jupiter', 1.898e27], titan: [1221870, 15.95, 'Saturn', 5.68e26], earth: [149600000, 365.26, 'the Sun', 1.989e30] };
    function render() {
      var am = parseFloat(a.value) * 1000, ps = parseFloat(p.value) * 86400;
      if (!(am > 0 && ps > 0)) { setText('wp-note', 'Enter an orbital distance and period greater than zero.'); return; }
      var M = 4 * Math.PI * Math.PI * am * am * am / (G * ps * ps);
      setText('wp-r-m', sci(M, 2) + ' kg');
      setText('wp-r-e', sci(M / 5.97e24, 3) + ' Earth masses');
      var k = $('wp-pre').value, pr = PRE[k];
      setText('wp-note', pr && Math.abs(parseFloat(a.value) - pr[0]) < 1 ? 'The accepted mass of ' + pr[2] + ' is ' + sci(pr[3], 2) + ' kg. Newton’s version of Kepler’s third law gets it from nothing but a distance and a time.' : 'The orbit of anything small around a big body tells you the big body’s mass.');
    }
    [a, p].forEach(function (i) { i.addEventListener('input', render); });
    $('wp-pre').addEventListener('change', function () { var pr = PRE[this.value]; if (!pr) return; a.value = pr[0]; p.value = pr[1]; render(); });
    render();
  })();

  /* ============== Activity: Doppler drill ============== */
  (function dop() {
    var q = $('dd-q'); if (!q) return;
    var opts = $('dd-opts'), fb = $('dd-fb'), next = $('dd-next'), st = $('dd-streak');
    var P = window.PHYS106, KEY = 'phys106-dopdrill-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur;
    var REST = [['hydrogen-alpha', 656.3], ['hydrogen-beta', 486.1], ['sodium', 589.0], ['helium', 587.6]];
    function newQ() {
      var r = REST[Math.floor(Math.random() * REST.length)];
      var v = (Math.floor(Math.random() * 16) + 1) * 50 * (Math.random() < 0.5 ? -1 : 1);
      var obs = r[1] * (1 + v / 299792.458);
      cur = v;
      q.textContent = 'A ' + r[0] + ' line that has a wavelength of ' + r[1].toFixed(1) + ' nm in the lab is observed in a star at ' + obs.toFixed(2) + ' nm. How is the star moving?';
      var cands = [v, -v, v * 2, v / 2].map(function (x) { return Math.round(x); });
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      P.shuffle(cands).forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = Math.abs(c) + ' km/s ' + (c > 0 ? 'away (redshift)' : 'toward us (blueshift)');
        b.addEventListener('click', function () { answer(c, b); }); opts.appendChild(b);
      });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      cur = { v: Math.round(v), rest: r[1], obs: obs };
    }
    function answer(c, btn) {
      var ok = c === cur.v;
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (b) { b.disabled = true; });
      btn.classList.add(ok ? 'choice-right' : 'choice-wrong');
      if (!ok) Array.prototype.forEach.call(opts.querySelectorAll('button'), function (b) { if (b.textContent.indexOf(Math.abs(cur.v) + ' km/s ' + (cur.v > 0 ? 'away' : 'toward')) === 0) b.classList.add('choice-right'); });
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      var dl = cur.obs - cur.rest;
      fb.textContent = (ok ? '✓ Correct. ' : '✗ Not quite. ') + 'Shift = ' + dl.toFixed(2) + ' nm. v = (Δλ ÷ λ) × c = (' + dl.toFixed(2) + ' ÷ ' + cur.rest.toFixed(1) + ') × 300,000 km/s ≈ ' + Math.abs(cur.v) + ' km/s, ' + (dl > 0 ? 'longer wavelength, so moving away.' : 'shorter wavelength, so moving toward us.');
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
