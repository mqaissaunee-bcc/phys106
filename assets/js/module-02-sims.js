/* Module 2 simulations and activities. Each block finds its root by id and does nothing if absent.
   SVG drawing uses the theme classes in site.css (.s-*). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function setText(id, t) { var n = $(id); if (n) n.textContent = t; }
  function fmt(x, d) {
    d = d === undefined ? 1 : d;
    if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString('en-US');
    return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
  }
  function starfield(svg, w, h, n, seed) {
    var g = el('g', { 'aria-hidden': 'true' }, svg), s = seed || 7;
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < n; i++) el('circle', { cx: (rnd() * w).toFixed(1), cy: (rnd() * h).toFixed(1), r: (rnd() * 1.1 + 0.3).toFixed(2), 'class': 's-star', opacity: (rnd() * 0.6 + 0.2).toFixed(2) }, g);
    return g;
  }
  function player(btn, stepFn, label) {
    var on = false, raf = null, last = null;
    function frame(ts) {
      if (!on) return;
      if (last === null) last = ts;
      var dt = Math.min(0.1, (ts - last) / 1000); last = ts;
      if (stepFn(REDUCED ? dt * 2.5 : dt) === false) { stop(); return; }
      raf = window.requestAnimationFrame(frame);
    }
    function stop() { on = false; last = null; if (raf) window.cancelAnimationFrame(raf); btn.textContent = label; btn.setAttribute('aria-pressed', 'false'); }
    btn.addEventListener('click', function () {
      if (on) { stop(); return; }
      on = true; btn.textContent = 'Pause'; btn.setAttribute('aria-pressed', 'true');
      raf = window.requestAnimationFrame(frame);
    });
    return { stop: stop };
  }
  // phase disk path (fraction lit from phase angle alpha: 0 = full, 180 = new). litRight chooses the lit limb.
  function phasePath(cx, cy, r, alphaDeg, litRight) {
    var c = Math.cos(alphaDeg * Math.PI / 180); // +1 full, -1 new
    var k = (1 + c) / 2;
    if (k < 0.003) return '';
    var rx = Math.abs(c) * r, top = cx + ' ' + (cy - r), bot = cx + ' ' + (cy + r);
    var gibbous = c > 0;
    if (litRight) return 'M ' + top + ' A ' + r + ' ' + r + ' 0 0 1 ' + bot + ' A ' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (gibbous ? 1 : 0) + ' ' + top + ' Z';
    return 'M ' + top + ' A ' + r + ' ' + r + ' 0 0 0 ' + bot + ' A ' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + (gibbous ? 0 : 1) + ' ' + top + ' Z';
  }

  /* =====================================================================
     2.1 Retrograde motion
     ===================================================================== */
  (function retro() {
    var svg = $('retro-svg');
    if (!svg) return;
    var W = 800, H = 420, CX = 230, CY = 210;
    var PLANETS = { mars: ['Mars', 1.524, 1.881], jupiter: ['Jupiter', 5.203, 11.86], saturn: ['Saturn', 9.537, 29.46] };
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, 460, H, 70, 41);
    var cap1 = el('text', { x: CX, y: 24, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg); cap1.textContent = 'From above (Sun-centered)';
    var starRing = el('circle', { cx: CX, cy: CY, r: 185, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '1 5' }, svg);
    var orbE = el('circle', { cx: CX, cy: CY, 'class': 's-line', 'stroke-width': 1 }, svg);
    var orbP = el('circle', { cx: CX, cy: CY, 'class': 's-line', 'stroke-width': 1 }, svg);
    el('circle', { cx: CX, cy: CY, r: 10, 'class': 's-sun' }, svg);
    var sight = el('line', { 'class': 's-hl', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }, svg);
    var hit = el('circle', { r: 4, 'class': 's-hl-fill' }, svg);
    var earth = el('circle', { r: 6, 'class': 's-earth' }, svg);
    var planet = el('circle', { r: 6, 'class': 's-hl-fill' }, svg);
    var trail = el('g', {}, svg);
    // right: sky strip, longitude across, time downward
    var SX = 480, SW = 300, SY = 50, SH = 340;
    el('line', { x1: 465, y1: 20, x2: 465, y2: 400, 'class': 's-line', 'stroke-width': 1 }, svg);
    var cap2 = el('text', { x: SX + SW / 2, y: 24, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg); cap2.textContent = 'Seen from Earth against the stars';
    el('rect', { x: SX, y: SY, width: SW, height: SH, 'class': 's-sky', opacity: 0.6 }, svg);
    var tE = el('text', { x: SX, y: SY + SH + 18, 'font-size': 11, 'class': 's-label-muted' }, svg); tE.textContent = '← east';
    var tW = el('text', { x: SX + SW, y: SY + SH + 18, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); tW.textContent = 'west →';
    var tT = el('text', { x: SX - 6, y: SY + 12, 'text-anchor': 'end', 'font-size': 11, 'class': 's-label-muted' }, svg); tT.textContent = 'time ↓';
    var path = el('path', { 'class': 's-hl', 'stroke-width': 2.5 }, svg);
    var retroPath = el('path', { 'class': 's-hl', 'stroke-width': 7, opacity: 0.35, 'stroke-linecap': 'round' }, svg);
    var dot = el('circle', { r: 5, 'class': 's-star' }, svg);

    var sel = $('retro-planet'), range = $('retro-range'), key = 'mars', SPAN = 0.9; // years shown, centered on opposition
    function geo(t) {
      var p = PLANETS[key];
      var ae = TAU * t, ap = TAU * t / p[2] + TAU * (SPAN / 2) * (1 - 1 / p[2]); // opposition falls mid-window
      var xe = Math.cos(ae), ye = Math.sin(ae), xp = p[1] * Math.cos(ap), yp = p[1] * Math.sin(ap);
      return { xe: xe, ye: ye, xp: xp, yp: yp, lon: Math.atan2(yp - ye, xp - xe) };
    }
    var lonSeries = [];
    function build() {
      var p = PLANETS[key];
      var sc = 150 / Math.max(p[1], 1.524) ;
      orbE.setAttribute('r', (sc * 1).toFixed(1)); orbP.setAttribute('r', (sc * p[1]).toFixed(1));
      starRing.setAttribute('r', Math.max(185, sc * p[1] + 30));
      SPAN = key === 'mars' ? 0.9 : 0.8;
      lonSeries = [];
      var prev = null, off = 0, N = 400;
      for (var i = 0; i <= N; i++) {
        var t = i / N * SPAN, g = geo(t), L = g.lon;
        if (prev !== null) { var d = L - prev; if (d > Math.PI) off -= TAU; if (d < -Math.PI) off += TAU; }
        prev = L; lonSeries.push(L + off);
      }
      var mn = Math.min.apply(null, lonSeries), mx = Math.max.apply(null, lonSeries);
      var d1 = '', d2 = '', was = false, pts = [];
      lonSeries.forEach(function (L, i) {
        var x = SX + SW - (L - mn) / (mx - mn) * (SW - 20) - 10; // east to the left (longitude increases eastward)
        var y = SY + 8 + i / N * (SH - 16);
        pts.push(x.toFixed(1) + ' ' + y.toFixed(1));
        d1 += (i ? ' L ' : 'M ') + pts[i];
        var r = i > 0 && L < lonSeries[i - 1];
        if (r && !was) d2 += ' M ' + pts[i - 1] + ' L ' + pts[i];
        else if (r) d2 += ' L ' + pts[i];
        was = r;
      });
      path.setAttribute('d', d1); retroPath.setAttribute('d', d2.trim());
      build.mn = mn; build.mx = mx; build.sc = sc;
      tE.textContent = '← east'; tW.textContent = 'west →';
    }
    function render() {
      var f = parseFloat(range.value) / 1000, t = f * SPAN, g = geo(t), sc = build.sc;
      var ex = CX + g.xe * sc, ey = CY - g.ye * sc, px = CX + g.xp * sc, py = CY - g.yp * sc;
      earth.setAttribute('cx', ex.toFixed(1)); earth.setAttribute('cy', ey.toFixed(1));
      planet.setAttribute('cx', px.toFixed(1)); planet.setAttribute('cy', py.toFixed(1));
      var R = parseFloat(starRing.getAttribute('r'));
      // extend sight line from Earth through planet to the star ring
      var dx = px - ex, dy = py - ey, L = Math.hypot(dx, dy); dx /= L; dy /= L;
      var bx = ex - CX, by = ey - CY, b = bx * dx + by * dy, c = bx * bx + by * by - R * R, s = -b + Math.sqrt(b * b - c);
      var hx = ex + dx * s, hy = ey + dy * s;
      sight.setAttribute('x1', ex.toFixed(1)); sight.setAttribute('y1', ey.toFixed(1)); sight.setAttribute('x2', hx.toFixed(1)); sight.setAttribute('y2', hy.toFixed(1));
      hit.setAttribute('cx', hx.toFixed(1)); hit.setAttribute('cy', hy.toFixed(1));
      var i = Math.round(f * (lonSeries.length - 1));
      var Lc = lonSeries[i];
      dot.setAttribute('cx', (SX + SW - (Lc - build.mn) / (build.mx - build.mn) * (SW - 20) - 10).toFixed(1));
      dot.setAttribute('cy', (SY + 8 + f * (SH - 16)).toFixed(1));
      var moving = i > 0 ? lonSeries[i] - lonSeries[i - 1] : lonSeries[1] - lonSeries[0];
      var retroNow = moving < 0;
      var name = PLANETS[key][0];
      setText('retro-r-motion', retroNow ? 'Westward (retrograde)' : 'Eastward (normal)');
      setText('retro-r-dist', fmt(Math.hypot(g.xp - g.xe, g.yp - g.ye), 2) + ' AU');
      setText('retro-r-time', fmt(t * 365.25, 0) + ' days');
      $('retro-out').textContent = 'day ' + fmt(t * 365.25, 0);
      range.setAttribute('aria-valuetext', 'day ' + fmt(t * 365.25, 0) + ', ' + name + ' moving ' + (retroNow ? 'westward, retrograde' : 'eastward'));
      setText('retro-note', retroNow
        ? 'Earth is overtaking ' + name + ' on the inside track, so the line of sight swings backward across the stars. ' + name + ' itself never reverses; it is also at its closest and brightest now.'
        : name + ' drifts eastward against the stars, the normal direction. Watch what happens as Earth catches up to it.');
    }
    sel.addEventListener('change', function () { key = sel.value; build(); render(); });
    range.addEventListener('input', render);
    player($('retro-play'), function (dt) {
      var v = parseFloat(range.value) + dt * 1000 / 12;
      if (v >= 1000) { range.value = '1000'; render(); return false; }
      range.value = String(v); render();
    }, 'Play');
    build(); render();
  })();

  /* =====================================================================
     2.2 Kepler's first two laws
     ===================================================================== */
  (function kepler() {
    var svg = $('kep-svg');
    if (!svg) return;
    var W = 800, H = 400, A = 175;
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, H, 70, 55);
    var wedges = el('g', {}, svg);
    var orbit = el('path', { 'class': 's-line', 'stroke-width': 1.5 }, svg);
    var major = el('line', { 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    var f2 = el('circle', { r: 3, 'class': 's-label-muted' }, svg);
    var sun = el('circle', { r: 12, 'class': 's-sun' }, svg);
    var rline = el('line', { 'class': 's-hl', 'stroke-width': 1.5 }, svg);
    var pl = el('circle', { r: 8, 'class': 's-earth' }, svg);
    var peri = el('text', { 'font-size': 12, 'class': 's-label-muted' }, svg); peri.textContent = 'perihelion';
    var aph = el('text', { 'font-size': 12, 'class': 's-label-muted', 'text-anchor': 'end' }, svg); aph.textContent = 'aphelion';
    var eR = $('kep-e'), tR = $('kep-t'), wk = $('kep-wedges'), sel = $('kep-preset');
    var CX = 400, CY = 200;
    function solveE(M, e) { var E = e > 0.8 ? Math.PI : M; for (var i = 0; i < 30; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
    function pos(t, e) { // t in periods; returns coords relative to sun focus, in units of a
      var E = solveE(TAU * t, e); var b = Math.sqrt(1 - e * e);
      return { x: Math.cos(E) - e, y: b * Math.sin(E), r: 1 - e * Math.cos(E) };
    }
    function render() {
      var e = parseFloat(eR.value), t = parseFloat(tR.value) / 1000, b = Math.sqrt(1 - e * e);
      var ccx = CX, fx = ccx + A * e; // ellipse centered in the view; the Sun sits at the focus fx
      function P(p) { return { x: fx + A * p.x, y: CY - A * p.y }; }
      var d = '';
      for (var i = 0; i <= 120; i++) { var E = i / 120 * TAU; var q = P({ x: Math.cos(E) - e, y: b * Math.sin(E) }); d += (i ? ' L ' : 'M ') + q.x.toFixed(1) + ' ' + q.y.toFixed(1); }
      orbit.setAttribute('d', d + ' Z');
      sun.setAttribute('cx', fx); sun.setAttribute('cy', CY);
      major.setAttribute('x1', ccx - A); major.setAttribute('x2', ccx + A); major.setAttribute('y1', CY); major.setAttribute('y2', CY);
      f2.setAttribute('cx', ccx - A * e); f2.setAttribute('cy', CY);
      peri.setAttribute('x', ccx + A + 6); peri.setAttribute('y', CY - 6);
      aph.setAttribute('x', ccx - A - 6); aph.setAttribute('y', CY - 6);
      while (wedges.firstChild) wedges.removeChild(wedges.firstChild);
      if (wk.checked) {
        var N = 12;
        for (var k = 0; k < N; k += 2) {
          var pts = 'M ' + fx + ' ' + CY;
          for (var j = 0; j <= 16; j++) { var q2 = P(pos((k + j / 16) / N, e)); pts += ' L ' + q2.x.toFixed(1) + ' ' + q2.y.toFixed(1); }
          el('path', { d: pts + ' Z', 'class': 's-hl-fill', opacity: 0.22 }, wedges);
        }
      }
      var p = pos(t, e), q = P(p);
      pl.setAttribute('cx', q.x.toFixed(1)); pl.setAttribute('cy', q.y.toFixed(1));
      rline.setAttribute('x1', fx); rline.setAttribute('y1', CY); rline.setAttribute('x2', q.x.toFixed(1)); rline.setAttribute('y2', q.y.toFixed(1));
      var v = Math.sqrt(2 / p.r - 1); // speed relative to a circular orbit of the same a
      $('kep-e-out').textContent = e.toFixed(3);
      eR.setAttribute('aria-valuetext', 'eccentricity ' + e.toFixed(3));
      $('kep-t-out').textContent = Math.round(t * 100) + '% of an orbit';
      tR.setAttribute('aria-valuetext', Math.round(t * 100) + ' percent of an orbit');
      setText('kep-r-dist', fmt(p.r, 3) + ' × average');
      setText('kep-r-speed', fmt(v, 2) + ' × average');
      setText('kep-r-range', 'closest ' + fmt(1 - e, 3) + ', farthest ' + fmt(1 + e, 3));
      setText('kep-r-ratio', fmt((1 + e) / (1 - e), 2) + ' to 1');
      var note;
      if (e < 0.02) note = 'Nearly a circle. Earth\u2019s orbit (e = 0.017) is this round: its distance from the Sun varies by only about 3%.';
      else if (e > 0.6) note = 'A comet-like orbit. The planet crawls through the far end and whips around the Sun, yet each shaded wedge still covers the same area in the same time.';
      else note = 'The Sun sits at one focus, not the center. The planet moves fastest at perihelion and slowest at aphelion, sweeping equal areas in equal times (turn on the wedges to see it).';
      setText('kep-note', note);
    }
    [eR, tR].forEach(function (i) { i.addEventListener('input', render); });
    wk.addEventListener('change', render);
    sel.addEventListener('change', function () { if (sel.value) { eR.value = sel.value; render(); } });
    player($('kep-play'), function (dt) { tR.value = String((parseFloat(tR.value) + dt * 110) % 1000); render(); }, 'Play orbit');
    render();
  })();

  /* =====================================================================
     2.3 Phases of Venus: Ptolemy vs Copernicus
     ===================================================================== */
  (function venus() {
    var svg = $('venus-svg');
    if (!svg) return;
    var W = 800, H = 400;
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, H, 70, 77);
    var g = el('g', {}, svg);
    el('line', { x1: 470, y1: 20, x2: 470, y2: 380, 'class': 's-line', 'stroke-width': 1 }, svg);
    var cap = el('text', { x: 235, y: 24, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg);
    var cap2 = el('text', { x: 635, y: 40, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg); cap2.textContent = 'Venus through a telescope';
    var disk = el('circle', { cx: 635, cy: 200, 'class': 's-moondark' }, svg);
    var lit = el('path', { 'class': 's-moonlit' }, svg);
    var ring = el('circle', { cx: 635, cy: 200, 'class': 's-line', 'stroke-width': 1 }, svg);
    var pname = el('text', { x: 635, y: 350, 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, 'class': 's-label' }, svg);
    var model = $('venus-model'), range = $('venus-range'), seen = { h: {}, p: {} };
    var CX = 235, CY = 210, S = 150;
    function phaseName(k) { if (k < 0.04) return 'New (invisible)'; if (k < 0.45) return 'Crescent'; if (k <= 0.55) return 'Half lit'; if (k < 0.96) return 'Gibbous'; return 'Full'; }
    function render() {
      while (g.firstChild) g.removeChild(g.firstChild);
      var f = parseFloat(range.value) / 1000, helio = model.value === 'helio';
      var E, Sn, V;
      if (helio) {
        cap.textContent = 'Sun-centered model (Copernicus)';
        var t = f * 1.6; // synodic period of Venus is about 1.6 years
        var ae = TAU * t, av = TAU * t / 0.615;
        Sn = { x: 0, y: 0 }; E = { x: Math.cos(ae), y: Math.sin(ae) }; V = { x: 0.723 * Math.cos(av), y: 0.723 * Math.sin(av) };
        el('circle', { cx: CX, cy: CY, r: S, 'class': 's-line', 'stroke-width': 1 }, g);
        el('circle', { cx: CX, cy: CY, r: S * 0.723, 'class': 's-line', 'stroke-width': 1 }, g);
      } else {
        cap.textContent = 'Earth-centered model (Ptolemy)';
        var as = TAU * f * 1.6, ad = TAU * f; // epicycle turns once per synodic cycle relative to the Sun line
        E = { x: 0, y: 0 }; Sn = { x: Math.cos(as), y: Math.sin(as) };
        var C = { x: 0.55 * Sn.x, y: 0.55 * Sn.y };
        var ang = as + ad * 1.0 + Math.PI;
        V = { x: C.x + 0.4 * Math.cos(ang), y: C.y + 0.4 * Math.sin(ang) };
        el('circle', { cx: CX, cy: CY, r: S, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, g);
        el('circle', { cx: CX, cy: CY, r: S * 0.55, 'class': 's-line', 'stroke-width': 1 }, g);
        el('circle', { cx: CX + C.x * S, cy: CY - C.y * S, r: S * 0.4, 'class': 's-line', 'stroke-width': 1 }, g);
        el('circle', { cx: CX + C.x * S, cy: CY - C.y * S, r: 2.5, 'class': 's-label-muted' }, g);
      }
      function P(p) { return { x: CX + p.x * S, y: CY - p.y * S }; }
      var ps = P(Sn), pe = P(E), pv = P(V);
      el('line', { x1: pe.x, y1: pe.y, x2: pv.x, y2: pv.y, 'class': 's-hl', 'stroke-width': 1, 'stroke-dasharray': '4 4' }, g);
      el('circle', { cx: ps.x, cy: ps.y, r: 12, 'class': 's-sun' }, g);
      el('circle', { cx: pe.x, cy: pe.y, r: 7, 'class': 's-earth' }, g);
      el('circle', { cx: pv.x, cy: pv.y, r: 6, 'class': 's-hl-fill' }, g);
      var lt = el('text', { x: pv.x + 9, y: pv.y - 8, 'font-size': 12, 'class': 's-label' }, g); lt.textContent = 'Venus';
      var le = el('text', { x: pe.x + 9, y: pe.y + 16, 'font-size': 12, 'class': 's-label' }, g); le.textContent = 'Earth';
      // phase angle at Venus between directions to Sun and to Earth
      var s1 = { x: Sn.x - V.x, y: Sn.y - V.y }, e1 = { x: E.x - V.x, y: E.y - V.y };
      var dve = Math.hypot(e1.x, e1.y), dvs = Math.hypot(s1.x, s1.y);
      var alpha = Math.acos(Math.max(-1, Math.min(1, (s1.x * e1.x + s1.y * e1.y) / (dve * dvs)))) * 180 / Math.PI;
      var k = (1 + Math.cos(alpha * Math.PI / 180)) / 2;
      // which limb is lit, as seen from Earth: sign of cross product of (Venus dir) and (Sun dir) from Earth
      var vs = { x: V.x - E.x, y: V.y - E.y }, ss = { x: Sn.x - E.x, y: Sn.y - E.y };
      var litRight = (vs.x * ss.y - vs.y * ss.x) < 0;
      var r = Math.max(14, Math.min(110, 24 / dve));
      disk.setAttribute('r', r.toFixed(1)); ring.setAttribute('r', r.toFixed(1));
      lit.setAttribute('d', phasePath(635, 200, r, alpha, litRight));
      var name = phaseName(k);
      pname.textContent = name;
      seen[helio ? 'h' : 'p'][name.split(' ')[0]] = true;
      setText('venus-r-phase', name);
      setText('venus-r-lit', Math.round(k * 100) + '%');
      setText('venus-r-dist', fmt(dve, 2) + ' AU' + (helio ? '' : ' (model units)'));
      setText('venus-r-seen', Object.keys(seen[helio ? 'h' : 'p']).sort().join(', '));
      $('venus-out').textContent = Math.round(f * 100) + '%';
      range.setAttribute('aria-valuetext', Math.round(f * 100) + ' percent through the cycle, ' + name);
      setText('venus-note', helio
        ? 'Venus orbits the Sun, so it can swing to the far side of the Sun and show a nearly full face, looking small because it is far away. Close to Earth it is a large, thin crescent. Galileo saw exactly this.'
        : 'In Ptolemy\u2019s model Venus always stays between Earth and the Sun, so we only ever see part of its night side lit: new or crescent phases, never gibbous or full.');
    }
    model.addEventListener('change', render);
    range.addEventListener('input', render);
    player($('venus-play'), function (dt) { range.value = String((parseFloat(range.value) + dt * 70) % 1000); render(); }, 'Play');
    render();
  })();

  /* =====================================================================
     2.4 Solar day vs sidereal day
     ===================================================================== */
  (function dayLength() {
    var svg = $('day-svg');
    if (!svg) return;
    var W = 800, H = 400, CX = 330, CY = 215, R = 150, TS = 23.9345;
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, H, 70, 91);
    var arrowStar = el('text', { x: 700, y: 40, 'font-size': 13, 'class': 's-label', 'text-anchor': 'middle' }, svg); arrowStar.textContent = '↑ to a distant star';
    el('circle', { cx: CX, cy: CY, r: R, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    el('circle', { cx: CX, cy: CY, r: 18, 'class': 's-sun' }, svg);
    var start = el('circle', { r: 16, 'class': 's-earth', opacity: 0.25 }, svg);
    var startArrow = el('line', { 'class': 's-line', 'stroke-width': 2 }, svg);
    var toSun = el('line', { 'class': 's-ray', 'stroke-width': 1, 'stroke-dasharray': '4 4' }, svg);
    var starLine = el('line', { 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg);
    var earth = el('circle', { r: 16, 'class': 's-earth' }, svg);
    var arrow = el('line', { 'class': 's-hl', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    var you = el('circle', { r: 4, 'class': 's-hl-fill' }, svg);
    var status = el('text', { x: 400, y: 388, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, 'class': 's-label' }, svg);
    var hours = $('day-hours'), year = $('day-year');
    function yearDays() { return Math.pow(10, parseFloat(year.value)); }
    function render() {
      var h = parseFloat(hours.value), N = yearDays(), Torb = N * 24;
      var orb0 = -Math.PI / 2 + 0.0; // start at bottom of orbit
      var orb = orb0 + TAU * h / Torb;
      var ex = CX + R * Math.cos(orb), ey = CY - R * Math.sin(orb);
      var sx0 = CX + R * Math.cos(orb0), sy0 = CY - R * Math.sin(orb0);
      start.setAttribute('cx', sx0); start.setAttribute('cy', sy0);
      startArrow.setAttribute('x1', sx0); startArrow.setAttribute('y1', sy0); startArrow.setAttribute('x2', sx0); startArrow.setAttribute('y2', sy0 - 28);
      earth.setAttribute('cx', ex.toFixed(1)); earth.setAttribute('cy', ey.toFixed(1));
      // rotation: at h=0 the marker points toward the Sun (up, since Earth starts at the bottom)
      var rot = Math.PI / 2 + TAU * h / TS;
      var ax = ex + 28 * Math.cos(rot), ay = ey - 28 * Math.sin(rot);
      arrow.setAttribute('x1', ex.toFixed(1)); arrow.setAttribute('y1', ey.toFixed(1)); arrow.setAttribute('x2', ax.toFixed(1)); arrow.setAttribute('y2', ay.toFixed(1));
      you.setAttribute('cx', (ex + 16 * Math.cos(rot)).toFixed(1)); you.setAttribute('cy', (ey - 16 * Math.sin(rot)).toFixed(1));
      toSun.setAttribute('x1', ex.toFixed(1)); toSun.setAttribute('y1', ey.toFixed(1)); toSun.setAttribute('x2', CX); toSun.setAttribute('y2', CY);
      starLine.setAttribute('x1', ex.toFixed(1)); starLine.setAttribute('y1', ey.toFixed(1)); starLine.setAttribute('x2', ex.toFixed(1)); starLine.setAttribute('y2', (ey - 60).toFixed(1));
      var solar = 1 / (1 / TS - 1 / Torb);
      var st = '';
      if (Math.abs(h - TS) < 0.12) st = 'One sidereal day: facing the same star again';
      else if (Math.abs(h - solar) < 0.12) st = 'One solar day: facing the Sun again';
      else if (h > TS && h < solar) st = 'Still turning to face the Sun…';
      status.textContent = st;
      var hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      $('day-hours-out').textContent = hh + ' h ' + String(mm).padStart(2, '0') + ' min';
      hours.setAttribute('aria-valuetext', hh + ' hours ' + mm + ' minutes');
      $('day-year-out').textContent = fmt(N, N < 20 ? 1 : 0) + ' days';
      year.setAttribute('aria-valuetext', fmt(N, 0) + ' days per year');
      var sh = Math.floor(solar), sm = (solar - sh) * 60;
      setText('day-r-sid', '23 h 56 min 4 s');
      setText('day-r-sol', sh + ' h ' + Math.floor(sm) + ' min ' + Math.round((sm % 1) * 60) + ' s');
      setText('day-r-diff', fmt((solar - TS) * 60, 1) + ' min');
      setText('day-r-deg', fmt(360 * TS / Torb, 2) + '° per sidereal day');
      setText('day-note', N > 300
        ? 'With a real year, Earth moves about 1° along its orbit each day, so it must turn about 1° extra, which takes about 4 minutes, to face the Sun again. That is why a solar day is 24 hours but a sidereal day is 23 h 56 min.'
        : 'A shorter year means Earth moves farther along its orbit each day, so it needs a bigger extra turn to face the Sun again. The difference is exaggerated so you can see it; drag the year back to 365 days for the real value.');
    }
    [hours, year].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.slice.call(document.querySelectorAll('[data-day-jump]')).forEach(function (b) {
      b.addEventListener('click', function () {
        var N = yearDays(), Torb = N * 24, solar = 1 / (1 / TS - 1 / Torb);
        hours.value = String(b.getAttribute('data-day-jump') === 'sid' ? TS : Math.min(parseFloat(hours.max), solar));
        render();
      });
    });
    $('day-real').addEventListener('click', function () { year.value = year.max; render(); });
    player($('day-play'), function (dt) {
      var v = parseFloat(hours.value) + dt * 4;
      if (v >= parseFloat(hours.max)) { hours.value = hours.max; render(); return false; }
      hours.value = String(v); render();
    }, 'Play a day');
    render();
  })();

  /* =====================================================================
     Activity: Eratosthenes
     ===================================================================== */
  (function eratosthenes() {
    var d = $('er-dist'), a = $('er-angle');
    if (!d) return;
    function render() {
      var km = parseFloat(d.value), ang = parseFloat(a.value);
      if (!(km > 0) || !(ang > 0) || ang >= 180) { setText('er-note', 'Enter a positive distance and an angle between 0° and 180°.'); return; }
      var C = 360 / ang * km, err = (C - 40075) / 40075 * 100;
      setText('er-r-frac', '1/' + fmt(360 / ang, 1) + ' of a circle');
      setText('er-r-circ', fmt(C, 0) + ' km');
      setText('er-r-diam', fmt(C / Math.PI, 0) + ' km');
      setText('er-r-err', (err >= 0 ? '+' : '') + fmt(err, 1) + '%');
      setText('er-note', 'The two places are ' + fmt(ang, 2) + '° apart around Earth, so Earth\u2019s circumference is ' + fmt(360 / ang, 1) + ' times their ' + fmt(km, 0) + ' km separation. The true value is about 40,075 km around the equator.');
    }
    [d, a].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.slice.call(document.querySelectorAll('[data-er]')).forEach(function (b) {
      b.addEventListener('click', function () { var v = b.getAttribute('data-er').split(','); d.value = v[0]; a.value = v[1]; render(); });
    });
    render();
  })();

  /* =====================================================================
     Activity: Kepler's third law
     ===================================================================== */
  (function third() {
    var tb = $('k3-body');
    if (!tb) return;
    var PL = [['Mercury', 0.387, 0.241], ['Venus', 0.723, 0.615], ['Earth', 1, 1], ['Mars', 1.524, 1.881], ['Jupiter', 5.203, 11.86], ['Saturn', 9.537, 29.46], ['Uranus', 19.19, 84.01], ['Neptune', 30.07, 164.8]];
    PL.forEach(function (p) {
      var tr = document.createElement('tr');
      [p[0], fmt(p[1], 3), fmt(p[2], 3), fmt(p[2] * p[2], 3), fmt(Math.pow(p[1], 3), 3)].forEach(function (t, i) {
        var td = document.createElement(i ? 'td' : 'th'); if (!i) td.setAttribute('scope', 'row'); else td.className = 'num'; td.textContent = t; tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    var aIn = $('k3-a'), pIn = $('k3-p');
    function years(y) { return y < 2 ? fmt(y * 365.25, 0) + ' days (' + fmt(y, 3) + ' years)' : fmt(y, y < 100 ? 2 : 0) + ' years'; }
    $('k3-from-a').addEventListener('click', function () {
      var a = parseFloat(aIn.value);
      if (!(a > 0)) { setText('k3-note', 'Enter an average distance greater than zero.'); return; }
      var p = Math.pow(a, 1.5); pIn.value = p.toPrecision(4);
      setText('k3-note', 'p² = a³ → p = ' + fmt(a, 3) + '^1.5 = ' + years(p) + '. Something ' + fmt(a, 3) + ' AU from the Sun takes that long to go around once.');
    });
    $('k3-from-p').addEventListener('click', function () {
      var p = parseFloat(pIn.value);
      if (!(p > 0)) { setText('k3-note', 'Enter an orbital period greater than zero.'); return; }
      var a = Math.pow(p, 2 / 3); aIn.value = a.toPrecision(4);
      setText('k3-note', 'a³ = p² → a = ' + fmt(p, 3) + '^(2/3) = ' + fmt(a, 3) + ' AU from the Sun on average.');
    });
  })();

  /* =====================================================================
     Activity: calendar drift
     ===================================================================== */
  (function calendar() {
    var yIn = $('cal2-year');
    if (!yIn) return;
    var TROP = 365.2422;
    function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
    function checkYear() {
      var y = parseInt(yIn.value, 10);
      if (!(y > 1582)) { setText('cal2-leap', 'Enter a year after 1582, when the Gregorian calendar began.'); return; }
      var why = y % 400 === 0 ? 'it is divisible by 400' : y % 100 === 0 ? 'it is divisible by 100 but not by 400' : y % 4 === 0 ? 'it is divisible by 4 and not by 100' : 'it is not divisible by 4';
      setText('cal2-leap', y + (isLeap(y) ? ' is' : ' is not') + ' a leap year, because ' + why + '.');
    }
    yIn.addEventListener('input', checkYear);
    var sys = $('cal2-sys'), yrs = $('cal2-yrs');
    var LEN = { none: 365, julian: 365.25, greg: 365.2425 };
    var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function dateFromDoy(d) { d = ((Math.round(d) - 1) % 365 + 365) % 365 + 1; var m = 0; while (d > MD[m]) { d -= MD[m]; m++; } return MON[m] + ' ' + d; }
    function drift() {
      var n = parseFloat(yrs.value), L = LEN[sys.value];
      var slip = (TROP - L) * n; // positive: calendar falls behind the seasons, so the solstice falls later in the calendar
      $('cal2-yrs-out').textContent = fmt(n, 0) + ' years';
      yrs.setAttribute('aria-valuetext', fmt(n, 0) + ' years');
      setText('cal2-r-slip', (slip >= 0 ? '+' : '−') + fmt(Math.abs(slip), 1) + ' days');
      setText('cal2-r-sol', dateFromDoy(172 + slip));
      setText('cal2-r-year', fmt(L, 4) + ' days');
      var msg;
      if (sys.value === 'none') msg = 'A 365-day calendar is about 6 hours too short, so the seasons slip about one day every four years. After a few centuries, the June solstice would land in the fall.';
      else if (sys.value === 'julian') msg = 'The Julian calendar\u2019s leap day every four years overshoots by about 11 minutes a year. By 1582 the error had grown to about 10 days, which is why Pope Gregory XIII dropped 10 days from the calendar.';
      else msg = 'The Gregorian rules skip three leap days every 400 years. The average year is only about 26 seconds too long, an error of one day in about 3,000 years.';
      setText('cal2-note', msg);
    }
    [sys, yrs].forEach(function (i) { i.addEventListener('input', drift); i.addEventListener('change', drift); });
    checkYear(); drift();
  })();

  /* =====================================================================
     Activity: local solar noon
     ===================================================================== */
  (function solarNoon() {
    var lon = $('sn-lon');
    if (!lon) return;
    var zone = $('sn-zone'), date = $('sn-date'), dst = $('sn-dst');
    var t = new Date();
    date.value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    function eot(doy) { var B = TAU * (doy - 81) / 364; return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); }
    function clock(mins) {
      var h = Math.floor(mins / 60), m = Math.round(mins - h * 60); if (m === 60) { h++; m = 0; }
      var ap = h >= 12 ? 'p.m.' : 'a.m.'; var h12 = h % 12 === 0 ? 12 : h % 12;
      return h12 + ':' + String(m).padStart(2, '0') + ' ' + ap;
    }
    function render() {
      var L = parseFloat(lon.value), Z = parseFloat(zone.value);
      if (isNaN(L)) { setText('sn-note', 'Enter your longitude in degrees west.'); return; }
      var dv = date.value ? new Date(date.value + 'T12:00:00') : new Date();
      var doy = Math.round((dv - new Date(dv.getFullYear(), 0, 0)) / 86400000);
      var lonCorr = (L - Z) * 4, e = eot(doy), dstMin = dst.checked ? 60 : 0;
      var noon = 720 + lonCorr - e + dstMin;
      setText('sn-r-lon', (lonCorr >= 0 ? '+' : '−') + fmt(Math.abs(lonCorr), 1) + ' min');
      setText('sn-r-eot', (e >= 0 ? 'Sun ' + fmt(e, 1) + ' min fast' : 'Sun ' + fmt(-e, 1) + ' min slow'));
      setText('sn-r-noon', clock(noon));
      setText('sn-note', 'The Sun is highest in your sky at about ' + clock(noon) + ' on clock time. You are ' + fmt(Math.abs(L - Z), 2) + '° ' + (L < Z ? 'east' : 'west') + ' of your time zone\u2019s central meridian, which shifts noon ' + (L < Z ? 'earlier' : 'later') + ' by 4 minutes per degree.' + (dst.checked ? ' Daylight saving time adds an hour.' : ''));
    }
    [lon, zone, date, dst].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    render();
  })();

  /* =====================================================================
     Activity: navigator challenge
     ===================================================================== */
  (function nav() {
    var q = $('nav-q');
    if (!q) return;
    var opts = $('nav-opts'), fb = $('nav-fb'), next = $('nav-next'), st = $('nav-streak');
    var KEY = 'phys106-nav-v1', rec = window.PHYS106.load(KEY, { best: 0 }), streak = 0, cur;
    function lonText(l) { return l === 0 ? '0°' : Math.abs(l) + '° ' + (l > 0 ? 'W' : 'E'); }
    function label(lat, lon) { return lat + '° N, ' + lonText(lon); }
    function clock(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
    function newQ() {
      var lat = 10 + Math.floor(Math.random() * 51);
      var lon = (Math.floor(Math.random() * 20) - 8) * 7.5; // multiples of 7.5° => 30-minute clock steps
      if (lon === 0) lon = 15;
      var gmt = 12 + lon / 15;
      cur = { lat: lat, lon: lon };
      q.textContent = 'Polaris is ' + lat + '° above your northern horizon. The Sun reaches its highest point when your chronometer, set to Greenwich time, reads ' + clock(gmt) + '. Where are you?';
      var cands = [[lat, lon]], seenC = {};
      seenC[lat + ',' + lon] = 1;
      [[lat, -lon], [90 - lat === lat ? lat + 5 : 90 - lat, lon], [lat, lon + 15], [lat, lon - 15], [lat, lon + 30]].forEach(function (c) {
        if (cands.length < 4 && !seenC[c[0] + ',' + c[1]] && Math.abs(c[1]) <= 180) { seenC[c[0] + ',' + c[1]] = 1; cands.push(c); }
      });
      var answers = window.PHYS106.shuffle(cands);
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      answers.forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = label(c[0], c[1]);
        b.addEventListener('click', function () { answer(c, b); });
        opts.appendChild(b);
      });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(c, btn) {
      var ok = c[0] === cur.lat && c[1] === cur.lon, right = label(cur.lat, cur.lon);
      Array.prototype.slice.call(opts.querySelectorAll('button')).forEach(function (b) { b.disabled = true; if (b.textContent === right) b.classList.add('choice-right'); });
      if (!ok) btn.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; window.PHYS106.save(KEY, rec); }
      var hrs = cur.lon / 15;
      fb.textContent = (ok ? '✓ Correct. ' : '✗ You are at ' + right + '. ') + 'Latitude equals Polaris\u2019s altitude (' + cur.lat + '°). Local noon came ' + fmt(Math.abs(hrs), 1) + ' hours ' + (hrs > 0 ? 'after' : 'before') + ' noon in Greenwich, and each hour is 15° of longitude, so you are ' + lonText(cur.lon) + '.';
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
