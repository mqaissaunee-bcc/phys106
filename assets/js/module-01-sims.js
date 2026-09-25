/* Week 1 simulations. Each sim finds its root by id and does nothing if absent.
   All drawing is SVG with theme classes (see site.css .s-*). */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function setText(id, t) { var n = $(id); if (n) n.textContent = t; }

  // deterministic star field so it does not flicker between renders
  function starfield(svg, w, h, n, seed) {
    var g = el('g', { 'aria-hidden': 'true' }, svg);
    var s = seed || 7;
    function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var i = 0; i < n; i++) {
      el('circle', { cx: (rnd() * w).toFixed(1), cy: (rnd() * h).toFixed(1), r: (rnd() * 1.1 + 0.3).toFixed(2), 'class': 's-star', opacity: (rnd() * 0.6 + 0.2).toFixed(2) }, g);
    }
    return g;
  }

  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function sci(x, digits) {
    if (x === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(x)));
    if (e >= -2 && e <= 4) return fmt(x, digits);
    var m = x / Math.pow(10, e);
    var ms = m.toFixed(digits === undefined ? 1 : digits);
    if (parseFloat(ms) >= 10) { e += 1; ms = (m / 10).toFixed(digits === undefined ? 1 : digits); }
    return ms + ' × 10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
  }
  function fmt(x, digits) {
    var d = digits === undefined ? 1 : digits;
    if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString('en-US');
    return Number(x.toFixed(d)).toLocaleString('en-US', { maximumFractionDigits: d });
  }
  function duration(sec) {
    if (sec < 1e-3) return sci(sec * 1e6, 1) + ' microseconds';
    if (sec < 1) return fmt(sec * 1000, 1) + ' milliseconds';
    if (sec < 120) return fmt(sec, 1) + ' seconds';
    if (sec < 7200) return fmt(sec / 60, 1) + ' minutes';
    if (sec < 172800) return fmt(sec / 3600, 1) + ' hours';
    if (sec < 3.156e7 * 2) return fmt(sec / 86400, 1) + ' days';
    var y = sec / 3.156e7;
    if (y < 1e6) return fmt(y, y < 100 ? 1 : 0) + ' years';
    if (y < 1e9) return fmt(y / 1e6, 1) + ' million years';
    return fmt(y / 1e9, 1) + ' billion years';
  }

  /* =====================================================================
     A. Powers-of-ten scale explorer
     ===================================================================== */
  (function scaleSim() {
    var svg = $('scale-svg');
    if (!svg) return;
    var W = 800, H = 440, CX = 400, CY = 190, VIEW = 700; // VIEW px = field width
    var AU = 1.496e11, LY = 9.461e15, C = 2.998e8;
    var OBJ = [
      { name: 'A person', s: 1.7, fact: 'An adult is about 1.7 m tall. Light crosses that in under 6 billionths of a second.' },
      { name: 'A football field', s: 110, fact: 'About 110 m long, end zones included.' },
      { name: 'New Jersey, north to south', s: 2.7e5, fact: 'Roughly 270 km from High Point to Cape May.' },
      { name: 'Earth', s: 1.27e7, fact: 'Earth is 12,700 km across. Light could circle it about 7½ times in one second.' },
      { name: 'The Moon\u2019s orbit', s: 7.7e8, fact: 'The Moon orbits about 384,000 km from Earth, roughly 30 Earth diameters away.' },
      { name: 'The Sun', s: 1.39e9, fact: 'About 109 Earths would fit side by side across the Sun\u2019s face.' },
      { name: 'Earth\u2019s orbit', s: 2 * AU, fact: 'Earth sits 1 AU (150 million km) from the Sun. Sunlight takes about 8⅓ minutes to reach us.' },
      { name: 'Neptune\u2019s orbit', s: 60 * AU, fact: 'Neptune is 30 AU from the Sun. Sunlight takes about 4 hours to get there.' },
      { name: 'Out to the nearest star', s: 2 * 4.24 * LY, fact: 'Proxima Centauri is 4.24 light-years away. Our fastest spacecraft would need tens of thousands of years.' },
      { name: 'Milky Way disk', s: 1.0e5 * LY, fact: 'Our galaxy\u2019s disk is about 100,000 light-years across and holds a few hundred billion stars.' },
      { name: 'Local Group', s: 1.0e7 * LY, fact: 'The Milky Way, Andromeda, and dozens of small galaxies share this region about 10 million light-years across.' },
      { name: 'Laniakea Supercluster', s: 5.2e8 * LY, fact: 'A web of galaxy groups and clusters about 500 million light-years across, containing roughly 100,000 galaxies.' },
      { name: 'Observable universe', s: 9.3e10 * LY, fact: 'About 93 billion light-years across today. It is larger than 2 × 13.8 billion light-years because space kept expanding while the light traveled.' }
    ];

    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, 360, 140, 11);
    var defs = el('defs', {}, svg);
    var clip = el('clipPath', { id: 'scale-clip' }, defs);
    el('rect', { x: 0, y: 0, width: W, height: 362 }, clip);
    var circles = el('g', { 'clip-path': 'url(#scale-clip)' }, svg);
    // log ruler
    var RX0 = 50, RX1 = 750, RY = 395, EMIN = 0, EMAX = 27;
    function rx(e) { return RX0 + (e - EMIN) / (EMAX - EMIN) * (RX1 - RX0); }
    var ruler = el('g', { 'aria-hidden': 'true' }, svg);
    el('line', { x1: RX0, y1: RY, x2: RX1, y2: RY, 'class': 's-line', 'stroke-width': 1.5 }, ruler);
    for (var t = 0; t <= 27; t += 3) {
      el('line', { x1: rx(t), y1: RY - 6, x2: rx(t), y2: RY + 6, 'class': 's-line', 'stroke-width': 1 }, ruler);
      var lab = el('text', { x: rx(t), y: RY + 24, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, ruler);
      lab.textContent = '10' + String(t).split('').map(function (c) { return SUP[c]; }).join('') + ' m';
    }
    OBJ.forEach(function (o) {
      el('circle', { cx: rx(Math.log10(o.s)), cy: RY, r: 3.5, 'class': 's-hl-fill' }, ruler);
    });
    var marker = el('polygon', { points: '0,0 -8,-13 8,-13', 'class': 's-hl-fill' }, ruler);

    var slider = $('scale-range');
    var jump = $('scale-jump');
    var tourBtn = $('scale-tour');
    OBJ.forEach(function (o, i) {
      var opt = document.createElement('option');
      opt.value = String(i); opt.textContent = o.name;
      jump.appendChild(opt);
    });

    function focusObj(e) {
      var best = 0, bd = Infinity;
      OBJ.forEach(function (o, i) {
        var d = Math.abs(Math.log10(o.s) - (e - 0.1));
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }

    function render() {
      var e = parseFloat(slider.value);
      var field = Math.pow(10, e);
      while (circles.firstChild) circles.removeChild(circles.firstChild);
      var fi = focusObj(e);
      OBJ.forEach(function (o, i) {
        var d = o.s / field * VIEW;
        if (d < 1.2 || d > 4000) return;
        var r = Math.max(d / 2, 1.5);
        var isF = i === fi;
        el('circle', { cx: CX, cy: CY, r: r.toFixed(2), 'class': isF ? 's-hl' : 's-line', 'stroke-width': isF ? 2.5 : 1.2 }, circles);
        if (d > 28 && d < 1400) {
          var ly = CY - Math.min(r, 175) - 6;
          if (ly < 16) ly = 16;
          var tx = el('text', { x: CX, y: ly, 'text-anchor': 'middle', 'font-size': isF ? 15 : 12, 'font-weight': isF ? 700 : 400, 'class': isF ? 's-label' : 's-label-muted' }, circles);
          tx.textContent = o.name;
        } else if (d <= 28 && isF) {
          var t2 = el('text', { x: CX + 14, y: CY + 5, 'font-size': 14, 'font-weight': 700, 'class': 's-label' }, circles);
          t2.textContent = o.name + ' (tiny at this zoom)';
        }
      });
      // field-of-view bracket
      el('line', { x1: CX - VIEW / 2, y1: 350, x2: CX + VIEW / 2, y2: 350, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '4 4' }, circles);
      var fl = el('text', { x: CX, y: 344, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, circles);
      fl.textContent = 'field of view: ' + sci(field, 1) + ' m';
      marker.setAttribute('transform', 'translate(' + rx(e).toFixed(1) + ',' + (RY - 4) + ')');

      var o = OBJ[fi];
      $('scale-out').textContent = sci(field, 1) + ' m';
      setText('scale-r-field', sci(field, 1) + ' m');
      var km = field / 1000;
      setText('scale-r-km', km < 1 ? fmt(field, 1) + ' m' : sci(km, 1) + ' km');
      var astro;
      if (field < 1e9) astro = sci(field / 6.371e6 / 2, 2) + ' Earth diameters';
      else if (field < 0.05 * LY) astro = fmt(field / AU, field / AU < 10 ? 2 : 0) + ' AU';
      else astro = (field / LY < 1e6 ? fmt(field / LY, 1) : sci(field / LY, 1)) + ' light-years';
      setText('scale-r-astro', astro);
      setText('scale-r-light', duration(field / C));
      setText('scale-note', o.name + ': ' + o.fact);
      slider.setAttribute('aria-valuetext', sci(field, 1) + ' meters, nearest landmark ' + o.name);
    }
    slider.addEventListener('input', render);
    jump.addEventListener('change', function () {
      if (jump.value === '') return;
      var o = OBJ[parseInt(jump.value, 10)];
      slider.value = Math.min(27, Math.log10(o.s) + 0.15).toFixed(2);
      render();
    });

    var touring = false, raf = null;
    tourBtn.addEventListener('click', function () {
      if (touring) { stopTour(); return; }
      touring = true;
      tourBtn.textContent = 'Pause tour';
      tourBtn.setAttribute('aria-pressed', 'true');
      if (parseFloat(slider.value) >= 26.9) slider.value = '0';
      var last = null;
      function step(ts) {
        if (!touring) return;
        if (last === null) last = ts;
        var dt = (ts - last) / 1000; last = ts;
        var v = parseFloat(slider.value) + dt * (REDUCED ? 3 : 1.2);
        if (v >= 27) { v = 27; slider.value = String(v); render(); stopTour(); return; }
        slider.value = String(v);
        render();
        raf = window.requestAnimationFrame(step);
      }
      raf = window.requestAnimationFrame(step);
    });
    function stopTour() {
      touring = false;
      if (raf) window.cancelAnimationFrame(raf);
      tourBtn.textContent = 'Play zoom tour';
      tourBtn.setAttribute('aria-pressed', 'false');
    }
    render();
  })();

  /* =====================================================================
     B. Cosmic calendar
     ===================================================================== */
  (function calendarSim() {
    var svg = $('cal-svg');
    if (!svg) return;
    var AGE = 13.8e9;
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var EVENTS = [
      { name: 'Big Bang', ago: 13.8e9 },
      { name: 'First stars shine', ago: 13.6e9 },
      { name: 'Milky Way\u2019s oldest stars form', ago: 13.0e9 },
      { name: 'Sun and planets form', ago: 4.6e9 },
      { name: 'Earliest evidence of life on Earth', ago: 3.8e9 },
      { name: 'Oxygen builds up in Earth\u2019s atmosphere', ago: 2.4e9 },
      { name: 'Burst of complex animal life (Cambrian)', ago: 5.4e8 },
      { name: 'Dinosaurs go extinct', ago: 6.6e7 },
      { name: 'Modern humans (Homo sapiens) appear', ago: 3.0e5 },
      { name: 'Great Pyramid of Giza built', ago: 4.5e3 },
      { name: 'Galileo turns a telescope to the sky', ago: 417 }
    ];
    var W = 800, H = 420, CX = 250, CY = 210, R = 160;
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, H, 90, 3);
    el('circle', { cx: CX, cy: CY, r: R, 'class': 's-line', 'stroke-width': 2 }, svg);
    var cum = 0;
    MONTHS.forEach(function (m, i) {
      var a = cum / 365 * 2 * Math.PI - Math.PI / 2;
      el('line', { x1: CX + (R - 10) * Math.cos(a), y1: CY + (R - 10) * Math.sin(a), x2: CX + (R + 10) * Math.cos(a), y2: CY + (R + 10) * Math.sin(a), 'class': 's-line', 'stroke-width': 1.5 }, svg);
      var mid = (cum + MDAYS[i] / 2) / 365 * 2 * Math.PI - Math.PI / 2;
      var t = el('text', { x: CX + (R + 28) * Math.cos(mid), y: CY + (R + 28) * Math.sin(mid) + 4, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg);
      t.textContent = m.slice(0, 3);
      cum += MDAYS[i];
    });
    EVENTS.forEach(function (ev) {
      var f = 1 - ev.ago / AGE;
      var a = f * 2 * Math.PI - Math.PI / 2;
      el('circle', { cx: CX + R * Math.cos(a), cy: CY + R * Math.sin(a), r: 4, 'class': 's-hl-fill', opacity: 0.55 }, svg);
    });
    var hand = el('line', { x1: CX, y1: CY, x2: CX, y2: CY - R, 'class': 's-hl', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    var dot = el('circle', { cx: CX, cy: CY - R, r: 8, 'class': 's-hl-fill' }, svg);
    el('circle', { cx: CX, cy: CY, r: 5, 'class': 's-hl-fill' }, svg);
    // right-hand info panel (inside the svg for visual context)
    var tDate = el('text', { x: 470, y: 150, 'font-size': 26, 'font-weight': 700, 'class': 's-label' }, svg);
    var tTime = el('text', { x: 470, y: 185, 'font-size': 18, 'class': 's-label' }, svg);
    var tEvent = el('text', { x: 470, y: 225, 'font-size': 15, 'class': 's-label-muted' }, svg);
    var tAgo = el('text', { x: 470, y: 250, 'font-size': 15, 'class': 's-label-muted' }, svg);
    var cap = el('text', { x: 470, y: 110, 'font-size': 13, 'class': 's-label-muted' }, svg);
    cap.textContent = 'On the cosmic calendar:';

    var sel = $('cal-event');
    var range = $('cal-range');
    EVENTS.forEach(function (ev, i) {
      var o = document.createElement('option'); o.value = String(i); o.textContent = ev.name; sel.appendChild(o);
    });

    function toDate(ago) {
      var f = Math.max(0, Math.min(1, 1 - ago / AGE));
      var secs = f * 365 * 86400;
      if (secs >= 365 * 86400) secs = 365 * 86400 - 0.001;
      var day = Math.floor(secs / 86400);
      var rem = secs - day * 86400;
      var m = 0;
      while (day >= MDAYS[m]) { day -= MDAYS[m]; m++; }
      var h = Math.floor(rem / 3600), mi = Math.floor((rem % 3600) / 60), s = rem % 60;
      var ap = h >= 12 ? 'p.m.' : 'a.m.';
      var h12 = h % 12 === 0 ? 12 : h % 12;
      return {
        f: f,
        date: MONTHS[m] + ' ' + (day + 1),
        time: h12 + ':' + (mi < 10 ? '0' : '') + mi + ':' + (s < 10 ? '0' : '') + Math.floor(s) + ' ' + ap,
        before: 365 * 86400 * (1 - f)
      };
    }
    function agoText(ago) {
      if (ago < 1.5) return 'about 1 year ago';
      if (ago >= 1e9) return fmt(ago / 1e9, 2) + ' billion years ago';
      if (ago >= 1e6) return fmt(ago / 1e6, 1) + ' million years ago';
      return fmt(ago, 0) + ' years ago';
    }
    function beforeMidnight(sec) {
      if (sec < 1) return sec.toFixed(3) + ' seconds before midnight on December 31';
      if (sec < 60) return fmt(sec, 1) + ' seconds before midnight on December 31';
      if (sec < 3600) return fmt(sec / 60, 1) + ' minutes before midnight on December 31';
      if (sec < 86400) return fmt(sec / 3600, 1) + ' hours before midnight on December 31';
      return fmt(sec / 86400, 1) + ' days before the end of the year';
    }
    function show(ago, label) {
      var d = toDate(ago);
      var a = d.f * 2 * Math.PI - Math.PI / 2;
      hand.setAttribute('x2', (CX + R * Math.cos(a)).toFixed(1));
      hand.setAttribute('y2', (CY + R * Math.sin(a)).toFixed(1));
      dot.setAttribute('cx', (CX + R * Math.cos(a)).toFixed(1));
      dot.setAttribute('cy', (CY + R * Math.sin(a)).toFixed(1));
      tDate.textContent = d.date;
      tTime.textContent = d.time;
      tEvent.textContent = label;
      tAgo.textContent = agoText(ago);
      setText('cal-r-date', d.date + ', ' + d.time);
      setText('cal-r-ago', agoText(ago));
      setText('cal-r-left', beforeMidnight(d.before));
      setText('cal-note', label + ' lands on ' + d.date + ' at ' + d.time + ', ' + beforeMidnight(d.before) + '.');
    }
    // range slider is logarithmic in "years ago": 1 year .. 13.8 billion years
    var LMIN = 0, LMAX = Math.log10(AGE);
    function rangeToAgo(v) { return Math.pow(10, LMAX - (v / 1000) * (LMAX - LMIN)); }
    function agoToRange(ago) { return Math.round((LMAX - Math.log10(ago)) / (LMAX - LMIN) * 1000); }
    sel.addEventListener('change', function () {
      var ev = EVENTS[parseInt(sel.value, 10)];
      range.value = String(Math.min(1000, Math.max(0, agoToRange(ev.ago))));
      show(ev.ago, ev.name);
      range.setAttribute('aria-valuetext', agoText(ev.ago));
      $('cal-out').textContent = agoText(ev.ago);
    });
    range.addEventListener('input', function () {
      var ago = rangeToAgo(parseFloat(range.value));
      var txt = agoText(ago);
      $('cal-out').textContent = txt;
      range.setAttribute('aria-valuetext', txt);
      show(ago, 'Your chosen moment');
    });
    sel.value = '3';
    sel.dispatchEvent(new Event('change'));
  })();

  /* =====================================================================
     C. Seasons
     ===================================================================== */
  (function seasonsSim() {
    var svg = $('seasons-svg');
    if (!svg) return;
    var W = 800, H = 400;
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, 400, H, 60, 5);
    // --- left: orbit view
    var OX = 200, OY = 190, ORX = 150, ORY = 62;
    el('ellipse', { cx: OX, cy: OY, rx: ORX, ry: ORY, 'class': 's-line', 'stroke-width': 1.2, 'stroke-dasharray': '3 4' }, svg);
    el('circle', { cx: OX, cy: OY, r: 20, 'class': 's-sun' }, svg);
    [['Jun', -1, 0], ['Dec', 1, 0], ['Mar', 0, -1], ['Sep', 0, 1]].forEach(function (m) {
      var t = el('text', { x: OX + m[1] * (ORX + 26), y: OY + m[2] * (ORY + 20) + 4, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg);
      t.textContent = m[0];
    });
    var earthG = el('g', {}, svg);
    var earth = el('circle', { r: 13, 'class': 's-earth' }, earthG);
    var axis = el('line', { 'class': 's-hl', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, earthG);
    var np = el('text', { 'font-size': 11, 'class': 's-label' }, earthG);
    np.textContent = 'N';
    var ot = el('text', { x: OX, y: 360, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg);
    ot.textContent = 'Axis keeps pointing the same way in space all year';
    // divider
    el('line', { x1: 400, y1: 20, x2: 400, y2: 380, 'class': 's-line', 'stroke-width': 1 }, svg);
    // --- right: noon sun view
    var GX = 600, GY = 300, SR = 150;
    el('rect', { x: 401, y: GY, width: 399, height: H - GY, 'class': 's-land', opacity: 0.55 }, svg);
    el('path', { d: 'M ' + (GX - SR) + ' ' + GY + ' A ' + SR + ' ' + SR + ' 0 0 1 ' + (GX + SR) + ' ' + GY, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    var rays = el('g', {}, svg);
    var sun2 = el('circle', { r: 14, 'class': 's-sun' }, svg);
    var altArc = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg);
    var altLbl = el('text', { 'font-size': 14, 'font-weight': 700, 'class': 's-label' }, svg);
    var dirLbl = el('text', { x: GX - SR - 8, y: GY + 20, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg);
    var hLbl = el('text', { x: GX, y: 40, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg);
    hLbl.textContent = 'The Sun at noon, seen from your latitude';
    var spread = el('line', { 'class': 's-hl', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
    var spreadLbl = el('text', { x: GX + 60, y: GY + 60, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg);
    // person
    el('circle', { cx: GX, cy: GY - 22, r: 5, 'class': 's-hl-fill' }, svg);
    el('line', { x1: GX, y1: GY - 17, x2: GX, y2: GY - 4, 'class': 's-hl', 'stroke-width': 2 }, svg);

    var day = $('season-day'), lat = $('season-lat'), tilt = $('season-tilt');
    function dateLabel(d) {
      var m = 0, dd = d;
      while (dd > MDAYS[m]) { dd -= MDAYS[m]; m++; }
      return MONTHS[m] + ' ' + dd;
    }
    function deg(r) { return r * 180 / Math.PI; }
    function rad(d) { return d * Math.PI / 180; }

    function render() {
      var d = parseInt(day.value, 10), phi = parseFloat(lat.value), eps = parseFloat(tilt.value);
      var lam = 2 * Math.PI * (d - 80) / 365.25; // Sun's ecliptic longitude, 0 at March equinox
      var decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(lam)));
      var rAU = 1 - 0.0167 * Math.cos(2 * Math.PI * (d - 3) / 365.25);
      // orbit position: heliocentric longitude = lam + 180; place June at left
      var ang = lam + Math.PI - Math.PI / 2;
      var ex = OX + ORX * Math.cos(ang), ey = OY + ORY * Math.sin(ang);
      earth.setAttribute('cx', ex.toFixed(1)); earth.setAttribute('cy', ey.toFixed(1));
      var L = 30, tr = rad(eps);
      axis.setAttribute('x1', (ex - Math.sin(tr) * L).toFixed(1)); axis.setAttribute('y1', (ey + Math.cos(tr) * L).toFixed(1));
      axis.setAttribute('x2', (ex + Math.sin(tr) * L).toFixed(1)); axis.setAttribute('y2', (ey - Math.cos(tr) * L).toFixed(1));
      np.setAttribute('x', (ex + Math.sin(tr) * (L + 8) - 4).toFixed(1)); np.setAttribute('y', (ey - Math.cos(tr) * (L + 8)).toFixed(1));

      // noon altitude
      var alt = 90 - Math.abs(phi - decl);
      var towards = phi >= decl ? 'south' : 'north';
      var altC = Math.max(alt, -5);
      var a = rad(altC);
      var sx = GX - SR * Math.cos(a), sy = GY - SR * Math.sin(a);
      sun2.setAttribute('cx', sx.toFixed(1)); sun2.setAttribute('cy', sy.toFixed(1));
      sun2.setAttribute('opacity', alt > 0 ? '1' : '0.35');
      dirLbl.textContent = 'toward ' + towards;
      while (rays.firstChild) rays.removeChild(rays.firstChild);
      if (alt > 0.5) {
        var beam = 36; // beam width perpendicular to rays
        var gw = beam / Math.sin(a);
        var ux = Math.cos(a), uy = Math.sin(a);
        for (var k = -1; k <= 1; k++) {
          var gx = GX + 60 + k * gw / 2;
          el('line', { x1: gx, y1: GY, x2: gx - ux * 110, y2: GY - uy * 110, 'class': 's-ray', 'stroke-width': 1.5, opacity: 0.8 }, rays);
        }
        spread.setAttribute('x1', (GX + 60 - gw / 2).toFixed(1)); spread.setAttribute('x2', (GX + 60 + gw / 2).toFixed(1));
        spread.setAttribute('y1', GY); spread.setAttribute('y2', GY);
        spread.setAttribute('opacity', '1');
        spreadLbl.textContent = 'sunlight spread ×' + (1 / Math.sin(a)).toFixed(2);
        altArc.setAttribute('d', 'M ' + (GX - 45) + ' ' + GY + ' A 45 45 0 0 1 ' + (GX - 45 * Math.cos(a)).toFixed(1) + ' ' + (GY - 45 * Math.sin(a)).toFixed(1));
        altLbl.setAttribute('x', (GX - 70).toFixed(1)); altLbl.setAttribute('y', (GY - 12).toFixed(1));
        altLbl.textContent = alt.toFixed(0) + '°';
      } else {
        spread.setAttribute('opacity', '0');
        spreadLbl.textContent = 'Sun stays below the horizon';
        altArc.setAttribute('d', '');
        altLbl.textContent = '';
      }

      // day length + daily sunlight
      var p = rad(phi), dl = rad(decl);
      var cosH = -Math.tan(p) * Math.tan(dl);
      var Hh;
      if (cosH <= -1) Hh = Math.PI; else if (cosH >= 1) Hh = 0; else Hh = Math.acos(cosH);
      var hours = 24 * Hh / Math.PI;
      var Q = (Hh * Math.sin(p) * Math.sin(dl) + Math.cos(p) * Math.cos(dl) * Math.sin(Hh)) / Math.PI / (rAU * rAU);
      var rel = Math.max(0, Q * Math.PI * 100);

      var hh = Math.floor(hours), mm = Math.round((hours - hh) * 60);
      if (mm === 60) { hh += 1; mm = 0; }
      $('season-day-out').textContent = dateLabel(d);
      $('season-lat-out').textContent = Math.abs(phi).toFixed(1) + '° ' + (phi >= 0 ? 'N' : 'S');
      $('season-tilt-out').textContent = eps.toFixed(1) + '°';
      day.setAttribute('aria-valuetext', dateLabel(d));
      lat.setAttribute('aria-valuetext', Math.abs(phi).toFixed(1) + ' degrees ' + (phi >= 0 ? 'north' : 'south'));
      tilt.setAttribute('aria-valuetext', eps.toFixed(1) + ' degrees');
      setText('season-r-alt', alt > 0 ? alt.toFixed(1) + '° above ' + towards + ' horizon' : 'below horizon');
      setText('season-r-len', hh + ' h ' + mm + ' min');
      setText('season-r-sun', rel.toFixed(0) + '%');
      setText('season-r-dist', (rAU * 149.6).toFixed(1) + ' million km');

      var note;
      if (eps < 0.5) note = 'With no tilt, the Sun\u2019s noon height and the length of the day never change. No tilt means no seasons, even though Earth\u2019s distance from the Sun still varies slightly.';
      else if (hours >= 23.99) note = 'Midnight Sun: at this latitude and date the Sun never sets.';
      else if (hours <= 0.01) note = 'Polar night: the Sun never rises today.';
      else if (Math.abs(d - 3) < 8 && phi > 20) note = 'Earth is near its closest point to the Sun right now, yet it is winter here. Distance is not what drives the seasons.';
      else note = 'Daily sunlight combines two effects of the tilt: how high the Sun climbs (steeper rays are more concentrated) and how many hours it stays up.';
      setText('season-note', note);
    }
    [day, lat, tilt].forEach(function (i) { i.addEventListener('input', render); });
    Array.prototype.slice.call(document.querySelectorAll('[data-season-day]')).forEach(function (b) {
      b.addEventListener('click', function () { day.value = b.getAttribute('data-season-day'); render(); });
    });
    var playBtn = $('season-play'), playing = false, timer = null;
    playBtn.addEventListener('click', function () {
      playing = !playing;
      playBtn.textContent = playing ? 'Pause year' : 'Play a year';
      playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      if (playing) {
        timer = window.setInterval(function () {
          var v = parseInt(day.value, 10) + (REDUCED ? 7 : 2);
          if (v > 365) v -= 365;
          day.value = String(v);
          render();
        }, REDUCED ? 400 : 50);
      } else window.clearInterval(timer);
    });
    var reset = $('season-reset');
    reset.addEventListener('click', function () { tilt.value = '23.4'; lat.value = '40.3'; render(); });
    render();
  })();

  /* =====================================================================
     D. Moon phases
     ===================================================================== */
  (function moonSim() {
    var svg = $('moon-svg');
    if (!svg) return;
    var W = 800, H = 400;
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, H, 80, 9);
    // sunlight arrows from left
    for (var i = 0; i < 5; i++) {
      var y = 80 + i * 60;
      el('line', { x1: 12, y1: y, x2: 70, y2: y, 'class': 's-ray', 'stroke-width': 2 }, svg);
      el('polygon', { points: '70,' + (y - 5) + ' 80,' + y + ' 70,' + (y + 5), 'class': 's-sun' }, svg);
    }
    var sl = el('text', { x: 14, y: 30, 'font-size': 12, 'class': 's-label-muted' }, svg);
    sl.textContent = 'Sunlight';
    var EX = 250, EY = 200, R = 125;
    el('circle', { cx: EX, cy: EY, r: R, 'class': 's-line', 'stroke-width': 1.2, 'stroke-dasharray': '3 4' }, svg);
    // Earth: lit half toward Sun (left)
    el('circle', { cx: EX, cy: EY, r: 22, 'class': 's-earth', opacity: 0.35 }, svg);
    el('path', { d: 'M ' + EX + ' ' + (EY - 22) + ' A 22 22 0 0 0 ' + EX + ' ' + (EY + 22) + ' Z', 'class': 's-earth' }, svg);
    var et = el('text', { x: EX, y: EY + 40, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label-muted' }, svg);
    et.textContent = 'Earth';
    var sight = el('line', { x1: EX, y1: EY, 'class': 's-hl', 'stroke-width': 1.2, 'stroke-dasharray': '5 4' }, svg);
    var moonG = el('g', {}, svg);
    el('circle', { r: 12, 'class': 's-moondark' }, moonG);
    el('path', { d: 'M 0 -12 A 12 12 0 0 0 0 12 Z', 'class': 's-moonlit' }, moonG);
    el('circle', { r: 12, 'class': 's-line', 'stroke-width': 1 }, moonG);
    var dirArrow = el('text', { x: EX + R + 14, y: EY - 50, 'font-size': 12, 'class': 's-label-muted' }, svg);
    dirArrow.textContent = '↺ orbit';
    var topLbl = el('text', { x: EX + 30, y: 30, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg);
    topLbl.textContent = 'View from far above Earth\u2019s North Pole (not to scale)';
    el('line', { x1: 470, y1: 20, x2: 470, y2: 380, 'class': 's-line', 'stroke-width': 1 }, svg);
    // phase disk
    var PX = 635, PY = 195, PR = 95;
    var t2 = el('text', { x: PX, y: 45, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg);
    t2.textContent = 'What you see from Earth';
    el('circle', { cx: PX, cy: PY, r: PR, 'class': 's-moondark' }, svg);
    var lit = el('path', { 'class': 's-moonlit' }, svg);
    el('circle', { cx: PX, cy: PY, r: PR, 'class': 's-line', 'stroke-width': 1 }, svg);
    var phaseName = el('text', { x: PX, y: PY + PR + 40, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, 'class': 's-label' }, svg);

    var range = $('moon-range');
    function phaseLabel(th) {
      if (th < 6 || th > 354) return 'New moon';
      if (th < 84) return 'Waxing crescent';
      if (th <= 96) return 'First quarter';
      if (th < 174) return 'Waxing gibbous';
      if (th <= 186) return 'Full moon';
      if (th < 264) return 'Waning gibbous';
      if (th <= 276) return 'Third quarter';
      return 'Waning crescent';
    }
    function clock(h) {
      h = ((h % 24) + 24) % 24;
      var hh = Math.floor(h), mm = Math.round((h - hh) * 60 / 15) * 15;
      if (mm === 60) { hh = (hh + 1) % 24; mm = 0; }
      var ap = hh >= 12 ? 'p.m.' : 'a.m.';
      var h12 = hh % 12 === 0 ? 12 : hh % 12;
      if (hh === 12 && mm === 0) return 'noon';
      if (hh === 0 && mm === 0) return 'midnight';
      return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
    }
    function render() {
      var th = parseFloat(range.value);
      var b = (180 + th) * Math.PI / 180;
      var mx = EX + R * Math.cos(b), my = EY - R * Math.sin(b);
      moonG.setAttribute('transform', 'translate(' + mx.toFixed(1) + ',' + my.toFixed(1) + ')');
      sight.setAttribute('x2', mx.toFixed(1)); sight.setAttribute('y2', my.toFixed(1));
      var c = Math.cos(th * Math.PI / 180);
      var k = (1 - c) / 2;
      var rx = Math.abs(c) * PR;
      var top = PX + ' ' + (PY - PR), bot = PX + ' ' + (PY + PR);
      var d = '';
      if (k > 0.002) {
        if (th <= 180) { // waxing: lit on right
          d = 'M ' + top + ' A ' + PR + ' ' + PR + ' 0 0 1 ' + bot + ' A ' + rx.toFixed(2) + ' ' + PR + ' 0 0 ' + (th < 90 ? 0 : 1) + ' ' + top + ' Z';
        } else { // waning: lit on left
          d = 'M ' + top + ' A ' + PR + ' ' + PR + ' 0 0 0 ' + bot + ' A ' + rx.toFixed(2) + ' ' + PR + ' 0 0 ' + (th > 270 ? 1 : 0) + ' ' + top + ' Z';
        }
      }
      lit.setAttribute('d', d);
      var name = phaseLabel(th);
      phaseName.textContent = name;
      var days = th / 360 * 29.53;
      var rise = 6 + th / 15;
      $('moon-out').textContent = days.toFixed(1) + ' days';
      range.setAttribute('aria-valuetext', days.toFixed(1) + ' days after new moon, ' + name);
      setText('moon-r-phase', name);
      setText('moon-r-lit', Math.round(k * 100) + '%');
      setText('moon-r-rise', clock(rise));
      setText('moon-r-high', clock(rise + 6));
      setText('moon-r-set', clock(rise + 12));
      var note = '';
      if (name === 'New moon') note = 'The Moon is between Earth and the Sun, so its lit side faces away from us. It rises and sets with the Sun. A solar eclipse is possible now, but only if this new moon falls near a node of the Moon\u2019s tilted orbit.';
      else if (name === 'Full moon') note = 'Earth is between the Sun and the Moon, so we see the whole sunlit face. It rises near sunset. A lunar eclipse is possible now, but only if the Moon is near a node; most months it passes above or below Earth\u2019s shadow.';
      else if (name.indexOf('quarter') !== -1) note = 'Half the disk is lit, yet the Moon is only a quarter of the way around its orbit from the previous named phase. That is where the name comes from.';
      else if (name.indexOf('Waxing') === 0) note = 'Waxing: the lit part grows each night, and the Moon is visible in the afternoon and evening sky.';
      else note = 'Waning: the lit part shrinks each night, and the Moon is visible late at night and into the morning.';
      setText('moon-note', note);
    }
    range.addEventListener('input', render);
    Array.prototype.slice.call(document.querySelectorAll('[data-moon-step]')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = parseFloat(range.value) + parseFloat(btn.getAttribute('data-moon-step')) * 360 / 29.53;
        v = ((v % 360) + 360) % 360;
        range.value = v.toFixed(1);
        render();
      });
    });
    var play = $('moon-play'), on = false, tm = null;
    play.addEventListener('click', function () {
      on = !on;
      play.textContent = on ? 'Pause' : 'Play a month';
      play.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) tm = window.setInterval(function () {
        var v = (parseFloat(range.value) + (REDUCED ? 12.2 : 2)) % 360;
        range.value = v.toFixed(1);
        render();
      }, REDUCED ? 500 : 60);
      else window.clearInterval(tm);
    });
    render();
  })();

  /* =====================================================================
     E. Sky at your latitude (meridian cross-section of the celestial sphere)
     ===================================================================== */
  (function skySim() {
    var svg = $('sky-svg');
    if (!svg) return;
    var W = 800, H = 420, OX = 400, OY = 250, R = 165;
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, OY, 70, 21);
    el('rect', { x: 0, y: OY, width: W, height: H - OY, 'class': 's-land', opacity: 0.5 }, svg);
    el('circle', { cx: OX, cy: OY, r: R, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    el('line', { x1: 20, y1: OY, x2: W - 20, y2: OY, 'class': 's-line', 'stroke-width': 1.5 }, svg);
    var lS = el('text', { x: OX - R - 14, y: OY + 20, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); lS.textContent = 'S';
    var lN = el('text', { x: OX + R + 14, y: OY + 20, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); lN.textContent = 'N';
    el('circle', { cx: OX, cy: OY - R, r: 3, 'class': 's-label' }, svg);
    var lZ = el('text', { x: OX + 8, y: OY - R - 6, 'font-size': 12, 'class': 's-label-muted' }, svg); lZ.textContent = 'Zenith';
    var hz = el('text', { x: 30, y: OY - 8, 'font-size': 12, 'class': 's-label-muted' }, svg); hz.textContent = 'Horizon';
    var gnd = el('text', { x: 30, y: H - 16, 'font-size': 12, 'class': 's-label' }, svg); gnd.textContent = 'Below the horizon (hidden)';
    var axisL = el('line', { 'class': 's-line', 'stroke-width': 1.2 }, svg);
    var eqL = el('line', { 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '6 4' }, svg);
    var eqT = el('text', { 'font-size': 11, 'class': 's-label-muted' }, svg); eqT.textContent = 'celestial equator';
    var cpL = el('line', { 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '1 4' }, svg);
    var ncp = el('text', { 'font-size': 12, 'class': 's-label' }, svg); ncp.textContent = 'NCP';
    var scp = el('text', { 'font-size': 12, 'class': 's-label-muted' }, svg); scp.textContent = 'SCP';
    var polArc = el('path', { 'class': 's-hl', 'stroke-width': 2 }, svg);
    var polT = el('text', { 'font-size': 12, 'class': 's-label' }, svg);
    var below = el('line', { 'class': 's-hl', 'stroke-width': 2, 'stroke-dasharray': '4 5', opacity: 0.55 }, svg);
    var above = el('line', { 'class': 's-hl', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    var star = el('circle', { r: 7, 'class': 's-star' }, svg);
    var starT = el('text', { 'font-size': 13, 'font-weight': 700, 'class': 's-label' }, svg);
    var cap = el('text', { x: OX, y: 26, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label-muted' }, svg);
    cap.textContent = 'Side view of your sky, sliced along the meridian (south on the left, north on the right)';

    var lat = $('sky-lat'), dec = $('sky-dec'), pick = $('sky-star');
    var STARS = [
      ['Polaris (North Star)', 89.3], ['Dubhe (Big Dipper)', 61.8], ['Vega', 38.8], ['Betelgeuse (Orion)', 7.4],
      ['Sirius', -16.7], ['Antares (Scorpius)', -26.4], ['Canopus', -52.7], ['Acrux (Southern Cross)', -63.1]
    ];
    STARS.forEach(function (s, i) { var o = document.createElement('option'); o.value = String(i); o.textContent = s[0] + ' (' + (s[1] > 0 ? '+' : '') + s[1] + '°)'; pick.appendChild(o); });
    var label = 'Your star';
    function P(x, y) { return { x: OX + x, y: OY - y }; } // math coords (y up) to screen
    function render() {
      var phi = parseFloat(lat.value), d = parseFloat(dec.value);
      var pr = phi * Math.PI / 180, dr = d * Math.PI / 180;
      // unit vector toward NCP: from N horizon up by latitude (N is +x)
      var ux = Math.cos(pr), uy = Math.sin(pr);
      var vx = -uy, vy = ux; // perpendicular, pointing toward the south-upper side
      var n1 = P(R * ux * 1.12, R * uy * 1.12), n2 = P(-R * ux * 1.12, -R * uy * 1.12);
      axisL.setAttribute('x1', n1.x); axisL.setAttribute('y1', n1.y); axisL.setAttribute('x2', n2.x); axisL.setAttribute('y2', n2.y);
      ncp.setAttribute('x', n1.x + 6); ncp.setAttribute('y', n1.y);
      scp.setAttribute('x', n2.x - 34); scp.setAttribute('y', n2.y + 12);
      var e1 = P(R * vx, R * vy), e2 = P(-R * vx, -R * vy);
      eqL.setAttribute('x1', e1.x); eqL.setAttribute('y1', e1.y); eqL.setAttribute('x2', e2.x); eqL.setAttribute('y2', e2.y);
      eqT.setAttribute('x', e1.x - 110); eqT.setAttribute('y', e1.y - 6);
      // circumpolar boundary chord (declination 90 - |lat|)
      var cb = (90 - Math.abs(phi)) * Math.PI / 180 * (phi >= 0 ? 1 : -1);
      var cc = P(R * Math.sin(cb) * ux, R * Math.sin(cb) * uy);
      var ch = R * Math.cos(cb);
      cpL.setAttribute('x1', cc.x + ch * vx); cpL.setAttribute('y1', cc.y - ch * vy);
      cpL.setAttribute('x2', cc.x - ch * vx); cpL.setAttribute('y2', cc.y + ch * vy);
      // pole altitude arc
      var ar = 60, a0 = P(ar, 0), a1 = P(ar * ux, ar * uy);
      polArc.setAttribute('d', 'M ' + a0.x + ' ' + a0.y + ' A ' + ar + ' ' + ar + ' 0 0 ' + (phi >= 0 ? 0 : 1) + ' ' + a1.x.toFixed(1) + ' ' + a1.y.toFixed(1));
      polT.setAttribute('x', OX + 68); polT.setAttribute('y', OY - (phi >= 0 ? 10 : -22));
      polT.textContent = Math.abs(phi).toFixed(0) + '°';
      // star's daily circle, seen edge-on as a chord
      var c = P(R * Math.sin(dr) * ux, R * Math.sin(dr) * uy);
      var hl = R * Math.cos(dr);
      var pA = { x: c.x + hl * vx, y: c.y - hl * vy }, pB = { x: c.x - hl * vx, y: c.y + hl * vy };
      // pA is the upper culmination (toward +v, the upper side)
      function clipAbove(a, b) {
        var aUp = a.y <= OY, bUp = b.y <= OY;
        if (aUp && bUp) return [a, b, null, null];
        if (!aUp && !bUp) return [null, null, a, b];
        var t = (OY - a.y) / (b.y - a.y);
        var m = { x: a.x + t * (b.x - a.x), y: OY };
        return aUp ? [a, m, m, b] : [m, b, a, m];
      }
      var seg = clipAbove(pA, pB);
      function setLine(ln, p, q) {
        if (!p) { ln.setAttribute('opacity', '0'); return; }
        ln.setAttribute('opacity', ln === below ? '0.55' : '1');
        ln.setAttribute('x1', p.x.toFixed(1)); ln.setAttribute('y1', p.y.toFixed(1)); ln.setAttribute('x2', q.x.toFixed(1)); ln.setAttribute('y2', q.y.toFixed(1));
      }
      setLine(above, seg[0], seg[1]); setLine(below, seg[2], seg[3]);
      var top = pA.y < pB.y ? pA : pB;
      star.setAttribute('cx', top.x.toFixed(1)); star.setAttribute('cy', top.y.toFixed(1));
      starT.setAttribute('x', (top.x + 12).toFixed(1)); starT.setAttribute('y', (top.y - 8).toFixed(1));
      starT.textContent = label;

      var maxAlt = 90 - Math.abs(phi - d);
      var cosH = -Math.tan(pr) * Math.tan(dr), status, hrs;
      if (Math.abs(d) >= 89.99 || cosH <= -1) { status = maxAlt > 0 ? 'Circumpolar: never sets' : 'Never rises'; hrs = maxAlt > 0 ? 24 : 0; }
      else if (cosH >= 1) { status = 'Never rises'; hrs = 0; }
      else { status = 'Rises and sets'; hrs = 24 * Math.acos(cosH) / Math.PI; }
      if (status === 'Never rises') star.setAttribute('opacity', '0.35'); else star.setAttribute('opacity', '1');
      var dir = phi > d ? 'south' : (phi < d ? 'north' : 'overhead');
      $('sky-lat-out').textContent = Math.abs(phi).toFixed(0) + '° ' + (phi >= 0 ? 'N' : 'S');
      $('sky-dec-out').textContent = (d > 0 ? '+' : '') + d.toFixed(1) + '°';
      lat.setAttribute('aria-valuetext', Math.abs(phi).toFixed(0) + ' degrees ' + (phi >= 0 ? 'north' : 'south'));
      dec.setAttribute('aria-valuetext', d.toFixed(1) + ' degrees');
      setText('sky-r-status', status);
      setText('sky-r-max', maxAlt > 0 ? maxAlt.toFixed(1) + '°' + (dir === 'overhead' ? ' (zenith)' : ' above the ' + dir + ' horizon') : 'below the horizon');
      var hh = Math.floor(hrs), mm = Math.round((hrs - hh) * 60); if (mm === 60) { hh++; mm = 0; }
      setText('sky-r-hours', hh + ' h ' + mm + ' min');
      setText('sky-r-pole', (phi >= 0 ? phi.toFixed(0) + '° above' : Math.abs(phi).toFixed(0) + '° below') + ' north horizon');
      var note;
      if (status.indexOf('Circumpolar') === 0) note = label + ' circles the pole without ever setting. From ' + Math.abs(phi).toFixed(0) + '° ' + (phi >= 0 ? 'N' : 'S') + ', every star with declination above ' + (phi >= 0 ? '+' : '−') + (90 - Math.abs(phi)).toFixed(0) + '° does the same (dotted line).';
      else if (status === 'Never rises') note = label + ' stays below your horizon all year. You would have to travel ' + (d < 0 ? 'south' : 'north') + ' to see it.';
      else note = label + ' rises, crosses the meridian ' + maxAlt.toFixed(0) + '° up, and sets. The solid part of its path is above your horizon; the dashed part is hidden below it.';
      setText('sky-note', note);
    }
    lat.addEventListener('input', render);
    dec.addEventListener('input', function () { label = 'Your star'; pick.value = ''; render(); });
    pick.addEventListener('change', function () {
      if (pick.value === '') return;
      var s = STARS[parseInt(pick.value, 10)];
      dec.value = String(s[1]); label = s[0].replace(/ \(.*\)/, ''); render();
    });
    pick.value = '1'; label = 'Dubhe'; dec.value = '61.8';
    render();
  })();

  /* =====================================================================
     F. Eclipse seasons
     ===================================================================== */
  (function eclipseSim() {
    var svg = $('ecl-svg');
    if (!svg) return;
    var W = 800, H = 330, EY = 165, SC = 11; // px per degree of lunar latitude (exaggerated)
    el('rect', { x: 0, y: 0, width: W, height: H, 'class': 's-space' }, svg);
    starfield(svg, W, H, 60, 33);
    el('circle', { cx: 40, cy: EY, r: 34, 'class': 's-sun' }, svg);
    el('line', { x1: 74, y1: EY, x2: 780, y2: EY, 'class': 's-line', 'stroke-width': 1, 'stroke-dasharray': '6 5' }, svg);
    var pl = el('text', { x: 90, y: EY + 20, 'font-size': 12, 'class': 's-label-muted' }, svg); pl.textContent = 'plane of Earth\u2019s orbit';
    // eclipse zones
    el('rect', { x: 330, y: EY - 1.5 * SC, width: 60, height: 3 * SC, 'class': 's-hl-fill', opacity: 0.18 }, svg);
    el('rect', { x: 610, y: EY - 1.0 * SC, width: 60, height: 2 * SC, 'class': 's-hl-fill', opacity: 0.18 }, svg);
    // earth shadow cone
    el('polygon', { points: '500,' + (EY - 14) + ' 760,' + (EY - 5) + ' 760,' + (EY + 5) + ' 500,' + (EY + 14), 'class': 's-moondark', opacity: 0.9 }, svg);
    el('circle', { cx: 500, cy: EY, r: 16, 'class': 's-earth' }, svg);
    var te = el('text', { x: 500, y: EY + 36, 'text-anchor': 'middle', 'font-size': 12, 'class': 's-label' }, svg); te.textContent = 'Earth';
    var t1 = el('text', { x: 360, y: 30, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); t1.textContent = 'New moon';
    var t2 = el('text', { x: 640, y: 30, 'text-anchor': 'middle', 'font-size': 13, 'class': 's-label' }, svg); t2.textContent = 'Full moon (2 weeks later)';
    var z1 = el('text', { x: 360, y: H - 14, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); z1.textContent = 'solar-eclipse zone';
    var z2 = el('text', { x: 640, y: H - 14, 'text-anchor': 'middle', 'font-size': 11, 'class': 's-label-muted' }, svg); z2.textContent = 'lunar-eclipse zone';
    var n1 = el('circle', { cx: 360, r: 9, 'class': 's-moonlit' }, svg);
    var n2 = el('circle', { cx: 640, r: 9, 'class': 's-moonlit' }, svg);
    var ex = el('text', { x: 20, y: H - 14, 'text-anchor': 'start', 'font-size': 11, 'class': 's-label-muted' }, svg); ex.textContent = 'vertical scale exaggerated';
    var range = $('ecl-range'), INC = 5.1, EYR = 346.6;
    function render() {
      var d = parseFloat(range.value);
      var phi = d / EYR * 2 * Math.PI;
      var phi2 = (d + 14.8) / EYR * 2 * Math.PI;
      var bNew = INC * Math.sin(phi), bFull = -INC * Math.sin(phi2);
      n1.setAttribute('cy', (EY - bNew * SC).toFixed(1));
      n2.setAttribute('cy', (EY - bFull * SC).toFixed(1));
      var solar = Math.abs(bNew) < 1.5, lunar = Math.abs(bFull) < 1.0;
      n2.setAttribute('class', lunar ? 's-moondark' : 's-moonlit');
      function where(b) { return Math.abs(b) < 0.05 ? 'right on the plane' : Math.abs(b).toFixed(1) + '° ' + (b > 0 ? 'above' : 'below') + ' the plane'; }
      $('ecl-out').textContent = 'day ' + Math.round(d);
      range.setAttribute('aria-valuetext', Math.round(d) + ' days after the Sun lines up with a node');
      setText('ecl-r-new', where(bNew));
      setText('ecl-r-solar', solar ? 'Yes: shadow reaches Earth' : 'No: shadow misses');
      setText('ecl-r-full', where(bFull));
      setText('ecl-r-lunar', lunar ? 'Yes: Moon enters Earth\u2019s shadow' : 'No: Moon misses the shadow');
      var note;
      if (solar && lunar) note = 'Eclipse season: both the new moon and the following full moon fall near a node, so a solar eclipse and a lunar eclipse two weeks apart are both possible.';
      else if (solar || lunar) note = 'Inside an eclipse season: the Sun is near the line of nodes, so the Moon crosses Earth\u2019s orbital plane close to where the alignment happens.';
      else note = 'Outside eclipse season: the Moon\u2019s 5° tilt carries it above or below the Sun–Earth line at new and full moon, so the shadows miss.';
      setText('ecl-note', note);
    }
    range.addEventListener('input', render);
    Array.prototype.slice.call(document.querySelectorAll('[data-ecl-day]')).forEach(function (b) {
      b.addEventListener('click', function () { range.value = b.getAttribute('data-ecl-day'); render(); });
    });
    render();
  })();

  /* =====================================================================
     G. Light-travel time machine (activity)
     ===================================================================== */
  (function lightTime() {
    var sel = $('lt-object');
    if (!sel) return;
    var NOW = new Date().getFullYear();
    var OBJS = [
      ['The Moon', 1.28 / 3.156e7], ['The Sun', 8.3 / 60 / 24 / 365.25], ['Jupiter (average)', 43 / 60 / 24 / 365.25],
      ['Neptune', 4.1 / 24 / 365.25], ['Voyager 1 spacecraft (2026)', 23 / 24 / 365.25],
      ['Proxima Centauri (nearest star)', 4.24], ['Sirius (brightest night star)', 8.6], ['Vega', 25],
      ['Polaris (North Star)', 430], ['Pleiades star cluster', 444], ['Betelgeuse (about)', 550],
      ['Orion Nebula', 1340], ['Center of the Milky Way', 26700], ['Large Magellanic Cloud', 160000],
      ['Andromeda Galaxy', 2.5e6], ['Virgo Cluster of galaxies', 5.4e7]
    ];
    var EVENTS = [
      [2020, 'the COVID-19 pandemic began'], [2007, 'the first iPhone went on sale'], [1990, 'the Hubble Space Telescope launched'],
      [1969, 'Apollo 11 landed on the Moon'], [1937, 'the Hindenburg airship burned at Lakehurst, New Jersey'], [1903, 'the Wright brothers made the first powered flight'], [1865, 'the American Civil War ended'], [1776, 'the Declaration of Independence was signed'],
      [1609, 'Galileo first turned a telescope to the sky'], [1564, 'William Shakespeare was born'], [1492, 'Columbus crossed the Atlantic'], [1347, 'the Black Death reached Europe'], [1215, 'the Magna Carta was sealed'], [1066, 'the Normans conquered England'],
      [800, 'Charlemagne was crowned emperor'], [650, 'the Maya city of Tikal was near its height'], [500, 'the Western Roman Empire had just fallen'], [0, 'the Roman Empire ruled the Mediterranean'], [-500, 'classical Greece was flourishing'], [-2560, 'the Great Pyramid of Giza was being built'],
      [-8000, 'people were beginning to farm'], [-20000, 'ice sheets covered much of North America'], [-40000, 'humans were painting the first cave art'], [-300000, 'the earliest Homo sapiens lived in Africa'],
      [-2.5e6, 'early human ancestors made the first stone tools'], [-6e6, 'the human and chimpanzee lineages were splitting'], [-6.6e7, 'dinosaurs had just gone extinct']
    ];
    OBJS.forEach(function (o, i) { var op = document.createElement('option'); op.value = String(i); op.textContent = o[0]; sel.appendChild(op); });
    var custom = $('lt-custom');
    function yearText(y) {
      if (y > 0) return String(Math.round(y));
      var ago = NOW - y;
      if (ago >= 1e6) return fmt(ago / 1e6, 1) + ' million years ago';
      if (ago >= 20000) return Math.round(ago / 1000).toLocaleString('en-US') + ',000 years ago';
      return Math.round(-y).toLocaleString('en-US') + ' B.C.E.';
    }
    function show(name, ly) {
      var y = NOW - ly, dist;
      if (ly < 1 / 365.25 / 24) dist = fmt(ly * 3.156e7, 1) + ' light-seconds';
      else if (ly < 1 / 365.25) dist = fmt(ly * 365.25 * 24 * 60, 1) + ' light-minutes';
      else if (ly < 0.1) dist = fmt(ly * 365.25 * 24, 1) + ' light-hours';
      else dist = (ly < 1e6 ? fmt(ly, ly < 10 ? 2 : 0) : fmt(ly / 1e6, 1) + ' million') + ' light-years';
      setText('lt-r-dist', dist);
      setText('lt-r-km', sci(ly * 9.461e12, 1) + ' km');
      var out;
      if (ly < 0.5) { out = 'Light left it moments ago, during ' + NOW + '.'; setText('lt-r-year', 'This year'); }
      else {
        setText('lt-r-year', yearText(y));
        var ev = EVENTS[0], span = NOW - y;
        EVENTS.forEach(function (e) { if (Math.abs(e[0] - y) < Math.abs(ev[0] - y)) ev = e; });
        out = 'The light reaching your eyes tonight from ' + name + ' left it ' + (y > 0 ? 'around ' : '') + yearText(y) + '.';
        if (Math.abs(ev[0] - y) <= Math.max(40, span * 0.35)) out += ' Around that time on Earth, ' + ev[1] + '.';
      }
      setText('lt-note', out);
    }
    function sentenceName(n) {
      n = n.replace(/ \(.*\)$/, '');
      if (/^The /.test(n)) return 'the' + n.slice(3);
      if (/Cluster|cluster|Nebula|Center|Cloud|Galaxy|spacecraft/.test(n)) return 'the ' + n;
      return n;
    }
    sel.addEventListener('change', function () { var o = OBJS[parseInt(sel.value, 10)]; show(sentenceName(o[0]), o[1]); });
    $('lt-go').addEventListener('click', function () {
      var v = parseFloat(custom.value);
      if (!(v > 0)) { setText('lt-note', 'Enter a distance in light-years greater than zero.'); return; }
      show('an object ' + fmt(v, 2) + ' light-years away', v);
    });
    sel.value = '6'; sel.dispatchEvent(new Event('change'));
  })();

  /* =====================================================================
     H. Scale model builder (activity)
     ===================================================================== */
  (function scaleBuilder() {
    var input = $('sm-sun');
    if (!input) return;
    var AU = 1.496e8; // km
    var BODIES = [
      ['Sun', 1392700, 0], ['Mercury', 4879, 0.387], ['Venus', 12104, 0.723], ['Earth', 12742, 1.0], ['Mars', 6779, 1.524],
      ['Jupiter', 139820, 5.203], ['Saturn', 116460, 9.537], ['Uranus', 50724, 19.19], ['Neptune', 49244, 30.07], ['Pluto', 2377, 39.5],
      ['Proxima Centauri', 214000, 268000]
    ];
    function len(m) {
      if (m < 0.001) return fmt(m * 1000, 2) + ' mm';
      if (m < 0.01) return fmt(m * 1000, 1) + ' mm';
      if (m < 1) return fmt(m * 100, 1) + ' cm';
      if (m < 1000) return fmt(m, m < 10 ? 1 : 0) + ' m';
      return fmt(m / 1000, m < 1e5 ? 1 : 0) + ' km';
    }
    var things = [[0.0005, 'a grain of salt'], [0.0015, 'a pinhead'], [0.004, 'a peppercorn'], [0.012, 'a pea'], [0.02, 'a grape or marble'], [0.045, 'a golf ball'], [0.07, 'a tennis ball'], [0.14, 'a grapefruit'], [0.24, 'a basketball'], [0.7, 'an exercise ball']];
    function like(m) { var best = things[0]; things.forEach(function (t) { if (Math.abs(Math.log(t[0] / m)) < Math.abs(Math.log(best[0] / m))) best = t; }); return Math.abs(Math.log(best[0] / m)) < 0.7 ? best[1] : ''; }
    function render() {
      var cm = parseFloat(input.value);
      if (!(cm > 0)) { setText('sm-note', 'Enter a Sun size greater than zero.'); return; }
      var scale = 1392700 * 1000 / (cm / 100); // real meters per model meter
      $('sm-scale').textContent = '1 to ' + sci(scale, 1);
      var tb = $('sm-body'); tb.innerHTML = '';
      BODIES.forEach(function (b) {
        var size = b[1] * 1000 / scale, dist = b[2] * AU * 1000 / scale;
        var tr = document.createElement('tr');
        var l = like(size);
        [b[0], len(size) + (l ? ' (' + l + ')' : ''), b[0] === 'Sun' ? '—' : len(dist)].forEach(function (t, i) {
          var td = document.createElement(i === 0 ? 'th' : 'td'); if (i === 0) td.setAttribute('scope', 'row'); else td.className = 'num';
          td.textContent = t; tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
      var nep = 30.07 * AU * 1000 / scale, px = 268000 * AU * 1000 / scale;
      var walk = nep / (5000 / 60);
      var wt = walk < 1 ? 'less than a minute' : walk < 90 ? Math.round(walk) + (Math.round(walk) === 1 ? ' minute' : ' minutes') : fmt(walk / 60, 1) + ' hours';
      setText('sm-note', 'If your model Sun sat at your front door, Neptune would be ' + len(nep) + ' away, about ' + wt + ' of walking. The nearest star would be ' + len(px) + ' away.');
    }
    input.addEventListener('input', render);
    Array.prototype.slice.call(document.querySelectorAll('[data-sm-sun]')).forEach(function (b) {
      b.addEventListener('click', function () { input.value = b.getAttribute('data-sm-sun'); render(); });
    });
    render();
  })();

  /* =====================================================================
     I. Moon phase drill (activity)
     ===================================================================== */
  (function phaseDrill() {
    var root = $('drill');
    if (!root) return;
    var PH = [['Waxing crescent', 45], ['First quarter', 90], ['Waxing gibbous', 135], ['Full moon', 180], ['Waning gibbous', 225], ['Third quarter', 270], ['Waning crescent', 315]];
    var POS = [[-6, 'just rising in the east'], [-3, 'partway up in the southeast'], [0, 'at its highest point, due south'], [3, 'in the southwest, heading down'], [6, 'just setting in the west']];
    var KEY = 'phys106-drill-v1';
    var rec = window.PHYS106.load(KEY, { best: 0 });
    var streak = 0, cur = null;
    var qEl = $('drill-q'), opts = $('drill-opts'), fb = $('drill-fb'), st = $('drill-streak'), nextB = $('drill-next');
    function clock(h) {
      h = ((h % 24) + 24) % 24;
      var hh = Math.round(h) % 24;
      if (hh === 0) return 'midnight'; if (hh === 12) return 'noon';
      return (hh % 12 === 0 ? 12 : hh % 12) + ' ' + (hh < 12 ? 'a.m.' : 'p.m.');
    }
    function newQ() {
      var ph = PH[Math.floor(Math.random() * PH.length)];
      var pos = POS[Math.floor(Math.random() * POS.length)];
      var t = 12 + ph[1] / 15 + pos[0];
      cur = { ph: ph, pos: pos, t: t };
      qEl.textContent = 'At about ' + clock(t) + ', you see the Moon ' + pos[1] + '. Which phase is it?';
      var choices = [ph].concat(window.PHYS106.shuffle(PH.filter(function (p) { return p !== ph; })).slice(0, 3));
      choices = window.PHYS106.shuffle(choices);
      opts.innerHTML = ''; fb.textContent = ''; nextB.hidden = true;
      choices.forEach(function (c) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = c[0];
        b.addEventListener('click', function () { answer(c, b); });
        opts.appendChild(b);
      });
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
    }
    function answer(c, btn) {
      var ok = c === cur.ph;
      Array.prototype.slice.call(opts.querySelectorAll('button')).forEach(function (b) {
        b.disabled = true;
        if (b.textContent === cur.ph[0]) b.classList.add('choice-right');
      });
      if (!ok) btn.classList.add('choice-wrong');
      streak = ok ? streak + 1 : 0;
      if (streak > rec.best) { rec.best = streak; window.PHYS106.save(KEY, rec); }
      var transit = clock(12 + cur.ph[1] / 15);
      var noun = cur.ph[0].toLowerCase() + (/moon$/.test(cur.ph[0]) ? '' : ' moon');
      fb.textContent = (ok ? '✓ Correct. ' : '✗ The answer is ' + cur.ph[0].toLowerCase() + '. ') + 'A ' + noun + ' is highest in the south around ' + transit + ', rises about 6 hours before that, and sets about 6 hours after.';
      st.textContent = 'Streak: ' + streak + '. Best: ' + rec.best + '.';
      nextB.hidden = false; nextB.focus();
    }
    nextB.addEventListener('click', function () { newQ(); qEl.focus(); });
    newQ();
  })();

  /* =====================================================================
     J. Moon journal (observing log)
     ===================================================================== */
  (function moonJournal() {
    if (!$('mj-add')) return;
    var KEY = 'phys106-moonlog-v1';
    var entries = window.PHYS106.load(KEY, []);
    var tbody = $('mj-body'), empty = $('mj-empty');
    var d = new Date();
    $('mj-date').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    function render() {
      tbody.innerHTML = '';
      empty.hidden = entries.length > 0;
      entries.slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }).forEach(function (e) {
        var tr = document.createElement('tr');
        [e.date, e.time, e.dir, e.phase, e.notes].forEach(function (t) { var td = document.createElement('td'); td.textContent = t || '—'; tr.appendChild(td); });
        var td = document.createElement('td'); var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Delete';
        b.setAttribute('aria-label', 'Delete entry for ' + e.date + ' ' + e.time);
        b.addEventListener('click', function () { entries = entries.filter(function (x) { return x.id !== e.id; }); window.PHYS106.save(KEY, entries); render(); window.PHYS106.announce('Entry deleted.', true); });
        td.appendChild(b); tr.appendChild(td); tbody.appendChild(tr);
      });
      setText('mj-count', entries.length + (entries.length === 1 ? ' observation' : ' observations') + ' logged');
    }
    $('mj-add').addEventListener('click', function () {
      var e = { id: Date.now(), date: $('mj-date').value, time: $('mj-time').value, dir: $('mj-dir').value, phase: $('mj-phase').value, notes: $('mj-notes').value.trim() };
      if (!e.date || !e.time) { window.PHYS106.announce('Enter a date and a time first.', true); return; }
      entries.push(e); window.PHYS106.save(KEY, entries); $('mj-notes').value = ''; render();
      window.PHYS106.announce('Observation saved.', true);
    });
    $('mj-export').addEventListener('click', function () {
      if (!entries.length) { window.PHYS106.announce('Nothing to export yet.', true); return; }
      var rows = [['Date', 'Time', 'Direction', 'Phase', 'Notes']].concat(entries.map(function (e) { return [e.date, e.time, e.dir, e.phase, e.notes]; }));
      var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c || '').replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'moon-journal.csv';
      document.body.appendChild(a); a.click(); a.remove();
    });
    render();
  })();

})();
