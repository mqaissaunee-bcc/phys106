/* Module 5: planet cooling, greenhouse effect, atmospheric escape, Galilean-moon resonance,
   escape-speed calculator, geological-process drill. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(n, a, p) { var e = document.createElementNS(NS, n); if (a) Object.keys(a).forEach(function (k) { e.setAttribute(k, a[k]); }); if (p) p.appendChild(e); return e; }
  function $(id) { return document.getElementById(id); }
  function setText(id, t) { var n = $(id); if (n) n.textContent = t; }
  function fmt(x, d) { d = d === undefined ? 1 : d; if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString('en-US'); return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d }); }
  function starfield(svg, w, h, n, seed) { var g = el('g', { 'aria-hidden': 'true' }, svg), s = seed || 7; function r() { s = (s * 16807) % 2147483647; return s / 2147483647; } for (var i = 0; i < n; i++) el('circle', { cx: (r() * w).toFixed(1), cy: (r() * h).toFixed(1), r: (r() * 1.1 + 0.3).toFixed(2), 'class': 's-star', opacity: (r() * 0.6 + 0.2).toFixed(2) }, g); return g; }
  function player(btn, stepFn, label) {
    var on = false, raf = null, last = null;
    function frame(ts) { if (!on) return; if (last === null) last = ts; var dt = Math.min(0.1, (ts - last) / 1000); last = ts; if (stepFn(REDUCED ? dt * 2.5 : dt) === false) { stop(); return; } raf = requestAnimationFrame(frame); }
    function stop() { on = false; last = null; if (raf) cancelAnimationFrame(raf); btn.textContent = label; btn.setAttribute('aria-pressed', 'false'); }
    btn.addEventListener('click', function () { if (on) { stop(); return; } on = true; btn.textContent = 'Pause'; btn.setAttribute('aria-pressed', 'true'); raf = requestAnimationFrame(frame); });
  }
  function mix(a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }

  /* ============== Cooling worlds ============== */
  (function cooling() {
    var svg = $('cool-svg'); if (!svg) return;
    var W = 800, H = 340;
    var WORLDS = [['Moon', 1737], ['Mercury', 2440], ['Mars', 3390], ['Venus', 6052], ['Earth', 6371]];
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 60, 4);
    var cap = el('text', { x: 20, y: 26, 'font-size': 12, 'class': 's-label-muted' }, svg); cap.textContent = 'Cutaway interiors. Glowing = hot, molten interior that can drive volcanoes and tectonics.';
    var items = WORLDS.map(function (w, i) {
      var r = 14 + w[1] / 6371 * 56, cx = 90 + i * 150, cy = 190;
      var outer = el('circle', { cx: cx, cy: cy, r: r, 'class': 's-line', 'stroke-width': 1.5 }, svg);
      var inner = el('circle', { cx: cx, cy: cy, r: r * 0.93 }, svg);
      var t = el('text', { x: cx, y: 300, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); t.textContent = w[0];
      var st = el('text', { x: cx, y: 318, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg);
      return { w: w, inner: inner, st: st, life: 6.5 * w[1] / 6371 };
    });
    var tIn = $('cool-t');
    function render() {
      var t = parseFloat(tIn.value);
      items.forEach(function (it) {
        var heat = Math.max(0, 1 - t / it.life);
        it.inner.setAttribute('fill', mix([60, 60, 70], [255, 120, 30], Math.pow(heat, 0.7)));
        it.st.textContent = heat > 0.3 ? 'active' : heat > 0.05 ? 'fading' : 'geologically dead';
      });
      $('cool-t-out').textContent = fmt(t, 2) + ' billion years after formation';
      tIn.setAttribute('aria-valuetext', fmt(t, 2) + ' billion years');
      var moon = items[0], earth = items[4];
      setText('cool-r-now', t >= 4.55 ? 'Today' : fmt(4.56 - t, 2) + ' billion years ago');
      setText('cool-r-moon', Math.max(0, 1 - t / moon.life) > 0.05 ? 'Still has internal heat' : 'Cooled; volcanism over');
      setText('cool-r-earth', 'About ' + Math.round(Math.max(0, 1 - t / earth.life) * 100) + '% of its early heat remaining (model)');
      setText('cool-note', 'Heat is stored throughout a world\u2019s volume but escapes only through its surface. Larger worlds have much less surface for their volume, so they stay hot and active far longer. Small worlds like the Moon and Mercury cooled early and have been geologically dead for billions of years.');
    }
    tIn.addEventListener('input', render);
    player($('cool-play'), function (dt) { var v = parseFloat(tIn.value) + dt * 0.5; if (v >= 4.56) { tIn.value = '4.56'; render(); return false; } tIn.value = String(v); render(); }, 'Let the worlds cool');
    render();
  })();

  /* ============== Greenhouse effect ============== */
  (function greenhouse() {
    var svg = $('gh-svg'); if (!svg) return;
    var W = 800, H = 360, CX = 400, CY = 330, R = 260;
    var P = { venus: [0.723, 0.77, 737, 'Venus'], earth: [1, 0.30, 288, 'Earth'], mars: [1.524, 0.25, 210, 'Mars'] };
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var atm = el('path', { d: 'M ' + (CX - R - 60) + ' ' + CY + ' A ' + (R + 60) + ' ' + (R + 60) + ' 0 0 1 ' + (CX + R + 60) + ' ' + CY + ' Z', 'class': 's-hl-fill' }, svg);
    var ground = el('path', { d: 'M ' + (CX - R) + ' ' + CY + ' A ' + R + ' ' + R + ' 0 0 1 ' + (CX + R) + ' ' + CY + ' Z' }, svg);
    var arrows = el('g', {}, svg);
    var tl = el('text', { x: CX, y: 150, 'text-anchor': 'middle', 'font-size': 28, 'font-weight': 700, 'class': 's-label' }, svg);
    var sl = el('text', { x: 30, y: 30, 'font-size': 12, 'class': 's-label' }, svg); sl.textContent = 'Sunlight in (visible)';
    var il = el('text', { x: 770, y: 30, 'text-anchor': 'end', 'font-size': 12, 'class': 's-label' }, svg); il.textContent = 'Infrared out to space';
    var planet = $('gh-planet'), gIn = $('gh-g');
    function arrow(x1, y1, x2, y2, cls, w, op) { el('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'class': cls, 'stroke-width': w, opacity: op }, arrows); }
    function render() {
      var p = P[planet.value], x = parseFloat(gIn.value), N = x <= -1.99 ? 0 : Math.pow(10, x);
      var Teq = 278 * Math.pow(1 - p[1], 0.25) / Math.sqrt(p[0]), Ts = Teq * Math.pow(1 + N, 0.25);
      while (arrows.firstChild) arrows.removeChild(arrows.firstChild);
      for (var i = 0; i < 4; i++) arrow(60 + i * 40, 40, 200 + i * 40, 250 - i * 10, 's-ray', 3, 0.9);
      var trapped = N / (1 + N);
      for (var k = 0; k < 6; k++) {
        var x0 = 460 + k * 45, esc = k / 6 >= trapped;
        arrow(x0, 250, x0 + 40, esc ? 40 : 120, 's-hl', 2, esc ? 0.9 : 0.5);
        if (!esc) arrow(x0 + 40, 120, x0 + 55, 240, 's-hl', 2, 0.5);
      }
      atm.setAttribute('opacity', (0.05 + 0.5 * Math.min(1, Math.log10(1 + N) / 2)).toFixed(2));
      var tc = Math.max(0, Math.min(1, (Ts - 150) / 600));
      ground.setAttribute('fill', mix([90, 120, 190], [230, 90, 40], tc));
      tl.textContent = fmt(Ts, 0) + ' K  (' + fmt(Ts - 273, 0) + ' °C)';
      $('gh-g-out').textContent = N < 0.02 ? 'none' : N < 1 ? 'weak' : N < 10 ? 'moderate' : 'extreme';
      gIn.setAttribute('aria-valuetext', 'greenhouse strength ' + $('gh-g-out').textContent + ', surface ' + fmt(Ts, 0) + ' kelvin');
      setText('gh-r-noatm', fmt(Teq, 0) + ' K (' + fmt(Teq - 273, 0) + ' °C)');
      setText('gh-r-surf', fmt(Ts, 0) + ' K (' + fmt(Ts - 273, 0) + ' °C)');
      setText('gh-r-actual', p[2] + ' K (' + (p[2] - 273) + ' °C)');
      setText('gh-r-water', Ts < 273 ? 'Frozen' : Ts < 373 ? 'Liquid water possible' : 'Boiled away');
      setText('gh-note', 'Visible sunlight passes through the atmosphere and warms the surface. The warm surface gives off infrared light, and greenhouse gases (carbon dioxide, water vapor, methane) absorb some of it and send part back down, so the surface must warm up until enough infrared finally escapes. ' + (N < 0.02 ? p[3] + ' with no greenhouse gases would sit at its \u201cno-greenhouse\u201d temperature.' : ''));
    }
    planet.addEventListener('change', function () { var p = P[planet.value]; var Teq = 278 * Math.pow(1 - p[1], 0.25) / Math.sqrt(p[0]); var N = Math.pow(p[2] / Teq, 4) - 1; gIn.value = N < 0.011 ? -2 : Math.log10(N).toFixed(3); render(); });
    gIn.addEventListener('input', render);
    $('gh-none').addEventListener('click', function () { gIn.value = -2; render(); });
    $('gh-actual').addEventListener('click', function () { planet.dispatchEvent(new Event('change')); });
    planet.dispatchEvent(new Event('change'));
  })();

  /* ============== Atmospheric escape ============== */
  (function escape() {
    var svg = $('esc-svg'); if (!svg) return;
    var W = 800, H = 280, X0 = 150, X1 = 760;
    var WORLDS = { moon: ['Moon', 2.4, 400], mercury: ['Mercury', 4.3, 600], mars: ['Mars', 5.0, 200], titan: ['Titan', 2.6, 150], earth: ['Earth', 11.2, 1000], venus: ['Venus', 10.4, 300], jupiter: ['Jupiter', 59.5, 1000] };
    var GASES = [['Hydrogen (H)', 1], ['Helium (He)', 4], ['Water vapor (H₂O)', 18], ['Nitrogen (N₂)', 28], ['Carbon dioxide (CO₂)', 44]];
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var bars = el('g', {}, svg), line = el('line', { y1: 30, y2: 250, 'class': 's-hl', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, svg);
    var lt = el('text', { y: 22, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg);
    var sel = $('esc-world');
    function xv(v) { return X0 + Math.min(1, v / 12) * (X1 - X0); }
    function render() {
      var w = WORLDS[sel.value], limit = w[1] / 6, kept = [], lost = [];
      while (bars.firstChild) bars.removeChild(bars.firstChild);
      GASES.forEach(function (g, i) {
        var v = Math.sqrt(3 * 1.38e-23 * w[2] / (g[1] * 1.66e-27)) / 1000, y = 45 + i * 42;
        var ok = v < limit; (ok ? kept : lost).push(g[0].split(' (')[0]);
        el('rect', { x: X0, y: y, width: xv(v) - X0, height: 24, 'class': ok ? 's-earth' : 's-hl-fill', opacity: 0.85 }, bars);
        var t = el('text', { x: X0 - 8, y: y + 17, 'text-anchor': 'end', 'font-size': 12, 'class': 's-label' }, bars); t.textContent = g[0];
        var tv = el('text', { x: xv(v) + 6, y: y + 17, 'font-size': 11, 'class': 's-label-muted' }, bars); tv.textContent = fmt(v, 2) + ' km/s ' + (ok ? 'kept' : 'escapes');
      });
      line.setAttribute('x1', xv(limit)); line.setAttribute('x2', xv(limit));
      lt.setAttribute('x', xv(limit)); lt.textContent = 'safe limit: 1/6 of escape speed';
      setText('esc-r-v', fmt(w[1], 1) + ' km/s'); setText('esc-r-t', w[2] + ' K');
      setText('esc-r-kept', kept.length ? kept.join(', ') : 'nothing');
      setText('esc-note', 'Gas molecules zip around at speeds set by temperature and mass: hotter and lighter means faster. A few molecules are always much faster than average, so a gas leaks away over billions of years unless its average speed is below about one-sixth of the escape speed. (Simplified model: upper-atmosphere temperatures are approximate.)');
    }
    sel.addEventListener('change', render); render();
  })();

  /* ============== Galilean moon resonance ============== */
  (function resonance() {
    var svg = $('res-svg'); if (!svg) return;
    var W = 800, H = 380, CX = 300, CY = 190;
    var M = [['Io', 1.769, 70], ['Europa', 3.551, 110], ['Ganymede', 7.155, 165]];
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 60, 17);
    M.forEach(function (m) { el('circle', { cx: CX, cy: CY, r: m[2], 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '2 4' }, svg); });
    el('circle', { cx: CX, cy: CY, r: 34, 'class': 's-hl-fill' }, svg);
    var jt = el('text', { x: CX, y: CY + 5, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-badge-text' }, svg); jt.textContent = 'Jupiter';
    var line = el('line', { x1: CX, y1: CY, 'class': 's-hl', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.5 }, svg);
    var dots = M.map(function (m) { var c = el('circle', { r: 8, 'class': m[0] === 'Io' ? 's-sun' : 's-moonlit' }, svg); var t = el('text', { 'font-size': 12, 'class': 's-label' }, svg); t.textContent = m[0]; return { c: c, t: t }; });
    var counts = M.map(function (m, i) { var t = el('text', { x: 520, y: 120 + i * 40, 'font-size': 15, 'class': 's-label' }, svg); return t; });
    var head = el('text', { x: 520, y: 80, 'font-size': 13, 'class': 's-label-muted' }, svg); head.textContent = 'Orbits completed';
    var tIn = $('res-t');
    function render() {
      var d = parseFloat(tIn.value);
      M.forEach(function (m, i) {
        var th = TAU * d / m[1], x = CX + m[2] * Math.cos(th), y = CY - m[2] * Math.sin(th);
        dots[i].c.setAttribute('cx', x); dots[i].c.setAttribute('cy', y); dots[i].t.setAttribute('x', x + 11); dots[i].t.setAttribute('y', y - 9);
        counts[i].textContent = m[0] + ': ' + fmt(d / m[1], 2);
        if (i === 2) { line.setAttribute('x2', CX + 200 * Math.cos(th)); line.setAttribute('y2', CY - 200 * Math.sin(th)); }
      });
      $('res-t-out').textContent = fmt(d, 1) + ' days';
      tIn.setAttribute('aria-valuetext', fmt(d, 1) + ' days');
      setText('res-r-ratio', '1 : ' + fmt(M[1][1] / M[0][1], 2) + ' : ' + fmt(M[2][1] / M[0][1], 2));
      setText('res-r-repeat', 'every ' + fmt(M[2][1], 2) + ' days');
      setText('res-note', 'For every orbit of Ganymede, Europa orbits twice and Io four times, so the three moons keep lining up in the same pattern. Those regular tugs keep Io\u2019s orbit slightly stretched, so Jupiter\u2019s tides squeeze and relax Io over and over. That constant flexing heats its interior and powers the most volcanically active world in the solar system.');
    }
    tIn.addEventListener('input', render);
    player($('res-play'), function (dt) { tIn.value = String((parseFloat(tIn.value) + dt * 1.5) % 28.6); render(); }, 'Play');
    render();
  })();

  /* ============== Activity: escape speed calculator ============== */
  (function vesc() {
    var m = $('ve-m'); if (!m) return;
    var r = $('ve-r'), pre = $('ve-pre');
    var PRE = { moon: [0.0123, 0.273], mercury: [0.055, 0.383], mars: [0.107, 0.532], earth: [1, 1], jupiter: [317.8, 10.97], ceres: [0.00016, 0.0741], ganymede: [0.0248, 0.413], titan: [0.0225, 0.404] };
    function render() {
      var M = parseFloat(m.value), R = parseFloat(r.value);
      if (!(M > 0 && R > 0)) { setText('ve-note', 'Enter a mass and radius greater than zero.'); return; }
      var v = 11.19 * Math.sqrt(M / R);
      setText('ve-r-v', fmt(v, 2) + ' km/s'); setText('ve-r-h', fmt(v * 3600, 0) + ' km/h');
      setText('ve-r-gas', v / 6 > 0.5 ? 'Can hold gases like nitrogen and CO₂ if it is cool enough' : 'Too weak to hold much atmosphere');
      setText('ve-note', 'Escape speed = √(2GM/R). It depends on mass divided by radius, so a massive world holds its gases, while a small one lets them leak away.');
    }
    [m, r].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () { var p = PRE[pre.value]; if (!p) return; m.value = p[0]; r.value = p[1]; render(); });
    render();
  })();

  /* ============== Activity: geological process drill ============== */
  (function drill() {
    var q = $('gp-q'); if (!q) return;
    var opts = $('gp-opts'), fb = $('gp-fb'), next = $('gp-next'), st = $('gp-streak');
    var P = window.PHYS106, KEY = 'phys106-gp-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur, order = [], ix = 0;
    var PROC = ['Impact cratering', 'Volcanism', 'Tectonics', 'Erosion'];
    var F = [
      ['A round bowl with a raised rim and a central peak on the Moon.', 0, 'Impacts blast out bowl-shaped craters; large ones rebound into central peaks.'],
      ['Smooth, dark lava plains (maria) on the Moon\u2019s near side.', 1, 'Lava flooded huge impact basins billions of years ago.'],
      ['Olympus Mons, a volcano three times as tall as Mount Everest on Mars.', 1, 'Shield volcanoes grow from repeated lava flows.'],
      ['The Himalayas, rising where India pushes into Asia.', 2, 'Colliding plates crumple crust into mountains.'],
      ['The Grand Canyon, carved by the Colorado River.', 3, 'Flowing water wears away rock over millions of years.'],
      ['Dry, branching riverbeds on the surface of Mars.', 3, 'Water once flowed and eroded channels on Mars.'],
      ['The Mid-Atlantic Ridge, where new seafloor forms.', 2, 'Plates spread apart and molten rock rises to fill the gap.'],
      ['Long cliffs hundreds of kilometers long on Mercury, formed as the planet shrank while cooling.', 2, 'Tectonic stresses from a shrinking interior wrinkled the crust.'],
      ['Sand dunes blown into ripples on Mars and in Earth\u2019s deserts.', 3, 'Wind is an agent of erosion too.'],
      ['Meteor Crater in Arizona, 1.2 km wide.', 0, 'A 50-meter iron meteorite struck about 50,000 years ago.'],
      ['Plumes of sulfur erupting hundreds of kilometers high on Io.', 1, 'Tidal heating powers Io\u2019s volcanoes.'],
      ['Valles Marineris, a canyon on Mars as long as the United States is wide.', 2, 'It formed mainly as the crust stretched and cracked, later widened by erosion and landslides.'],
      ['Mercury\u2019s densely overlapping craters.', 0, 'With little geological activity to erase them, craters pile up.'],
      ['Glacier-carved valleys in Yosemite National Park.', 3, 'Moving ice grinds and carves rock.'],
      ['Hawai\u2019i\u2019s chain of islands over a hot spot.', 1, 'Magma rising from deep in the mantle builds volcanic islands.'],
      ['The San Andreas Fault in California.', 2, 'Two plates grind past each other.']
    ];
    function newQ() {
      if (ix >= order.length) { order = P.shuffle(F.map(function (_, i) { return i; })); ix = 0; }
      cur = F[order[ix++]];
      q.textContent = 'Which process made this? ' + cur[0];
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      PROC.forEach(function (p, i) { var b = document.createElement('button'); b.type = 'button'; b.textContent = p; b.addEventListener('click', function () { answer(i, b); }); opts.appendChild(b); });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(i, b) {
      var ok = i === cur[1];
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (x, k) { x.disabled = true; if (k === cur[1]) x.classList.add('choice-right'); });
      if (!ok) b.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct. ' : '✗ It was ' + PROC[cur[1]].toLowerCase() + '. ') + cur[2];
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
