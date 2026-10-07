/* Module 4: solar system explorer, frost line, collapsing nebula, radiometric dating,
   density calculator, age calculator, "name that planet" drill. */
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
  // name, a (AU), period (yr), diameter (km), mass (Earth=1), density (g/cm3), moons, tilt, day, temp, type, fact
  var PL = [
    ['Mercury', 0.387, 0.241, 4879, 0.055, 5.43, '0', '0°', '58.6 days', 'about 170 °C average, −180 to 430 °C', 'terrestrial', 'The smallest planet, heavily cratered, with a huge iron core.'],
    ['Venus', 0.723, 0.615, 12104, 0.815, 5.24, '0', '177° (spins backward)', '243 days, retrograde', 'about 465 °C', 'terrestrial', 'Nearly Earth\u2019s size, with a crushing carbon-dioxide atmosphere and the hottest surface of any planet.'],
    ['Earth', 1.0, 1.0, 12742, 1.0, 5.51, '1', '23.4°', '23.9 hours', 'about 15 °C', 'terrestrial', 'The only world known to have surface oceans of liquid water and life.'],
    ['Mars', 1.524, 1.881, 6779, 0.107, 3.93, '2', '25.2°', '24.6 hours', 'about −65 °C', 'terrestrial', 'A cold desert world with the largest volcano and canyon in the solar system and evidence of ancient water.'],
    ['Jupiter', 5.20, 11.86, 139820, 317.8, 1.33, '95+', '3.1°', '9.9 hours', 'about −110 °C at the cloud tops', 'jovian', 'The largest planet, more than twice as massive as all the others combined, with the Great Red Spot storm.'],
    ['Saturn', 9.54, 29.46, 116460, 95.2, 0.69, '270+', '26.7°', '10.7 hours', 'about −140 °C at the cloud tops', 'jovian', 'Famous for its bright rings; its average density is less than water\u2019s.'],
    ['Uranus', 19.19, 84.0, 50724, 14.5, 1.27, '28+', '97.8° (tipped on its side)', '17.2 hours, retrograde', 'about −195 °C', 'jovian', 'An ice giant tipped on its side, so each pole gets 42 years of daylight and then 42 years of night.'],
    ['Neptune', 30.07, 164.8, 49244, 17.1, 1.64, '16', '28.3°', '16.1 hours', 'about −200 °C', 'jovian', 'A deep-blue ice giant with the fastest winds in the solar system, over 2,000 km/h.']
  ];
  window.PHYS106_PLANETS = PL;

  /* ============== Solar system explorer ============== */
  (function explorer() {
    var svg = $('ssx-svg'); if (!svg) return;
    var W = 800, H = 440, CX = 400, CY = 220;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 90, 5);
    var orbits = el('g', {}, svg), belt = el('g', {}, svg), dots = el('g', {}, svg);
    el('circle', { cx: CX, cy: CY, r: 9, 'class': 's-sun' }, svg);
    var hl = el('circle', { r: 14, 'class': 's-hl', 'stroke-width': 2 }, svg);
    var cap = el('text', { x: 16, y: 26, 'font-size': 12, 'class': 's-label-muted' }, svg);
    var sel = $('ssx-planet'), scale = $('ssx-scale'), t = 0;
    PL.forEach(function (p, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = p[0]; sel.appendChild(o); });
    function rpx(a) { return scale.value === 'true' ? a / 30.07 * 200 : 26 + Math.log(a / 0.387) / Math.log(30.07 / 0.387) * 180; }
    function build() {
      while (orbits.firstChild) orbits.removeChild(orbits.firstChild);
      while (belt.firstChild) belt.removeChild(belt.firstChild);
      PL.forEach(function (p) { el('circle', { cx: CX, cy: CY, r: rpx(p[1]), 'class': 's-line', 'stroke-width': 1, opacity: 0.6 }, orbits); });
      var s = 11;
      function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
      for (var k = 0; k < 160; k++) { var a = 2.2 + rnd() * 1.1, th = rnd() * TAU; el('circle', { cx: CX + rpx(a) * Math.cos(th), cy: CY + rpx(a) * Math.sin(th), r: 0.9, 'class': 's-label-muted' }, belt); }
      cap.textContent = scale.value === 'true' ? 'Distances to scale (planet sizes enlarged)' : 'Distances compressed so the inner planets are visible';
    }
    function render() {
      while (dots.firstChild) dots.removeChild(dots.firstChild);
      var sI = parseInt(sel.value, 10);
      PL.forEach(function (p, i) {
        var th = -TAU * t / p[2] + i, r = rpx(p[1]);
        var x = CX + r * Math.cos(th), y = CY + r * Math.sin(th), size = p[10] === 'jovian' ? 6 + p[3] / 139820 * 5 : 3 + p[3] / 12742 * 2;
        el('circle', { cx: x, cy: y, r: size, 'class': p[0] === 'Earth' ? 's-earth' : 's-hl-fill', opacity: i === sI ? 1 : 0.75 }, dots);
        var lt = el('text', { x: x + size + 3, y: y - size - 2, 'font-size': 11, 'class': i === sI ? 's-label' : 's-label-muted' }, dots); lt.textContent = p[0];
        if (i === sI) { hl.setAttribute('cx', x); hl.setAttribute('cy', y); hl.setAttribute('r', size + 6); }
      });
      var p = PL[sI];
      setText('ssx-r-dist', fmt(p[1], 2) + ' AU'); setText('ssx-r-year', p[2] < 1 ? fmt(p[2] * 365.25, 0) + ' days' : fmt(p[2], 1) + ' years');
      setText('ssx-r-size', fmt(p[3], 0) + ' km (' + fmt(p[3] / 12742, 2) + ' × Earth)'); setText('ssx-r-mass', fmt(p[4], p[4] < 1 ? 3 : 1) + ' × Earth');
      setText('ssx-r-dens', fmt(p[5], 2) + ' g/cm³'); setText('ssx-r-moons', p[6]); setText('ssx-r-day', p[8]); setText('ssx-r-temp', p[9]);
      setText('ssx-note', p[0] + ' (' + p[10] + '). ' + p[11] + ' Axis tilt: ' + p[7] + '.');
      $('ssx-t-out').textContent = fmt(t, 1) + ' years';
    }
    sel.addEventListener('change', render);
    scale.addEventListener('change', function () { build(); render(); });
    var tIn = $('ssx-t');
    tIn.addEventListener('input', function () { t = parseFloat(tIn.value); render(); });
    player($('ssx-play'), function (dt) { t = (t + dt * 0.8) % 200; tIn.value = String(t); render(); }, 'Play orbits');
    sel.value = '2'; build(); render();
  })();

  /* ============== Frost line ============== */
  (function frost() {
    var svg = $('frost-svg'); if (!svg) return;
    var W = 800, H = 300, X0 = 60, X1 = 760, LMIN = Math.log10(0.05), LMAX = Math.log10(50);
    function xd(d) { return X0 + (Math.log10(d) - LMIN) / (LMAX - LMIN) * (X1 - X0); }
    function T(d) { return 300 / Math.sqrt(d); } // simplified nebula temperature profile
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    el('circle', { cx: 28, cy: 110, r: 20, 'class': 's-sun' }, svg);
    var n = 120;
    for (var i = 0; i < n; i++) {
      var d0 = Math.pow(10, LMIN + i / n * (LMAX - LMIN)), d1 = Math.pow(10, LMIN + (i + 1) / n * (LMAX - LMIN)), tt = T(d0);
      el('rect', { x: xd(d0), y: 80, width: xd(d1) - xd(d0) + 0.6, height: 60, fill: tt > 1300 ? '#8a3a2a' : tt > 150 ? '#8a6a45' : '#6f93c7', opacity: 0.85 }, svg);
    }
    var fx = xd(Math.pow(300 / 150, 2));
    el('line', { x1: fx, y1: 60, x2: fx, y2: 160, 'class': 's-hl', 'stroke-width': 2, 'stroke-dasharray': '5 3' }, svg);
    var ft = el('text', { x: fx, y: 52, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, 'class': 's-label' }, svg); ft.textContent = 'frost line';
    [['Mercury', 0.387], ['Venus', 0.723], ['Earth', 1], ['Mars', 1.524], ['Jupiter', 5.2], ['Saturn', 9.54], ['Uranus', 19.2], ['Neptune', 30.1]].forEach(function (p, i) {
      el('circle', { cx: xd(p[1]), cy: 110, r: 3.5, 'class': 's-star' }, svg);
      var t = el('text', { x: xd(p[1]), y: i % 2 ? 178 : 194, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = p[0];
    });
    [0.1, 0.3, 1, 3, 10, 30].forEach(function (d) { var t = el('text', { x: xd(d), y: 222, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); t.textContent = d + ' AU'; });
    var lg = el('text', { x: X0, y: 250, 'font-size': 12, 'class': 's-label' }, svg); lg.textContent = 'Solid grains:  red = only metals · brown = metals + rock · blue = metals + rock + ices';
    var mk = el('polygon', { 'class': 's-hl-fill' }, svg);
    var d = $('frost-d');
    function render() {
      var dist = Math.pow(10, parseFloat(d.value)), tt = T(dist), x = xd(dist);
      mk.setAttribute('points', (x - 8) + ',70 ' + (x + 8) + ',70 ' + x + ',82');
      var solids = tt > 1600 ? 'none (all vapor)' : tt > 1300 ? 'metals only' : tt > 150 ? 'metals and rock' : 'metals, rock, and hydrogen compounds (ices)';
      var frac = tt > 1600 ? 0 : tt > 1300 ? 0.2 : tt > 150 ? 0.6 : 2.0;
      $('frost-d-out').textContent = fmt(dist, dist < 1 ? 2 : 1) + ' AU';
      d.setAttribute('aria-valuetext', fmt(dist, 2) + ' AU, ' + solids);
      setText('frost-r-t', fmt(tt, 0) + ' K (' + fmt(tt - 273, 0) + ' °C)');
      setText('frost-r-solid', solids);
      setText('frost-r-frac', fmt(frac, 1) + '% of the nebula\u2019s mass');
      setText('frost-r-type', tt > 150 ? 'Small rocky (terrestrial) planet' : 'Large icy core that can capture hydrogen and helium gas (jovian planet)');
      setText('frost-note', tt > 150 ? 'Inside the frost line it is too warm for ices to freeze, so planetesimals could only grow from metal and rock, just a fraction of a percent of the nebula\u2019s material. Planets here stayed small and rocky.'
        : 'Beyond the frost line, hydrogen compounds such as water, methane, and ammonia freeze into ice. With several times more solid material available, cores grew massive enough to pull in the surrounding hydrogen and helium gas.');
    }
    d.addEventListener('input', render); render();
  })();

  /* ============== Collapsing nebula ============== */
  (function collapse() {
    var svg = $('neb-svg'); if (!svg) return;
    var W = 800, H = 340, CX = 400, CY = 170;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg); starfield(svg, W, H, 60, 9);
    var cloud = el('ellipse', { cx: CX, cy: CY, 'class': 's-hl-fill', opacity: 0.18 }, svg);
    var g = el('g', {}, svg), core = el('circle', { cx: CX, cy: CY, 'class': 's-sun' }, svg);
    var s = 3, parts = [];
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < 90; i++) parts.push({ r: Math.sqrt(rnd()), th: rnd() * TAU, z: rnd() * 2 - 1, e: el('circle', { r: 2, 'class': 's-star' }, g) });
    var R = $('neb-r'), ang = 0;
    function render() {
      var f = parseFloat(R.value); // fraction of original radius, 1 -> 0.05
      var rad = 150 * Math.sqrt(f) + 20, flat = Math.max(0.12, Math.min(1, (f - 0.05) / 0.5 + 0.12));
      cloud.setAttribute('rx', rad); cloud.setAttribute('ry', rad * flat);
      core.setAttribute('r', 4 + (1 - f) * 12);
      parts.forEach(function (p) { var x = CX + p.r * rad * Math.cos(p.th + ang * (1 / Math.max(0.15, p.r))), y = CY + (p.r * rad * Math.sin(p.th + ang / Math.max(0.15, p.r)) * 0.25 + p.z * rad * 0.8) * flat; p.e.setAttribute('cx', x.toFixed(1)); p.e.setAttribute('cy', y.toFixed(1)); });
      var spin = 1 / (f * f);
      $('neb-r-out').textContent = Math.round(f * 100) + '% of original size';
      R.setAttribute('aria-valuetext', Math.round(f * 100) + ' percent of original size');
      setText('neb-r-spin', fmt(spin, spin < 10 ? 1 : 0) + ' × faster');
      setText('neb-r-temp', f > 0.7 ? 'Cold (about 10–20 K)' : f > 0.3 ? 'Warming as gravitational energy becomes heat' : 'Hot center: a protostar forming');
      setText('neb-r-shape', flat > 0.8 ? 'Roughly round cloud' : flat > 0.35 ? 'Flattening' : 'Thin spinning disk');
      setText('neb-note', 'Three things happen as the cloud collapses. It heats up (gravitational potential energy turns into thermal energy), it spins faster (conservation of angular momentum: half the size means four times the spin), and it flattens into a disk (collisions cancel out up-and-down motions, while the spin prevents collapse in the disk\u2019s plane).');
    }
    R.addEventListener('input', render);
    player($('neb-play'), function (dt) { ang += dt * 0.8 / Math.max(0.05, parseFloat(R.value)); if (parseFloat(R.value) > 0.06) R.value = String(Math.max(0.05, parseFloat(R.value) - dt * 0.12)); render(); }, 'Collapse and spin');
    render();
  })();

  /* ============== Radiometric dating ============== */
  (function decay() {
    var svg = $('rad-svg'); if (!svg) return;
    var W = 800, H = 320, N = 400, COLS = 25;
    el('rect', { width: W, height: H, 'class': 's-space' }, svg);
    var cells = [], s = 21;
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < N; i++) { var t = -Math.log(rnd()) / Math.LN2; cells.push({ t: t, e: el('rect', { x: 30 + (i % COLS) * 13, y: 40 + Math.floor(i / COLS) * 16, width: 10, height: 12, rx: 2 }, svg) }); }
    var l1 = el('text', { x: 30, y: 26, 'font-size': 12, 'class': 's-label' }, svg); l1.textContent = 'Sample of 400 atoms: filled = potassium-40 (parent), outline = argon-40 (daughter)';
    var X0 = 400, X1 = 770, Y0 = 290, Y1 = 50;
    el('line', { x1: X0, y1: Y0, x2: X1, y2: Y0, 'class': 's-line' }, svg); el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, 'class': 's-line' }, svg);
    var d = ''; for (var k = 0; k <= 100; k++) { var h = k / 100 * 5; d += (k ? ' L ' : 'M ') + (X0 + h / 5 * (X1 - X0)).toFixed(1) + ' ' + (Y0 - Math.pow(0.5, h) * (Y0 - Y1)).toFixed(1); }
    el('path', { d: d, 'class': 's-line', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, svg);
    for (var j = 0; j <= 5; j++) { var tx = el('text', { x: X0 + j / 5 * (X1 - X0), y: Y0 + 16, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); tx.textContent = fmt(j * 1.25, 2) + ' Gyr'; }
    var yl = el('text', { x: X0 + 6, y: Y1 - 8, 'font-size': 11, 'class': 's-label-muted' }, svg); yl.textContent = 'fraction of parent left';
    var dot = el('circle', { r: 6, 'class': 's-hl-fill' }, svg);
    var tIn = $('rad-t');
    function render() {
      var h = parseFloat(tIn.value), left = 0;
      cells.forEach(function (c) { var alive = c.t > h; if (alive) left++; c.e.setAttribute('class', alive ? 's-hl-fill' : 's-line'); c.e.setAttribute('stroke-width', '1'); if (!alive) c.e.setAttribute('fill', 'none'); else c.e.removeAttribute('fill'); });
      dot.setAttribute('cx', X0 + h / 5 * (X1 - X0)); dot.setAttribute('cy', Y0 - left / N * (Y0 - Y1));
      $('rad-t-out').textContent = fmt(h, 2) + ' half-lives';
      tIn.setAttribute('aria-valuetext', fmt(h, 2) + ' half-lives, ' + left + ' parent atoms left');
      setText('rad-r-age', fmt(h * 1.25, 2) + ' billion years');
      setText('rad-r-left', left + ' of 400 (' + fmt(left / 4, 1) + '%)');
      setText('rad-r-ratio', left ? fmt((N - left) / left, 2) + ' daughter per parent' : 'no parent left');
      setText('rad-note', 'No one can predict when any single atom will decay, but in a large sample half of them decay every half-life. Measuring the ratio of daughter to parent atoms in a rock tells you how many half-lives have passed since it solidified.');
    }
    tIn.addEventListener('input', render);
    player($('rad-play'), function (dt) { var v = parseFloat(tIn.value) + dt * 0.6; if (v >= 5) { tIn.value = '5'; render(); return false; } tIn.value = String(v); render(); }, 'Let time pass');
    render();
  })();

  /* ============== Activity: density calculator ============== */
  (function density() {
    var m = $('den-m'); if (!m) return;
    var r = $('den-r'), pre = $('den-pre');
    PL.forEach(function (p, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = p[0]; pre.appendChild(o); });
    [['Moon', 0.0123, 0.2727], ['Pluto', 0.0022, 0.1868], ['Ceres', 0.00016, 0.0741]].forEach(function (x) { var o = document.createElement('option'); o.value = 'x' + x[0]; o.textContent = x[0]; o.setAttribute('data-m', x[1]); o.setAttribute('data-r', x[2]); pre.appendChild(o); });
    function render() {
      var M = parseFloat(m.value), Rr = parseFloat(r.value);
      if (!(M > 0 && Rr > 0)) { setText('den-note', 'Enter a mass and radius greater than zero.'); return; }
      var rho = 5.51 * M / (Rr * Rr * Rr);
      setText('den-r-d', fmt(rho, 2) + ' g/cm³');
      setText('den-r-k', rho > 4.5 ? 'Metal and rock (dense, iron-rich)' : rho > 3 ? 'Mostly rock' : rho > 1.5 ? 'Rock and ice mix' : 'Mostly light gases or ices');
      setText('den-note', 'For comparison: water is 1.0 g/cm³, typical rock about 3, iron about 7.9. ' + (rho < 1 ? 'Less dense than water: in a large enough bathtub it would float!' : ''));
    }
    [m, r].forEach(function (i) { i.addEventListener('input', render); });
    pre.addEventListener('change', function () {
      var o = pre.options[pre.selectedIndex];
      if (/^x/.test(pre.value)) { m.value = o.getAttribute('data-m'); r.value = o.getAttribute('data-r'); }
      else if (pre.value !== '') { var p = PL[+pre.value]; m.value = p[4]; r.value = (p[3] / 12742).toFixed(3); }
      render();
    });
    render();
  })();

  /* ============== Activity: radiometric age calculator ============== */
  (function age() {
    var f = $('age-f'); if (!f) return;
    var iso = $('age-iso');
    function render() {
      var pct = parseFloat(f.value), hl = parseFloat(iso.value);
      if (!(pct > 0 && pct <= 100)) { setText('age-note', 'Enter a percentage between 0 and 100.'); return; }
      var n = Math.log(100 / pct) / Math.LN2, a = n * hl, name = iso.options[iso.selectedIndex].text;
      setText('age-r-n', fmt(n, 2) + ' half-lives');
      setText('age-r-a', a >= 1e9 ? fmt(a / 1e9, 2) + ' billion years' : a >= 1e6 ? fmt(a / 1e6, 1) + ' million years' : fmt(a, 0) + ' years');
      setText('age-note', 'With ' + fmt(pct, 1) + '% of the ' + name.split(' (')[0] + ' left, ' + fmt(n, 2) + ' half-lives have passed.' + (hl < 1e5 && a > 60000 ? ' Carbon-14 is only useful for ages up to about 50,000 years; for older samples, too little is left to measure.' : ''));
    }
    [f, iso].forEach(function (i) { i.addEventListener('input', render); i.addEventListener('change', render); });
    render();
  })();

  /* ============== Activity: name that planet ============== */
  (function drill() {
    var q = $('ntp-q'); if (!q) return;
    var opts = $('ntp-opts'), fb = $('ntp-fb'), next = $('ntp-next'), st = $('ntp-streak');
    var P = window.PHYS106, KEY = 'phys106-ntp-v1', rec = P.load(KEY, { best: 0 }), streak = 0, cur;
    function clues(p) {
      var c = [
        'It is ' + fmt(p[1], 2) + ' AU from the Sun.', 'Its average density is ' + fmt(p[5], 2) + ' g/cm³.', 'Its diameter is ' + fmt(p[3], 0) + ' km.',
        'It has ' + (p[6] === '0' ? 'no moons' : p[6] === '1' ? 'one moon' : p[6] + ' known moons') + '.', 'One day there lasts ' + p[8] + '.', 'Its axis tilt is ' + p[7] + '.', 'Its temperature is ' + p[9] + '.'];
      return P.shuffle(c).slice(0, 2);
    }
    function newQ() {
      var i = Math.floor(Math.random() * PL.length), p = PL[i];
      cur = i;
      q.textContent = 'Clues: ' + clues(p).join(' ') + ' Which planet is it?';
      var others = P.shuffle(PL.map(function (_, k) { return k; }).filter(function (k) { return k !== i; })).slice(0, 3);
      opts.innerHTML = ''; fb.textContent = ''; next.hidden = true;
      P.shuffle([i].concat(others)).forEach(function (k) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = PL[k][0];
        b.addEventListener('click', function () { answer(k, b); }); opts.appendChild(b);
      });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(k, btn) {
      var ok = k === cur;
      Array.prototype.forEach.call(opts.querySelectorAll('button'), function (b) { b.disabled = true; if (b.textContent === PL[cur][0]) b.classList.add('choice-right'); });
      if (!ok) btn.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0; if (streak > rec.best) { rec.best = streak; P.save(KEY, rec); }
      fb.textContent = (ok ? '✓ Correct. ' : '✗ It was ' + PL[cur][0] + '. ') + PL[cur][11];
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      next.hidden = false; next.focus();
    }
    next.addEventListener('click', function () { newQ(); q.focus(); });
    newQ();
  })();
})();
