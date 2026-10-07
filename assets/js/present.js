/* Presentation mode for module pages.
 *
 * Adds a "Present" button. Pressing it turns the module page into slides that a
 * clicker, the arrow keys, or a touch swipe can step through. The real page
 * elements are moved onto each slide (not copied), so simulations, activities,
 * glossary popovers, guided problems, and the quiz keep working, and every
 * element goes back to its place when the presentation ends.
 *
 * One script tag is all a page needs; this file loads present.css itself:
 *   <script src="../assets/js/present.js"></script>   (after the site's own scripts)
 *
 * Everything site-specific is in CONFIG below. To reuse in another course site,
 * change the selectors there; nothing else should need editing.
 */
(function () {
  'use strict';

  var CONFIG = {
    storageKey: 'phys106-present-v1',
    onlyIf: '.reading-section',            // run only on pages that have this
    contentRoot: 'main',
    containers: ['.reading-layout', '.reading-body'],   // walk into these
    skip: ['.toc', '.pager', 'script', 'noscript', 'template', 'style', 'link', '.pm-launch-row'],
    titleSlide: ['.week-hero'],
    dividers: ['.part-header'],
    dividerLabel: '.part-label',
    wholeSlides: ['.video-panel', '.week-plan', '.quiz-section'],
    flowSections: ['.reading-section', '.objectives'],
    sectionNumber: '.section-num',
    sectionTitle: 'h2',
    soloBlocks: ['.sim', '.activity', '.worked', '.table-wrap', 'figure', '.quiz', 'iframe', 'video'],
    breakBefore: ['h3'],
    splitLists: ['ul:not(.term-list)', 'ol'],
    maxListItems: 6,
    charsPerSlide: 1100,
    hideInSlides: ['.section-footer', '.to-notes', '.to-notes-row', '.emphasis-bar', '.pm-launch-row'],
    notes: ['.speaker-notes', '[data-speaker-notes]'],
    stepButtons: ['.guided .guided-steps + .act-actions > button:first-child'],
    launchIn: [
      { into: '.topbar .tools', where: 'first' },
      { into: '.week-hero', after: '.meta-row' }
    ],
    themeButton: '#theme-btn',
    calcButton: '.calc-toggle',
    aboveDeck: ['.term-pop', '.calc-panel', '.notes-panel', '.toast'],
    pageChrome: ['main', '.topbar', '.topbar-restore', '.site-footer', '.skip-link'],
    nextDeck: '.pager a.next',
    deckTitle: '.week-hero h1',
    deckKicker: '.week-kicker',
    kindLabel: function (el) {
      if (el.matches('.sim')) return 'Simulation';
      if (el.matches('.activity') && el.querySelector('.guided')) return 'Guided problem';
      if (el.matches('.activity')) return 'Activity';
      if (el.matches('.worked')) return 'Worked example';
      if (el.matches('.quiz, .quiz-section')) return 'Quiz';
      if (el.matches('figure')) return 'Figure';
      if (el.matches('.table-wrap')) return 'Table';
      if (el.matches('.video-panel')) return 'Video';
      return '';
    },
    soloTitle: function (el) {
      var h = el.querySelector('h3, h2, figcaption, caption');
      return h ? squash(h.textContent) : '';
    },
    glossary: function (termEl) {
      var g = window.PHYS106_GLOSSARY, k = termEl.getAttribute('data-term');
      return g && g[k] ? { term: g[k].term, def: g[k].def } : null;
    },
    terms: '.term[data-term]'
  };

  var C = Object.assign({}, CONFIG, window.PRESENT_CONFIG || {});
  if (!document.querySelector(C.onlyIf)) return;

  /* ---------- small helpers ---------- */
  function sel(list) { return Array.isArray(list) ? list.join(',') : list; }
  function is(el, list) { return el.nodeType === 1 && !!list && (Array.isArray(list) ? list.length : true) && el.matches(sel(list)); }
  function kids(el) { return Array.prototype.slice.call(el.children); }
  function squash(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }
  function visible(el) { return !el.hidden && el.getClientRects().length > 0; }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function button(cls, label, title) {
    var b = mk('button', cls); b.type = 'button'; b.innerHTML = label;
    if (title) { b.title = title; b.setAttribute('aria-label', title); }
    return b;
  }
  function excerpt(nodes, n) {
    var t = squash(nodes.map(function (x) { return x.el.textContent; }).join(' '));
    return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t;
  }
  function store(patch) {
    var s = {}; try { s = JSON.parse(localStorage.getItem(C.storageKey)) || {}; } catch (e) { s = {}; }
    if (patch) { Object.assign(s, patch); try { localStorage.setItem(C.storageKey, JSON.stringify(s)); } catch (e) { /* storage off */ } }
    return s;
  }
  var prefs = Object.assign({ scale: 1, steps: true, fullscreen: true, resume: {} }, store());
  var pageKey = location.pathname;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- load the stylesheet next to this script ---------- */
  (function () {
    var me = document.currentScript || document.querySelector('script[src*="present.js"]');
    if (!me || document.querySelector('link[data-present-css]')) return;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.setAttribute('data-present-css', '');
    l.href = me.src.replace(/js\/present\.js(\?.*)?$/, 'css/present.css');
    document.head.appendChild(l);
    var s = document.createElement('style');
    s.textContent = 'html.pm-on ' + C.aboveDeck.join(', html.pm-on ') + ' { z-index: 2147483600 !important; }\n' +
      'html.pm-on ' + C.pageChrome.join(', html.pm-on ') + ' { display: none !important; }\n' +
      '.pm-body ' + C.hideInSlides.join(', .pm-body ') + ' { display: none !important; }';
    document.head.appendChild(s);
  })();

  /* ---------- build the deck from the page ---------- */
  function buildDeck() {
    var slides = [], part = null;
    var root = document.querySelector(C.contentRoot);
    if (!root) return slides;

    function push(s) { s.part = part; slides.push(s); }

    function walk(container) {
      kids(container).forEach(function (el) {
        if (is(el, C.skip) || is(el, C.notes)) return;
        if (is(el, C.containers)) { walk(el); return; }
        if (!visible(el)) return;
        if (is(el, C.titleSlide)) {
          push({ kind: 'title', nodes: [{ el: el }], title: deckTitle(), source: el });
        } else if (is(el, C.dividers)) {
          var lab = el.querySelector(C.dividerLabel), h = el.querySelector('h2, h3');
          part = squash((lab ? lab.textContent + ': ' : '') + (h ? h.textContent : ''));
          push({ kind: 'divider', nodes: [{ el: el }], title: part, source: el });
        } else if (is(el, C.wholeSlides)) {
          var wh = el.querySelector('h2, h3');
          push({ kind: 'whole', label: C.kindLabel(el), nodes: [{ el: el }], title: wh ? squash(wh.textContent) : C.kindLabel(el), source: el });
        } else if (is(el, C.flowSections) || el.querySelector(':scope > h2')) {
          flow(el);
        } else {
          push({ kind: 'whole', nodes: [{ el: el }], title: C.soloTitle(el) || 'Slide', source: el });
        }
      });
    }

    function flow(section) {
      var numEl = section.querySelector(':scope > ' + C.sectionNumber);
      var head = kids(section).filter(function (k) { return is(k, C.sectionTitle); })[0];
      var title = head ? squash(head.textContent) : '';
      var num = numEl ? squash(numEl.textContent) : '';
      var groups = [], cur = null;
      function flush() { if (cur && cur.nodes.length) groups.push(cur); cur = null; }
      function add(node, w) { if (!cur) cur = { nodes: [], w: 0, notes: [] }; node.w = w; cur.nodes.push(node); cur.w += w; }
      // a heading, or a sentence ending in a colon, travels with whatever comes next
      function takeLead() {
        var lead = [];
        while (cur && cur.nodes.length > lead.length) {
          var last = cur.nodes[cur.nodes.length - 1 - lead.length].el;
          if (/^H[3-6]$/.test(last.tagName) || (last.tagName === 'P' && /:\s*$/.test(last.textContent))) lead.unshift(cur.nodes[cur.nodes.length - 1 - lead.length]);
          else break;
          if (lead.length >= 2) break;
        }
        if (lead.length) {
          cur.nodes.splice(cur.nodes.length - lead.length, lead.length);
          lead.forEach(function (n) { cur.w -= n.w || 0; });
        }
        return lead;
      }
      var pendingNotes = [];
      kids(section).forEach(function (el) {
        if (el === head || el === numEl) return;
        if (is(el, C.notes)) { (cur || groups[groups.length - 1] || { notes: pendingNotes }).notes.push(el); return; }
        if (is(el, C.skip) || is(el, C.hideInSlides) || !visible(el)) return;
        if (is(el, C.soloBlocks)) {
          var lead = takeLead(); flush();
          groups.push({ nodes: lead.concat([{ el: el }]), solo: el, notes: [] });
          return;
        }
        if (is(el, C.breakBefore)) { flush(); add({ el: el }, weight(el)); return; }
        if (is(el, C.splitLists)) {
          var items = kids(el).filter(function (li) { return li.tagName === 'LI' && visible(li); });
          if (items.length > C.maxListItems) {
            var lead2 = takeLead(); flush();
            var chunks = Math.ceil(items.length / C.maxListItems), per = Math.ceil(items.length / chunks);
            for (var a = 0; a < items.length; a += per) {
              if (a === 0) lead2.forEach(function (n) { add(n, n.w || 0); });
              add({ el: el, range: [a, Math.min(items.length, a + per)], items: items }, C.charsPerSlide);
              flush();
            }
            return;
          }
        }
        var w = weight(el);
        if (cur && cur.w + w > C.charsPerSlide && cur.w > C.charsPerSlide * 0.3) {
          var lead3 = takeLead();
          if (cur.nodes.length) { flush(); lead3.forEach(function (n) { add(n, n.w || 0); }); }
          else lead3.forEach(function (n) { cur.nodes.push(n); cur.w += n.w || 0; });
        }
        add({ el: el }, w);
        if (cur.w >= C.charsPerSlide && !/:\s*$/.test(el.textContent)) flush();
      });
      flush();
      if (groups[0] && pendingNotes.length) groups[0].notes = pendingNotes.concat(groups[0].notes);
      if (!groups.length) groups.push({ nodes: [], notes: [] });
      groups.forEach(function (g, i) {
        var solo = g.solo;
        push({
          kind: solo ? (solo.matches('.sim') ? 'sim' : 'solo') : 'flow',
          label: solo ? C.kindLabel(solo) : '',
          nodes: g.nodes, notes: g.notes || [], num: num, title: title,
          subtitle: solo ? C.soloTitle(solo) : '',
          seq: i + 1, seqTotal: groups.length, source: g.nodes[0] ? g.nodes[0].el : section, section: section
        });
      });
    }

    walk(root);
    var next = document.querySelector(C.nextDeck);
    push({ kind: 'end', nodes: [], title: 'End of ' + (shortKicker() || 'this module'), next: next, source: null });
    slides.forEach(function (s, i) {
      s.index = i;
      if (!s.notes) s.notes = [];
      s.nodes.forEach(function (n) { if (n.el.matches && n.el.hasAttribute('data-speaker-notes')) s.notes.push(n.el); });
    });
    return slides;
  }

  function weight(el) {
    var t = squash(el.textContent).length;
    if (el.matches('aside, .callout')) t += 100;
    if (el.tagName === 'DETAILS' && !el.open) { var s = el.querySelector('summary'); t = (s ? squash(s.textContent).length : 40) + 50; }
    if (el.matches('img, svg') || el.querySelector('img, svg, video, iframe')) t += 380;
    if (/^(UL|OL)$/.test(el.tagName)) t += el.children.length * 25;
    if (/^H[3-6]$/.test(el.tagName)) t += 60;
    return t + 30;
  }
  function deckTitle() { var h = document.querySelector(C.deckTitle); return h ? squash(h.textContent) : document.title; }
  function shortKicker() { var k = document.querySelector(C.deckKicker); return k ? squash(k.textContent).replace(/\s+of\s+\d+$/i, '') : ''; }

  /* ---------- state ---------- */
  var deck = [], at = -1, ui = null, live = false, presenter = false, linked = false;
  var blank = null, restoreY = 0, idleTimer = null, numBuf = '', numTimer = null;
  var chan = null;
  try { chan = new BroadcastChannel('pm:' + pageKey); } catch (e) { chan = null; }
  var timer = { start: 0, paused: 0, pausedAt: 0 }, tickTimer = null;

  /* ---------- launch buttons ---------- */
  function addLaunchers() {
    C.launchIn.forEach(function (spot, n) {
      var host = document.querySelector(spot.into); if (!host) return;
      var b;
      if (spot.where === 'first') {
        b = button('pm-launch', '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="3" width="16" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 6.5v5l4-2.5z" fill="currentColor"/><path d="M10 14v3M6.5 17h7" stroke="currentColor" stroke-width="1.6"/></svg><span>Present</span>', 'Present this module as slides');
        host.insertBefore(b, host.firstChild);
      } else {
        var row = mk('p', 'pm-launch-row');
        b = button('btn btn-primary pm-launch pm-launch-big', 'Present this module');
        var tip = mk('span', 'pm-launch-tip', 'Turns this page into slides for class. Works with a presentation clicker.');
        row.appendChild(b); row.appendChild(tip);
        var after = spot.after ? host.querySelector(spot.after) : null;
        if (after && after.nextSibling) host.insertBefore(row, after.nextSibling); else host.appendChild(row);
      }
      b.addEventListener('click', openStart);
    });
  }

  /* ---------- start dialog ---------- */
  var startDlg = null;
  function currentSectionSlide() {
    if (window.scrollY < 200) return null;
    var y = window.innerHeight * 0.35, best = null;
    deck.forEach(function (s) {
      if (!s.source || s.kind === 'title' || s.kind === 'end') return;
      if (s.source.getBoundingClientRect().top <= y) best = s;
    });
    return best;
  }

  function openStart() {
    deck = buildDeck();
    if (!startDlg) {
      startDlg = mk('dialog', 'pm-start');
      startDlg.setAttribute('aria-labelledby', 'pm-start-h');
      document.body.appendChild(startDlg);
      startDlg.addEventListener('click', function (ev) { if (ev.target === startDlg) startDlg.close(); });
    }
    var here = currentSectionSlide();
    var resume = prefs.resume && prefs.resume[pageKey];
    var html = '<h2 id="pm-start-h">Present this module</h2>' +
      '<p class="pm-start-lede">' + deck.length + ' slides, built from this page. Simulations and activities stay live, so you can run them in front of the class.</p>' +
      '<div class="pm-start-go">' +
      '<button type="button" class="pm-go-primary" data-go="0">Start from the beginning</button>';
    if (here) html += '<button type="button" data-go="' + here.index + '">Start at the section you’re reading<small>' + esc(slideLabel(here)) + '</small></button>';
    if (resume && resume > 0 && resume < deck.length - 1 && (!here || here.index !== resume)) html += '<button type="button" data-go="' + resume + '">Pick up where you left off<small>Slide ' + (resume + 1) + ': ' + esc(slideLabel(deck[resume])) + '</small></button>';
    html += '</div>' +
      '<fieldset class="pm-start-opts"><legend>Options</legend>' +
      '<label><input type="checkbox" name="fullscreen"' + (prefs.fullscreen ? ' checked' : '') + '> Fill the whole screen</label>' +
      '<label><input type="checkbox" name="steps"' + (prefs.steps ? ' checked' : '') + '> On guided problems, the clicker reveals the solution one step at a time before moving on</label>' +
      '</fieldset>' +
      '<details class="pm-start-keys"><summary>Clicker and keyboard controls</summary>' + keyTable() + '</details>' +
      '<div class="pm-start-foot"><button type="button" class="pm-start-cancel">Cancel</button></div>';
    startDlg.innerHTML = html;
    Array.prototype.forEach.call(startDlg.querySelectorAll('[data-go]'), function (b) {
      b.addEventListener('click', function () {
        prefs.fullscreen = startDlg.querySelector('[name=fullscreen]').checked;
        prefs.steps = startDlg.querySelector('[name=steps]').checked;
        store({ fullscreen: prefs.fullscreen, steps: prefs.steps });
        startDlg.close();
        start(+b.getAttribute('data-go'), { fullscreen: prefs.fullscreen });
      });
    });
    startDlg.querySelector('.pm-start-cancel').addEventListener('click', function () { startDlg.close(); });
    startDlg.showModal();
    startDlg.querySelector('.pm-go-primary').focus();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function slideLabel(s) {
    if (!s) return '';
    if (s.kind === 'flow' || s.kind === 'sim' || s.kind === 'solo') {
      var t = (s.num ? s.num + ' ' : '') + s.title;
      if (s.subtitle) t += ': ' + s.subtitle;
      else if (s.seqTotal > 1) t += ' (' + s.seq + ' of ' + s.seqTotal + ')';
      return t;
    }
    return s.title;
  }
  var KEYS = [
    ['Next slide', 'Clicker forward, →, ↓, Page Down, Space'],
    ['Previous slide', 'Clicker back, ←, ↑, Page Up'],
    ['Black screen (press again to return)', 'B or . (the blank button on most clickers)'],
    ['White screen', 'W or ,'],
    ['All slides', 'O, or click the slide counter'],
    ['Go to a slide', 'Type its number, then Enter'],
    ['First or last slide', 'Home or End'],
    ['Bigger or smaller text', '+ or −'],
    ['Full screen on or off', 'F'],
    ['Timer on or off', 'T'],
    ['These controls', '?'],
    ['End the presentation', 'Esc']
  ];
  function keyTable() {
    return '<table class="pm-keys"><tbody>' + KEYS.map(function (k) { return '<tr><th scope="row">' + k[0] + '</th><td>' + k[1] + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="pm-keys-note">When a slider or text box on a slide has focus, the arrow keys move the slider; the clicker’s Page Up and Page Down still change slides. If a slide has more than fits, the clicker scrolls it before moving on.</p>';
  }

  /* ---------- the presentation UI ---------- */
  function buildUI() {
    var r = mk('div', 'pm-root');
    r.setAttribute('role', 'region');
    r.setAttribute('aria-roledescription', 'slide deck');
    r.setAttribute('aria-label', 'Presentation: ' + deckTitle());
    r.innerHTML =
      '<div class="pm-stage">' +
        '<div class="pm-slide" role="group" aria-roledescription="slide" tabindex="-1">' +
          '<header class="pm-head"></header><div class="pm-body"></div>' +
        '</div>' +
        '<div class="pm-blank" hidden></div>' +
      '</div>' +
      '<footer class="pm-foot">' +
        '<span class="pm-foot-part"></span>' +
        '<span class="pm-foot-hint" aria-hidden="true"></span>' +
        '<span class="pm-foot-timer" hidden></span>' +
        '<span class="pm-foot-count"></span>' +
        '<div class="pm-progress" aria-hidden="true"><div class="pm-progress-fill"></div></div>' +
      '</footer>' +
      '<nav class="pm-bar" aria-label="Presentation controls"></nav>' +
      '<div class="pm-overview" hidden role="dialog" aria-modal="true" aria-label="All slides"></div>' +
      '<div class="pm-numbuf" hidden aria-live="polite"></div>' +
      '<div class="pm-toast" aria-live="polite"></div>' +
      '<p class="pm-live" aria-live="polite"></p>';
    var bar = r.querySelector('.pm-bar');
    var b = {};
    function add(key, html, title, fn, cls) { var x = button('pm-btn' + (cls ? ' ' + cls : ''), html, title); x.addEventListener('click', fn); bar.appendChild(x); b[key] = x; return x; }
    function gap() { bar.appendChild(mk('span', 'pm-bar-gap')); }
    add('prev', '<span aria-hidden="true">‹</span> Back', 'Previous slide', function () { cmd('prev'); }, 'pm-btn-nav');
    add('count', '', 'Show all slides', function () { toggleOverview(); }, 'pm-btn-count');
    add('next', 'Next <span aria-hidden="true">›</span>', 'Next slide', function () { cmd('next'); }, 'pm-btn-nav pm-btn-next');
    gap();
    add('smaller', 'A−', 'Smaller text', function () { setScale(-0.1); });
    add('larger', 'A+', 'Larger text', function () { setScale(0.1); });
    if (!presenter && document.querySelector(C.themeButton)) add('theme', 'Theme', 'Change the color theme', cycleTheme);
    if (!presenter && document.querySelector(C.calcButton)) add('calc', 'Calc', 'Open the calculator', function () { var c = document.querySelector(C.calcButton); if (c) c.click(); });
    add('black', 'Black', 'Black out the screen (B)', function () { cmd('blank', 'black'); });
    add('timer', 'Timer', 'Show or hide the timer (T)', toggleTimer);
    if (!presenter && chan) add('pview', 'Presenter view', 'Open a presenter window for your laptop screen', openPresenter);
    if (!presenter && fsSupported()) add('fs', 'Full screen', 'Full screen on or off (F)', toggleFullscreen);
    add('help', '?', 'Clicker and keyboard controls', showHelp);
    add('exit', 'End', presenter ? 'Close the presenter window' : 'End the presentation (Esc)', function () { presenter ? window.close() : stop(); }, 'pm-btn-exit');
    ui = {
      root: r, stage: r.querySelector('.pm-stage'), slide: r.querySelector('.pm-slide'), head: r.querySelector('.pm-head'),
      body: r.querySelector('.pm-body'), blank: r.querySelector('.pm-blank'), part: r.querySelector('.pm-foot-part'),
      hint: r.querySelector('.pm-foot-hint'), count: r.querySelector('.pm-foot-count'), fill: r.querySelector('.pm-progress-fill'),
      progress: r.querySelector('.pm-progress'), timerEl: r.querySelector('.pm-foot-timer'), bar: bar, btn: b,
      overview: r.querySelector('.pm-overview'), numbuf: r.querySelector('.pm-numbuf'), toast: r.querySelector('.pm-toast'), live: r.querySelector('.pm-live')
    };
    if (presenter) buildPresenterPanel(r);
    // part boundaries on the progress line
    deck.forEach(function (s) {
      if (s.kind !== 'divider') return;
      var t = mk('span', 'pm-progress-tick'); t.style.left = (100 * s.index / Math.max(1, deck.length - 1)) + '%'; ui.progress.appendChild(t);
    });
    // swipe
    var sx = null, sy = null;
    ui.stage.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || e.target.closest('input, select, textarea, .sim-stage, [draggable="true"]')) { sx = null; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    ui.stage.addEventListener('touchend', function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) cmd(dx < 0 ? 'next' : 'prev');
    });
    // idle: hide the control bar and cursor
    r.addEventListener('mousemove', wake);
    r.addEventListener('touchstart', wake, { passive: true });
    bar.addEventListener('focusin', wake);
    document.body.appendChild(r);
    return ui;
  }
  function wake() {
    ui.root.classList.remove('pm-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () { if (!ui.bar.contains(document.activeElement) && !ui.bar.matches(':hover')) ui.root.classList.add('pm-idle'); }, 2600);
  }

  /* ---------- starting and stopping ---------- */
  function start(index, opts) {
    if (live) { go(index); return; }
    opts = opts || {};
    deck = deck.length ? deck : buildDeck();
    restoreY = window.scrollY;
    live = true;
    buildUI();
    document.documentElement.classList.add('pm-on');
    if (presenter) document.documentElement.classList.add('pm-presenter-on');
    document.documentElement.setAttribute('data-pm-root-font', document.documentElement.style.fontSize || '');
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', syncFsButton);
    if (opts.fullscreen && !presenter) enterFullscreen();
    if (!timer.start) { timer.start = Date.now(); timer.paused = 0; timer.pausedAt = 0; }
    go(Math.max(0, Math.min(deck.length - 1, index || 0)));
    wake();
    if (!presenter) toast(fsSupported() && !opts.fullscreen ? 'Press F for full screen. Press ? for the controls.' : 'Press ? for the clicker and keyboard controls.');
    if (presenter && chan) chan.postMessage({ cmd: 'hello' });
    clearInterval(tickTimer); tickTimer = setInterval(tick, 1000);
  }

  function stop() {
    if (!live) return;
    var s = deck[at];
    leave();
    live = false;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('fullscreenchange', syncFsButton);
    document.documentElement.classList.remove('pm-on', 'pm-presenter-on');
    document.documentElement.style.fontSize = document.documentElement.getAttribute('data-pm-root-font') || '';
    document.documentElement.removeAttribute('data-pm-root-font');
    if (ui && ui.root) ui.root.remove();
    ui = null;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    setUrl(null);
    if (chan && !presenter) chan.postMessage({ evt: 'exit' });
    // land on the part of the page that was on screen
    var target = s && s.source && s.kind !== 'title' && s.kind !== 'end' ? s.source : null;
    requestAnimationFrame(function () {
      if (target) target.scrollIntoView({ block: 'start' }); else window.scrollTo(0, s && s.kind === 'end' ? document.body.scrollHeight : restoreY);
      var f = document.querySelector('.pm-launch'); if (f) f.focus({ preventScroll: true });
    });
    deck = [];
    timer.start = 0;
    clearInterval(tickTimer);
  }

  /* ---------- moving page elements onto a slide and back ---------- */
  var placed = [];
  function place(node, into) {
    var el = node.el, ph = document.createComment('pm-slot');
    el.parentNode.insertBefore(ph, el);
    into.appendChild(el);
    var rec = { el: el, ph: ph, node: node };
    if (node.range) {
      node.items.forEach(function (li, i) { if (i < node.range[0] || i >= node.range[1]) li.classList.add('pm-li-off'); });
      if (el.tagName === 'OL') { rec.start = el.getAttribute('start'); el.setAttribute('start', String((+rec.start || 1) + node.range[0])); }
    }
    placed.push(rec);
  }
  function leave() {
    placed.forEach(function (rec) {
      if (rec.node.range) {
        rec.node.items.forEach(function (li) { li.classList.remove('pm-li-off'); if (!li.className) li.removeAttribute('class'); });
        if (rec.el.tagName === 'OL') { if (rec.start == null) rec.el.removeAttribute('start'); else rec.el.setAttribute('start', rec.start); }
      }
      if (rec.ph.parentNode) { rec.ph.parentNode.insertBefore(rec.el, rec.ph); rec.ph.remove(); }
    });
    placed = [];
    if (ui) { ui.body.innerHTML = ''; ui.head.innerHTML = ''; }
  }

  /* ---------- showing a slide ---------- */
  function go(i, opts) {
    opts = opts || {};
    if (!live || i < 0 || i >= deck.length) return;
    closeOverview();
    leave();
    at = i;
    var s = deck[i];
    ui.slide.className = 'pm-slide pm-kind-' + s.kind;
    ui.slide.setAttribute('aria-label', (i + 1) + ' of ' + deck.length);
    // heading row for section slides
    if (s.kind === 'flow' || s.kind === 'sim' || s.kind === 'solo') {
      var hn = mk('div', 'pm-head-title');
      if (s.num) hn.appendChild(mk('span', 'pm-head-num', s.num));
      hn.appendChild(mk('span', 'pm-head-text', s.title));
      ui.head.appendChild(hn);
      if (s.label) ui.head.appendChild(mk('span', 'pm-head-kind', s.label));
      else if (s.seqTotal > 1) ui.head.appendChild(mk('span', 'pm-head-seq', s.seq + ' of ' + s.seqTotal));
    }
    var col = mk('div', 'pm-col' + (s.kind === 'flow' ? ' prose' : ''));
    ui.body.appendChild(col);
    if (s.kind === 'end') renderEnd(col, s);
    s.nodes.forEach(function (n) { place(n, col); });
    ui.body.scrollTop = 0;
    if (!reduceMotion) { ui.slide.classList.remove('pm-enter'); void ui.slide.offsetWidth; ui.slide.classList.add('pm-enter'); }
    fit();
    if (opts.atEnd) ui.body.scrollTop = ui.body.scrollHeight;
    // footer
    ui.part.textContent = s.kind === 'title' || s.kind === 'end' ? shortKicker() : [shortKicker(), s.part].filter(Boolean).join(', ');
    ui.count.textContent = (i + 1) + ' / ' + deck.length;
    ui.btn.count.innerHTML = '<span>' + (i + 1) + '</span> / ' + deck.length;
    ui.fill.style.width = (100 * i / Math.max(1, deck.length - 1)) + '%';
    ui.btn.prev.disabled = i === 0;
    ui.btn.next.disabled = i === deck.length - 1;
    updateHint();
    ui.live.textContent = 'Slide ' + (i + 1) + ' of ' + deck.length + ': ' + slideLabel(s);
    if (!opts.keepFocus) ui.slide.focus({ preventScroll: true });
    if (!presenter) { setUrl(i); prefs.resume[pageKey] = i; store({ resume: prefs.resume }); }
    if (presenter) renderPresenter();
    broadcast();
    // images that arrive late change the size
    Array.prototype.forEach.call(ui.body.querySelectorAll('img'), function (img) { if (!img.complete) img.addEventListener('load', fit, { once: true }); });
  }

  function renderEnd(col, s) {
    var w = mk('div', 'pm-end');
    w.appendChild(mk('p', 'pm-end-kicker', deckTitle()));
    w.appendChild(mk('h2', null, s.title));
    var row = mk('div', 'pm-end-actions');
    if (s.next && !presenter) {
      var a = document.createElement('a'); a.className = 'btn btn-primary';
      var u = new URL(s.next.href, location.href); u.searchParams.set('present', '1');
      a.href = u.href; a.textContent = 'Present the next module';
      var small = s.next.cloneNode(true).textContent.replace(/^\s*Next\s*/, '');
      row.appendChild(a); w.appendChild(row);
      w.appendChild(mk('p', 'pm-end-next', squash(small)));
    }
    var back = button('btn', presenter ? 'Close presenter view' : 'Back to the reading');
    back.addEventListener('click', function () { presenter ? window.close() : stop(); });
    row.appendChild(back);
    if (!s.next) w.appendChild(row);
    col.appendChild(w);
  }

  /* ---------- fitting text to the screen ---------- */
  function baseSize() {
    var w = window.innerWidth, h = window.innerHeight;
    if (presenter) { w = ui.stage.clientWidth; h = ui.stage.clientHeight + 60; }
    return Math.max(15, Math.min(48, Math.min(w / 48, h / 26))) * prefs.scale;
  }
  function fits() { var b = ui.body; return b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1; }
  function setRoot(px) { document.documentElement.style.fontSize = px.toFixed(2) + 'px'; }
  function fit() {
    if (!ui) return;
    var hi = baseSize(), lo = Math.max(13, hi * (deck[at] && deck[at].kind === 'sim' ? 0.45 : 0.6)), best = lo;
    setRoot(hi);
    if (fits()) best = hi;
    else {
      for (var k = 0; k < 7; k++) { var mid = (lo + hi) / 2; setRoot(mid); if (fits()) { best = mid; lo = mid; } else hi = mid; }
    }
    setRoot(best);
    var over = !fits();
    ui.slide.classList.toggle('pm-overflow', over);
    updateHint();
  }
  var resizeTimer = null;
  function onResize() { clearTimeout(resizeTimer); resizeTimer = setTimeout(fit, 120); }
  function setScale(d) {
    prefs.scale = Math.round(Math.max(0.6, Math.min(1.8, prefs.scale + d)) * 10) / 10;
    store({ scale: prefs.scale });
    fit();
    toast('Text size ' + Math.round(prefs.scale * 100) + '%');
  }

  /* ---------- moving forward and back ---------- */
  function stepButton() {
    if (!prefs.steps || !C.stepButtons.length) return null;
    var list = ui.body.querySelectorAll(sel(C.stepButtons));
    for (var i = 0; i < list.length; i++) {
      // a step inside a closed panel (Concepts mode's "Optional: do the math") is left alone
      if (visible(list[i]) && !list[i].disabled && !list[i].closest('details:not([open])')) return list[i];
    }
    return null;
  }
  function canScroll(dir) {
    var b = ui.body;
    return dir > 0 ? b.scrollTop + b.clientHeight < b.scrollHeight - 4 : b.scrollTop > 4;
  }
  function scrollBody(dir) { ui.body.scrollBy({ top: dir * ui.body.clientHeight * 0.8, behavior: reduceMotion ? 'auto' : 'smooth' }); setTimeout(updateHint, 400); }
  function next() {
    if (blank) { setBlank(null); return; }
    var sb = stepButton();
    if (sb) {
      sb.click();
      if (chan && !presenter) chan.postMessage({ evt: 'step' });
      requestAnimationFrame(function () {
        fit();
        var steps = ui.body.querySelectorAll('.guided-step');
        var last = steps[steps.length - 1];
        if (last) last.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        ui.slide.focus({ preventScroll: true });
        updateHint();
      });
      return;
    }
    if (canScroll(1)) { scrollBody(1); return; }
    go(at + 1);
  }
  function prev() {
    if (blank) { setBlank(null); return; }
    if (canScroll(-1)) { scrollBody(-1); return; }
    go(at - 1, { atEnd: true });
  }
  function updateHint() {
    if (!ui) return;
    var t = '';
    if (stepButton()) t = 'Next reveals the next solution step';
    else if (canScroll(1)) t = 'Next scrolls down for more';
    ui.hint.textContent = t;
    ui.slide.classList.toggle('pm-more', canScroll(1));
  }

  // every control goes through cmd() so a presenter window can drive the main one
  function cmd(name, arg) {
    if (presenter && linked && chan) { chan.postMessage({ cmd: name, arg: arg }); return; }
    run(name, arg);
  }
  function run(name, arg) {
    if (name === 'next') next();
    else if (name === 'prev') prev();
    else if (name === 'go') go(arg);
    else if (name === 'blank') setBlank(blank === arg ? null : arg);
    else if (name === 'timer-pause') pauseTimer();
    else if (name === 'timer-reset') { timer.start = Date.now(); timer.paused = 0; timer.pausedAt = 0; tick(); broadcast(); }
  }

  function setBlank(kind) {
    blank = kind;
    ui.blank.hidden = !kind;
    ui.blank.className = 'pm-blank' + (kind ? ' pm-blank-' + kind : '');
    ui.root.classList.toggle('pm-blanked', !!kind);
    if (ui.btn.black) ui.btn.black.setAttribute('aria-pressed', String(kind === 'black'));
    broadcast();
  }

  /* ---------- keys ---------- */
  function onKey(ev) {
    if (!live || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var k = ev.key, t = ev.target;
    var dlg = document.querySelector('dialog[open]');
    if (dlg && !ui.root.contains(dlg)) return;
    if (!ui.overview.hidden) { if (k === 'Escape' || k === 'o' || k === 'O') { ev.preventDefault(); closeOverview(true); } return; }
    if (k === 'F5') { ev.preventDefault(); return; }   // some clickers send F5/Esc from one button
    var field = t && t.closest && t.closest('input, select, textarea, [contenteditable=""], [contenteditable="true"]');
    var widget = t && t.closest && t.closest('[role="slider"], [role="listbox"], [role="option"], [role="tablist"], [role="radiogroup"], [role="grid"], [draggable="true"], [aria-grabbed]');
    var outside = t && t.closest && (t.closest('.notes-panel, .calc-panel, .term-pop'));
    if (outside) return;
    if (k === 'PageDown') { ev.preventDefault(); cmd('next'); return; }
    if (k === 'PageUp') { ev.preventDefault(); cmd('prev'); return; }
    if (k === 'Escape') {
      if (document.querySelector('.term-pop')) return;              // let the popover close first
      if (field || widget) { ev.preventDefault(); ui.slide.focus(); return; }
      if (blank) { ev.preventDefault(); cmd('blank', blank); return; }
      ev.preventDefault(); presenter ? window.close() : stop(); return;
    }
    if (field) return;
    if (ev.defaultPrevented) return;
    var onButton = t && t.closest && t.closest('button, a[href], summary, label');
    var arrows = k === 'ArrowRight' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowUp';
    if (widget && arrows) return;
    if (blank && !/^(b|B|\.|w|W|,)$/.test(k)) { ev.preventDefault(); cmd('blank', blank); return; }

    if (/^[0-9]$/.test(k)) { numBuf += k; showNumBuf(); ev.preventDefault(); return; }
    if (k === 'Enter' && numBuf) { var n = parseInt(numBuf, 10); numBuf = ''; showNumBuf(); if (n >= 1 && n <= deck.length) cmd('go', n - 1); ev.preventDefault(); return; }
    if (k === 'Backspace' && numBuf) { numBuf = numBuf.slice(0, -1); showNumBuf(); ev.preventDefault(); return; }

    var act = null, arg;
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'n' || k === 'N') act = 'next';
    else if ((k === ' ' || k === 'Enter') && !onButton) act = ev.shiftKey ? 'prev' : 'next';
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'p' || k === 'P' || (k === 'Backspace' && !onButton)) act = 'prev';
    else if (k === 'Home') { act = 'go'; arg = 0; }
    else if (k === 'End') { act = 'go'; arg = deck.length - 1; }
    else if (k === 'b' || k === 'B' || k === '.') { act = 'blank'; arg = 'black'; }
    else if (k === 'w' || k === 'W' || k === ',') { act = 'blank'; arg = 'white'; }
    if (act) { ev.preventDefault(); cmd(act, arg); return; }
    if (k === 'o' || k === 'O' || k === 'g' || k === 'G') { ev.preventDefault(); toggleOverview(); }
    else if (k === 'f' || k === 'F') { ev.preventDefault(); toggleFullscreen(); }
    else if (k === 't' || k === 'T') { ev.preventDefault(); toggleTimer(); }
    else if (k === '+' || k === '=') { ev.preventDefault(); setScale(0.1); }
    else if (k === '-' || k === '_') { ev.preventDefault(); setScale(-0.1); }
    else if (k === '?' || k === 'h' || k === 'H') { ev.preventDefault(); showHelp(); }
  }
  function showNumBuf() {
    clearTimeout(numTimer);
    ui.numbuf.hidden = !numBuf;
    ui.numbuf.textContent = numBuf ? 'Go to slide ' + numBuf + ', then press Enter' : '';
    if (numBuf) numTimer = setTimeout(function () { numBuf = ''; showNumBuf(); }, 3500);
  }

  /* ---------- overview ---------- */
  function toggleOverview() { if (ui.overview.hidden) openOverview(); else closeOverview(true); }
  function openOverview() {
    var o = ui.overview; o.innerHTML = '';
    var head = mk('div', 'pm-ov-head');
    head.appendChild(mk('h2', null, 'All slides'));
    var close = button('pm-btn', 'Close', 'Close the slide list (Esc)'); close.addEventListener('click', function () { closeOverview(true); });
    head.appendChild(close); o.appendChild(head);
    var grid = null, lastPart = '__';
    deck.forEach(function (s) {
      var p = s.kind === 'title' ? '' : (s.part || '');
      if (p !== lastPart || !grid) {
        if (p) o.appendChild(mk('h3', 'pm-ov-part', p));
        grid = mk('ol', 'pm-ov-grid'); o.appendChild(grid); lastPart = p;
      }
      var li = mk('li');
      var card = button('pm-ov-card' + (s.index === at ? ' is-current' : '') + ' pm-ov-' + s.kind, '');
      if (s.index === at) card.setAttribute('aria-current', 'true');
      card.appendChild(mk('span', 'pm-ov-n', String(s.index + 1)));
      if (s.label) card.appendChild(mk('span', 'pm-ov-kind', s.label));
      card.appendChild(mk('span', 'pm-ov-title', slideLabel(s)));
      if (s.kind === 'flow') card.appendChild(mk('span', 'pm-ov-text', excerpt(s.nodes, 110)));
      card.addEventListener('click', function () { cmd('go', s.index); closeOverview(false); });
      li.appendChild(card); grid.appendChild(li);
    });
    o.hidden = false;
    var cur = o.querySelector('.is-current');
    if (cur) { cur.focus(); cur.scrollIntoView({ block: 'center' }); }
  }
  function closeOverview(refocus) { if (!ui || ui.overview.hidden) return; ui.overview.hidden = true; ui.overview.innerHTML = ''; if (refocus) ui.slide.focus({ preventScroll: true }); }

  /* ---------- help ---------- */
  var helpDlg = null;
  function showHelp() {
    if (!helpDlg) {
      helpDlg = mk('dialog', 'pm-start pm-help');
      helpDlg.setAttribute('aria-labelledby', 'pm-help-h');
      helpDlg.innerHTML = '<h2 id="pm-help-h">Clicker and keyboard controls</h2>' + keyTable() + '<div class="pm-start-foot"><button type="button" class="pm-go-primary">Got it</button></div>';
      helpDlg.querySelector('button').addEventListener('click', function () { helpDlg.close(); });
      helpDlg.addEventListener('close', function () { if (ui) ui.slide.focus({ preventScroll: true }); });
      document.body.appendChild(helpDlg);
    }
    helpDlg.showModal();
  }

  /* ---------- theme, toast, fullscreen, url ---------- */
  function cycleTheme() {
    var t = document.querySelector(C.themeButton); if (!t) return;
    t.click();
    setTimeout(function () { toast(squash(t.textContent)); }, 30);
  }
  var toastTimer = null;
  function toast(msg) {
    if (!ui) return;
    ui.toast.textContent = msg; ui.toast.classList.add('is-on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { if (ui) ui.toast.classList.remove('is-on'); }, 3200);
  }
  function fsSupported() { return !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen); }
  function enterFullscreen() {
    var d = document.documentElement, p = d.requestFullscreen ? d.requestFullscreen() : (d.webkitRequestFullscreen && d.webkitRequestFullscreen());
    if (p && p.catch) p.catch(function () { toast('Press F for full screen.'); });
  }
  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    else enterFullscreen();
  }
  function syncFsButton() {
    if (!ui || !ui.btn.fs) return;
    var on = !!document.fullscreenElement;
    ui.btn.fs.textContent = on ? 'Exit full screen' : 'Full screen';
    ui.btn.fs.setAttribute('aria-pressed', String(on));
    setTimeout(fit, 150);
  }
  function setUrl(i) {
    try {
      var u = new URL(location.href);
      if (i == null) u.searchParams.delete('present'); else u.searchParams.set('present', String(i + 1));
      if (presenter) return;
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    } catch (e) { /* ignore */ }
  }

  /* ---------- timer ---------- */
  function elapsed() { var now = timer.pausedAt || Date.now(); return Math.max(0, now - timer.start - timer.paused); }
  function fmt(ms) { var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); s = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0'); }
  function tick() {
    if (!ui) return;
    ui.timerEl.textContent = fmt(elapsed()) + (timer.pausedAt ? ' (paused)' : '');
    if (presenter) {
      var e = ui.root.querySelector('.pm-pv-timer'); if (e) e.textContent = fmt(elapsed());
      var c = ui.root.querySelector('.pm-pv-clock'); if (c) c.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      var pb = ui.root.querySelector('.pm-pv-pause'); if (pb) pb.textContent = timer.pausedAt ? 'Resume' : 'Pause';
    }
  }
  function toggleTimer() { ui.timerEl.hidden = !ui.timerEl.hidden; if (ui.btn.timer) ui.btn.timer.setAttribute('aria-pressed', String(!ui.timerEl.hidden)); tick(); }
  function pauseTimer() {
    if (timer.pausedAt) { timer.paused += Date.now() - timer.pausedAt; timer.pausedAt = 0; } else timer.pausedAt = Date.now();
    tick(); broadcast();
  }

  /* ---------- presenter view (a second window, kept in sync) ---------- */
  function openPresenter() {
    var u = new URL(location.href);
    u.searchParams.set('present', String(at + 1)); u.searchParams.set('pm', 'presenter'); u.hash = '';
    var w = window.open(u.href, 'pm-presenter', 'width=1180,height=760');
    if (!w) toast('Your browser blocked the window. Allow pop-ups for this site, then try again.');
    else toast('Presenter view opened. Drag it to your laptop screen.');
  }
  function broadcast() {
    if (!chan || presenter || !live) return;
    chan.postMessage({ evt: 'state', at: at, blank: blank, timer: timer, total: deck.length });
  }
  if (chan) chan.onmessage = function (m) {
    var d = m.data || {};
    if (!presenter) {
      if (!live) return;
      if (d.cmd === 'hello') broadcast();
      else if (d.cmd) run(d.cmd, d.arg);
    } else {
      if (d.evt === 'state') {
        linked = true;
        timer = d.timer || timer;
        if (live && d.at !== at) go(d.at, { keepFocus: true });
        if (live && (d.blank || null) !== blank) setBlank(d.blank || null);
        if (live) renderPresenter();
      } else if (d.evt === 'step' && live) {
        var sb = stepButton(); if (sb) { sb.click(); requestAnimationFrame(fit); }
      } else if (d.evt === 'exit' && live) {
        linked = false; renderPresenter(true);
      }
    }
  };
  function buildPresenterPanel(r) {
    var p = mk('aside', 'pm-pv');
    p.setAttribute('aria-label', 'Presenter tools');
    p.innerHTML =
      '<div class="pm-pv-status"></div>' +
      '<div class="pm-pv-time"><div><span class="pm-pv-label">Elapsed</span><span class="pm-pv-timer">0:00</span></div>' +
      '<div><span class="pm-pv-label">Clock</span><span class="pm-pv-clock"></span></div>' +
      '<div class="pm-pv-tbtns"><button type="button" class="pm-btn pm-pv-pause">Pause</button><button type="button" class="pm-btn pm-pv-reset">Reset</button></div></div>' +
      '<div class="pm-pv-nav"><button type="button" class="pm-pv-big pm-pv-prev">‹ Back</button><button type="button" class="pm-pv-big pm-pv-next">Next ›</button></div>' +
      '<section class="pm-pv-sec"><h2>Next up</h2><div class="pm-pv-next-card"></div></section>' +
      '<section class="pm-pv-sec pm-pv-notes-sec"><h2>Notes for this slide</h2><div class="pm-pv-notes"></div></section>';
    p.querySelector('.pm-pv-prev').addEventListener('click', function () { cmd('prev'); });
    p.querySelector('.pm-pv-next').addEventListener('click', function () { cmd('next'); });
    p.querySelector('.pm-pv-pause').addEventListener('click', function () { cmd('timer-pause'); });
    p.querySelector('.pm-pv-reset').addEventListener('click', function () { cmd('timer-reset'); });
    r.appendChild(p);
  }
  function renderPresenter(ended) {
    var p = ui && ui.root.querySelector('.pm-pv'); if (!p) return;
    var st = p.querySelector('.pm-pv-status');
    st.className = 'pm-pv-status' + (linked ? ' is-linked' : '');
    st.textContent = ended ? 'The presentation in the main window has ended.' :
      linked ? 'Linked to the main window. Your clicker works in either window.' :
      'Not linked yet. Keep the main presentation open in the other window.';
    var n = deck[at + 1], nc = p.querySelector('.pm-pv-next-card');
    nc.innerHTML = '';
    if (n) {
      nc.appendChild(mk('span', 'pm-pv-next-n', 'Slide ' + (n.index + 1) + (n.label ? ', ' + n.label.toLowerCase() : '')));
      nc.appendChild(mk('strong', null, slideLabel(n)));
      if (n.nodes.length && n.kind === 'flow') nc.appendChild(mk('p', null, excerpt(n.nodes, 220)));
    } else nc.appendChild(mk('p', null, 'This is the last slide.'));
    var notes = p.querySelector('.pm-pv-notes'); notes.innerHTML = '';
    var s = deck[at];
    var written = (s.notes || []).map(function (el) { return el.getAttribute('data-speaker-notes') || el.innerHTML; });
    if (written.length) written.forEach(function (h) { var d = mk('div', 'pm-pv-note'); d.innerHTML = h; notes.appendChild(d); });
    var seen = {}, terms = [];
    Array.prototype.forEach.call(ui.body.querySelectorAll(C.terms), function (t) {
      var g = C.glossary(t); if (g && !seen[g.term]) { seen[g.term] = 1; terms.push(g); }
    });
    if (terms.length) {
      notes.appendChild(mk('h3', null, 'Terms on this slide'));
      var dl = mk('dl', 'pm-pv-terms');
      terms.forEach(function (g) { dl.appendChild(mk('dt', null, g.term)); dl.appendChild(mk('dd', null, g.def)); });
      notes.appendChild(dl);
    }
    if (stepButton()) notes.appendChild(mk('p', 'pm-pv-tip', 'Next reveals the next solution step on this guided problem.'));
    if (!written.length && !terms.length && !notes.childNodes.length) notes.appendChild(mk('p', 'pm-pv-empty', 'No notes for this slide.'));
  }

  /* ---------- go ---------- */
  function boot() {
    var q = new URLSearchParams(location.search);
    presenter = q.get('pm') === 'presenter';
    if (!presenter) addLaunchers();
    var n = parseInt(q.get('present'), 10);
    if (n >= 1 || presenter) {
      deck = buildDeck();
      start((n || 1) - 1, { fullscreen: false });
      if (presenter) document.title = 'Presenter view: ' + deckTitle();
    }
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
