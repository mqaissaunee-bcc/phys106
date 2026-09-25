/* PHYS 106 Astronomy — shared site behavior.
   CSP-safe: no inline handlers, no eval. All state in localStorage (wrapped in try/catch). */
(function () {
  'use strict';

  var PREFS_KEY = 'phys106-prefs-v1';
  var PROGRESS_KEY = 'phys106-progress-v1';
  var QUIZ_KEY = 'phys106-quiz-v1';

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* ---------- storage ---------- */
  function load(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  /* ---------- announcer + toast ---------- */
  var announcer = document.createElement('div');
  announcer.className = 'visually-hidden';
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('role', 'status');
  document.body.appendChild(announcer);
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('aria-hidden', 'true');
  document.body.appendChild(toast);
  var toastTimer = null;
  function announce(msg, showToast) {
    announcer.textContent = '';
    window.setTimeout(function () { announcer.textContent = msg; }, 30);
    if (showToast) {
      toast.textContent = msg;
      toast.classList.add('show');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () { toast.classList.remove('show'); }, 2200);
    }
  }
  window.PHYS106 = { announce: announce, load: load, save: save, shuffle: shuffle };

  /* ---------- theme + text size ---------- */
  var prefs = load(PREFS_KEY, {});
  var THEMES = ['auto', 'light', 'dark', 'night'];
  var THEME_LABELS = { auto: 'Theme: auto', light: 'Theme: light', dark: 'Theme: dark', night: 'Theme: night (red)' };
  var themeBtn = document.getElementById('theme-btn');
  function applyTheme(t) {
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    if (themeBtn) {
      themeBtn.textContent = THEME_LABELS[t];
      themeBtn.setAttribute('aria-label', THEME_LABELS[t] + '. Activate to change theme.');
    }
  }
  applyTheme(prefs.theme || 'auto');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var cur = prefs.theme || 'auto';
      var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      prefs.theme = next;
      save(PREFS_KEY, prefs);
      applyTheme(next);
      var extra = next === 'night' ? ' Red light preserves your night vision when observing outdoors.' : '';
      announce(THEME_LABELS[next] + '.' + extra, true);
    });
  }

  function applyScale(s) {
    document.documentElement.style.setProperty('--scale', String(s));
  }
  var scale = prefs.scale || 1;
  applyScale(scale);
  function bindScale(id, delta) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener('click', function () {
      scale = Math.round(Math.min(1.4, Math.max(0.85, scale + delta)) * 100) / 100;
      prefs.scale = scale;
      save(PREFS_KEY, prefs);
      applyScale(scale);
      announce('Text size ' + Math.round(scale * 100) + ' percent.', true);
    });
  }
  bindScale('text-smaller', -0.1);
  bindScale('text-larger', 0.1);

  /* ---------- mobile nav ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var siteNav = document.getElementById('site-nav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- reading progress ---------- */
  var weekId = document.body.getAttribute('data-week');
  var progress = load(PROGRESS_KEY, {});
  var sections = Array.prototype.slice.call(document.querySelectorAll('.reading-section[id]'));
  var strip = document.querySelector('.progress-strip span');
  var tocProgress = document.getElementById('toc-progress');

  function doneList() { return (weekId && progress[weekId]) || []; }
  function renderProgress() {
    var done = doneList();
    sections.forEach(function (sec) {
      var isDone = done.indexOf(sec.id) !== -1;
      var btn = sec.querySelector('.mark-done');
      if (btn) {
        btn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
        btn.textContent = isDone ? '✓ Section complete' : 'Mark section complete';
      }
      var link = document.querySelector('.toc a[href="#' + sec.id + '"]');
      if (link) {
        link.parentElement.classList.toggle('done', isDone);
        var chk = link.querySelector('.check');
        if (chk) chk.textContent = isDone ? '✓' : '';
        var sr = link.querySelector('.visually-hidden');
        if (sr) sr.textContent = isDone ? ' (complete)' : '';
      }
    });
    var pct = sections.length ? Math.round(100 * done.length / sections.length) : 0;
    if (strip) strip.style.width = pct + '%';
    var stripWrap = document.querySelector('.progress-strip');
    if (stripWrap) stripWrap.setAttribute('aria-valuenow', String(pct));
    if (tocProgress) tocProgress.textContent = done.length + ' of ' + sections.length + ' sections complete';
  }
  if (weekId && sections.length) {
    sections.forEach(function (sec) {
      var btn = sec.querySelector('.mark-done');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var done = doneList().slice();
        var i = done.indexOf(sec.id);
        if (i === -1) done.push(sec.id); else done.splice(i, 1);
        progress[weekId] = done;
        save(PROGRESS_KEY, progress);
        renderProgress();
        announce(i === -1 ? 'Section marked complete.' : 'Section marked not complete.', true);
      });
    });
    renderProgress();
  }

  /* ---------- scrollspy ---------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var targets = tocLinks.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          tocLinks.forEach(function (a) {
            var on = a.getAttribute('href') === '#' + en.target.id;
            a.classList.toggle('active', on);
            if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- home page week progress ---------- */
  Array.prototype.slice.call(document.querySelectorAll('[data-week-progress]')).forEach(function (el) {
    var id = el.getAttribute('data-week-progress');
    var total = parseInt(el.getAttribute('data-total'), 10) || 0;
    var n = (progress[id] || []).length;
    var quizzes = load(QUIZ_KEY, {});
    var q = quizzes[id];
    var parts = [];
    if (n) parts.push(n + ' of ' + total + ' sections read');
    if (q && typeof q.best === 'number') parts.push('self-check best ' + q.best + '%');
    el.textContent = parts.join(', ');
  });

  /* ---------- glossary popovers: hover, keyboard focus, or tap ---------- */
  var GLOSS = window.PHYS106_GLOSSARY || {};
  var openPop = null, showTimer = null, hideTimer = null;
  var glossHref = document.body.getAttribute('data-root') ? document.body.getAttribute('data-root') + 'glossary.html' : 'glossary.html';
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function closePop(returnFocus) {
    window.clearTimeout(showTimer); window.clearTimeout(hideTimer);
    if (!openPop) return;
    var trigger = openPop.trigger;
    openPop.el.remove();
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-describedby');
    openPop = null;
    if (returnFocus) trigger.focus();
  }
  function openTerm(btn, pinned) {
    var key = btn.getAttribute('data-term'), entry = GLOSS[key];
    if (openPop && openPop.trigger === btn) {
      if (pinned && !openPop.pinned) { openPop.pinned = true; openPop.el.setAttribute('role', 'dialog'); var c = openPop.el.querySelector('button'); if (c) c.focus(); }
      return;
    }
    closePop(false);
    var pop = document.createElement('div');
    pop.className = 'term-pop';
    pop.id = btn.getAttribute('aria-controls');
    pop.setAttribute('role', pinned ? 'dialog' : 'tooltip');
    pop.setAttribute('aria-label', 'Definition: ' + entry.term);
    var t = document.createElement('strong'); t.textContent = entry.term;
    var d = document.createElement('p'); d.className = 'term-def'; d.textContent = entry.def;
    var row = document.createElement('div'); row.className = 'term-row';
    var a = document.createElement('a'); a.href = glossHref + '#' + key; a.textContent = 'Open in glossary';
    var close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close';
    close.addEventListener('click', function () { closePop(true); });
    row.appendChild(a);
    if (window.PHYS106Notes) {
      var nb = document.createElement('button'); nb.type = 'button'; nb.className = 'term-note'; nb.textContent = '＋ Notes';
      nb.setAttribute('aria-label', 'Add the definition of ' + entry.term + ' to notes');
      nb.addEventListener('click', function () { window.PHYS106Notes.add('<p><strong>' + esc(entry.term) + ':</strong> ' + esc(entry.def) + '</p>', 'Glossary'); closePop(true); });
      row.appendChild(nb);
    }
    row.appendChild(close);
    pop.appendChild(t); pop.appendChild(d); pop.appendChild(row);
    pop.addEventListener('mouseenter', function () { window.clearTimeout(hideTimer); });
    pop.addEventListener('mouseleave', function () { if (openPop && !openPop.pinned) hideTimer = window.setTimeout(function () { closePop(false); }, 250); });
    document.body.appendChild(pop);
    var r = btn.getBoundingClientRect();
    var left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8));
    var top = window.scrollY + r.bottom + 6;
    if (r.bottom + pop.offsetHeight + 16 > window.innerHeight && r.top > pop.offsetHeight + 16) top = window.scrollY + r.top - pop.offsetHeight - 6;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    btn.setAttribute('aria-expanded', 'true');
    if (!pinned) btn.setAttribute('aria-describedby', pop.id);
    openPop = { el: pop, trigger: btn, pinned: pinned };
    if (pinned) close.focus();
  }
  Array.prototype.slice.call(document.querySelectorAll('.term[data-term]')).forEach(function (btn, idx) {
    var key = btn.getAttribute('data-term');
    if (!GLOSS[key]) { btn.classList.add('term-missing'); return; }
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'term-pop-' + idx);
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (openPop && openPop.trigger === btn && openPop.pinned) { closePop(false); return; }
      openTerm(btn, true);
    });
    if (canHover) {
      btn.addEventListener('mouseenter', function () {
        window.clearTimeout(hideTimer);
        if (openPop && openPop.pinned) return;
        window.clearTimeout(showTimer);
        showTimer = window.setTimeout(function () { openTerm(btn, false); }, 200);
      });
      btn.addEventListener('mouseleave', function () {
        window.clearTimeout(showTimer);
        if (openPop && openPop.trigger === btn && !openPop.pinned) hideTimer = window.setTimeout(function () { closePop(false); }, 250);
      });
    }
    btn.addEventListener('focus', function () { if (btn.matches(':focus-visible') && !(openPop && openPop.pinned)) openTerm(btn, false); });
    btn.addEventListener('blur', function () {
      window.setTimeout(function () { if (openPop && openPop.trigger === btn && !openPop.pinned && !openPop.el.contains(document.activeElement)) closePop(false); }, 0);
    });
  });
  document.addEventListener('click', function (ev) {
    if (openPop && !openPop.el.contains(ev.target)) closePop(false);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && openPop) closePop(openPop.pinned);
  });

  /* ---------- glossary page ---------- */
  var glList = document.getElementById('glossary-list');
  if (glList) {
    var keys = Object.keys(GLOSS).sort(function (a, b) { return GLOSS[a].term.localeCompare(GLOSS[b].term); });
    var frag = document.createDocumentFragment();
    keys.forEach(function (k) {
      var dt = document.createElement('dt'); dt.id = k; dt.textContent = GLOSS[k].term;
      var dd = document.createElement('dd');
      dd.appendChild(document.createTextNode(GLOSS[k].def + ' '));
      var wk = document.createElement('span'); wk.className = 'gl-week'; wk.textContent = '(Module ' + GLOSS[k].module + ')';
      dd.appendChild(wk);
      frag.appendChild(dt); frag.appendChild(dd);
    });
    glList.innerHTML = '';
    glList.appendChild(frag);
    var count = document.getElementById('glossary-count');
    var filter = document.getElementById('glossary-filter');
    function applyFilter() {
      var q = (filter.value || '').trim().toLowerCase();
      var shown = 0;
      keys.forEach(function (k) {
        var dt = document.getElementById(k);
        var match = !q || GLOSS[k].term.toLowerCase().indexOf(q) !== -1 || GLOSS[k].def.toLowerCase().indexOf(q) !== -1;
        dt.hidden = !match; dt.nextElementSibling.hidden = !match;
        if (match) shown++;
      });
      if (count) count.textContent = shown + ' of ' + keys.length + ' terms shown';
    }
    if (filter) filter.addEventListener('input', applyFilter);
    applyFilter();
    if (location.hash) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  /* ---------- quiz engine ---------- */

  Array.prototype.slice.call(document.querySelectorAll('.quiz[data-quiz]')).forEach(function (root) {
    var id = root.getAttribute('data-quiz');
    var src = document.getElementById(root.getAttribute('data-source'));
    if (!src) return;
    var bank;
    try { bank = JSON.parse(src.textContent); } catch (e) { root.textContent = 'Quiz data could not be loaded.'; return; }
    var all = load(QUIZ_KEY, {});
    var record = all[id] || { attempts: 0, best: null };
    var order, idx, correct, missed;

    function start() {
      order = shuffle(bank.map(function (q, i) {
        var choices = q.choices.map(function (c, ci) { return { text: c, correct: ci === q.answer }; });
        return { q: q.q, choices: q.fixed ? choices : shuffle(choices), explain: q.explain, n: i };
      }));
      idx = 0; correct = 0; missed = [];
      renderQuestion();
    }

    function bar() {
      var wrap = document.createElement('div');
      wrap.className = 'quiz-bar';
      var lab = document.createElement('span');
      lab.textContent = 'Question ' + (idx + 1) + ' of ' + order.length;
      var p = document.createElement('progress');
      p.max = order.length; p.value = idx;
      p.setAttribute('aria-label', 'Quiz progress');
      var sc = document.createElement('span');
      sc.textContent = correct + ' correct so far';
      wrap.appendChild(lab); wrap.appendChild(p); wrap.appendChild(sc);
      return wrap;
    }

    function renderQuestion() {
      var item = order[idx];
      root.innerHTML = '';
      root.appendChild(bar());
      var card = document.createElement('div');
      card.className = 'q-card';
      var fs = document.createElement('fieldset');
      var lg = document.createElement('legend');
      lg.tabIndex = -1;
      lg.textContent = item.q;
      fs.appendChild(lg);
      var name = id + '-q' + idx;
      item.choices.forEach(function (c, ci) {
        var lab = document.createElement('label');
        lab.className = 'choice';
        var inp = document.createElement('input');
        inp.type = 'radio'; inp.name = name; inp.value = String(ci);
        var span = document.createElement('span'); span.textContent = c.text;
        lab.appendChild(inp); lab.appendChild(span);
        fs.appendChild(lab);
      });
      card.appendChild(fs);
      var fb = document.createElement('div');
      fb.setAttribute('aria-live', 'polite');
      card.appendChild(fb);
      var actions = document.createElement('div');
      actions.className = 'q-actions';
      var check = document.createElement('button');
      check.type = 'button'; check.className = 'btn-primary'; check.textContent = 'Check answer';
      actions.appendChild(check);
      card.appendChild(actions);
      root.appendChild(card);

      check.addEventListener('click', function () {
        var sel = fs.querySelector('input:checked');
        if (!sel) { fb.innerHTML = ''; var m = document.createElement('p'); m.className = 'q-feedback'; m.textContent = 'Choose an answer first.'; fb.appendChild(m); return; }
        var ci = parseInt(sel.value, 10);
        var right = item.choices[ci].correct;
        if (right) correct++; else missed.push(item);
        Array.prototype.slice.call(fs.querySelectorAll('.choice')).forEach(function (lab, li) {
          var inp = lab.querySelector('input');
          inp.disabled = true;
          var flag = document.createElement('span'); flag.className = 'flag';
          if (item.choices[li].correct) { lab.classList.add('correct'); flag.textContent = '✓ Correct answer'; lab.appendChild(flag); }
          else if (li === ci) { lab.classList.add('incorrect'); flag.textContent = '✗ Your answer'; lab.appendChild(flag); }
        });
        fb.innerHTML = '';
        var box = document.createElement('div'); box.className = 'q-feedback';
        var h = document.createElement('strong'); h.textContent = right ? 'Correct.' : 'Not quite.';
        var ex = document.createElement('span'); ex.textContent = item.explain;
        box.appendChild(h); box.appendChild(ex);
        fb.appendChild(box);
        check.remove();
        var next = document.createElement('button');
        next.type = 'button'; next.className = 'btn-primary';
        next.textContent = idx + 1 < order.length ? 'Next question' : 'See results';
        next.addEventListener('click', function () {
          idx++;
          if (idx < order.length) { renderQuestion(); root.querySelector('legend').focus(); }
          else finish();
        });
        actions.appendChild(next);
        next.focus();
      });
    }

    function finish() {
      var pct = Math.round(100 * correct / order.length);
      record.attempts += 1;
      record.last = pct;
      record.best = record.best === null ? pct : Math.max(record.best, pct);
      all = load(QUIZ_KEY, {});
      all[id] = record;
      save(QUIZ_KEY, all);
      root.innerHTML = '';
      var box = document.createElement('div');
      box.className = 'quiz-result';
      box.tabIndex = -1;
      var s = document.createElement('div'); s.className = 'score'; s.textContent = pct + '%';
      var p = document.createElement('p');
      p.textContent = correct + ' of ' + order.length + ' correct. Best score: ' + record.best + '% over ' + record.attempts + (record.attempts === 1 ? ' attempt.' : ' attempts.');
      box.appendChild(s); box.appendChild(p);
      if (missed.length) {
        var h = document.createElement('h3'); h.textContent = 'Review what you missed';
        var ul = document.createElement('ul'); ul.className = 'review-list';
        missed.forEach(function (m) {
          var li = document.createElement('li');
          var q = document.createElement('strong'); q.textContent = m.q + ' ';
          var ans = m.choices.filter(function (c) { return c.correct; })[0];
          var a = document.createElement('span'); a.textContent = 'Answer: ' + ans.text + '. ' + m.explain;
          li.appendChild(q); li.appendChild(a); ul.appendChild(li);
        });
        box.appendChild(h); box.appendChild(ul);
      } else {
        var perfect = document.createElement('p'); perfect.textContent = 'Every question right. You are ready for this module\u2019s homework.';
        box.appendChild(perfect);
      }
      var again = document.createElement('button');
      again.type = 'button'; again.className = 'btn-primary'; again.textContent = 'Retake with new order';
      again.addEventListener('click', function () { start(); root.querySelector('legend').focus(); });
      box.appendChild(again);
      root.appendChild(box);
      box.focus();
      announce('Quiz complete. You scored ' + pct + ' percent.', false);
    }

    var intro = document.createElement('div');
    intro.className = 'quiz-result';
    var ip = document.createElement('p');
    ip.textContent = bank.length + ' questions, shuffled each attempt. Ungraded: use it to check yourself before starting the homework.' +
      (record.best !== null ? ' Your best so far: ' + record.best + '%.' : '');
    var go = document.createElement('button');
    go.type = 'button'; go.className = 'btn-primary'; go.textContent = 'Start self-check';
    go.addEventListener('click', function () { start(); root.querySelector('legend').focus(); });
    intro.appendChild(ip); intro.appendChild(go);
    root.appendChild(intro);
  });

  /* ---------- generic activity: put items in order ---------- */
  var ACT_KEY = 'phys106-activities-v1';
  var acts = load(ACT_KEY, {});
  function markActivity(id, status) {
    acts = load(ACT_KEY, {});
    acts[id] = status;
    save(ACT_KEY, acts);
  }
  window.PHYS106.markActivity = markActivity;

  Array.prototype.slice.call(document.querySelectorAll('.order-activity[data-source]')).forEach(function (root) {
    var src = document.getElementById(root.getAttribute('data-source'));
    if (!src) return;
    var cfg; try { cfg = JSON.parse(src.textContent); } catch (e) { return; }
    var id = root.id || root.getAttribute('data-source');
    var ol = document.createElement('ol');
    ol.className = 'order-list';
    var fb = document.createElement('div');
    fb.className = 'act-feedback';
    fb.setAttribute('aria-live', 'polite');
    var items;
    function build(list) {
      ol.innerHTML = '';
      list.forEach(function (it, i) {
        var li = document.createElement('li');
        li.className = 'order-item';
        li.setAttribute('data-key', String(it.k));
        var txt = document.createElement('span'); txt.className = 'order-text'; txt.textContent = it.text;
        var up = document.createElement('button'); up.type = 'button'; up.textContent = '↑';
        up.setAttribute('aria-label', 'Move "' + it.text + '" up');
        var dn = document.createElement('button'); dn.type = 'button'; dn.textContent = '↓';
        dn.setAttribute('aria-label', 'Move "' + it.text + '" down');
        up.disabled = i === 0; dn.disabled = i === list.length - 1;
        up.addEventListener('click', function () { move(i, -1, 'up'); });
        dn.addEventListener('click', function () { move(i, 1, 'down'); });
        var ctr = document.createElement('span'); ctr.className = 'order-ctrl';
        ctr.appendChild(up); ctr.appendChild(dn);
        li.appendChild(txt); li.appendChild(ctr);
        ol.appendChild(li);
      });
    }
    function move(i, d, dir) {
      var j = i + d;
      if (j < 0 || j >= items.length) return;
      var t = items[i]; items[i] = items[j]; items[j] = t;
      build(items);
      fb.textContent = '';
      var btns = ol.children[j].querySelectorAll('button');
      var target = dir === 'up' ? btns[0] : btns[1];
      if (target.disabled) target = dir === 'up' ? btns[1] : btns[0];
      target.focus();
      announce('"' + items[j].text + '" moved to position ' + (j + 1) + ' of ' + items.length + '.', false);
    }
    function reset() {
      items = cfg.items.map(function (t, k) { return { text: t, k: k }; });
      do { items = shuffle(items); } while (items.every(function (it, i) { return it.k === i; }));
      build(items);
      fb.textContent = '';
    }
    var actions = document.createElement('div'); actions.className = 'act-actions';
    var check = document.createElement('button'); check.type = 'button'; check.className = 'btn-primary'; check.textContent = 'Check my order';
    var show = document.createElement('button'); show.type = 'button'; show.textContent = 'Show the answer';
    var again = document.createElement('button'); again.type = 'button'; again.textContent = 'Shuffle and retry';
    actions.appendChild(check); actions.appendChild(show); actions.appendChild(again);
    check.addEventListener('click', function () {
      var right = 0;
      Array.prototype.slice.call(ol.children).forEach(function (li, i) {
        var ok = items[i].k === i;
        if (ok) right++;
        li.classList.toggle('correct', ok);
        li.classList.toggle('incorrect', !ok);
        var old = li.querySelector('.flag'); if (old) old.remove();
        var f = document.createElement('span'); f.className = 'flag'; f.textContent = ok ? '✓' : '✗';
        f.setAttribute('aria-label', ok ? 'correct position' : 'wrong position');
        li.insertBefore(f, li.firstChild);
      });
      fb.textContent = right === items.length
        ? 'All ' + right + ' in the right order. ' + (cfg.explain || '')
        : right + ' of ' + items.length + ' in the right place. Items marked ✗ need to move; try again.';
      if (right === items.length) markActivity(id, 'done');
    });
    show.addEventListener('click', function () {
      items = cfg.items.map(function (t, k) { return { text: t, k: k }; });
      build(items);
      fb.textContent = 'Correct order shown. ' + (cfg.explain || '');
    });
    again.addEventListener('click', reset);
    root.appendChild(ol); root.appendChild(actions); root.appendChild(fb);
    reset();
  });

  /* ---------- generic activity: persisted checklists ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.checklist[data-checklist]')).forEach(function (list) {
    var id = list.getAttribute('data-checklist');
    var boxes = Array.prototype.slice.call(list.querySelectorAll('input[type="checkbox"]'));
    var state = (load(ACT_KEY, {})[id]) || [];
    var status = list.parentElement.querySelector('.checklist-status');
    function update() {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      if (status) status.textContent = n + ' of ' + boxes.length + ' steps done';
    }
    boxes.forEach(function (b, i) {
      b.checked = state.indexOf(i) !== -1;
      b.addEventListener('change', function () {
        var on = boxes.map(function (x, k) { return x.checked ? k : -1; }).filter(function (k) { return k >= 0; });
        markActivity(id, on);
        update();
      });
    });
    update();
  });

  /* ---------- generic activity: fact or myth ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.tf-activity[data-source]')).forEach(function (root) {
    var src = document.getElementById(root.getAttribute('data-source'));
    if (!src) return;
    var cfg; try { cfg = JSON.parse(src.textContent); } catch (e) { return; }
    var labels = ['Fact', 'Myth'];
    if (!Array.isArray(cfg)) { labels = cfg.labels || labels; cfg = cfg.items; }
    var id = root.id;
    var score = document.createElement('p'); score.className = 'act-feedback'; score.setAttribute('aria-live', 'polite');
    var answered = 0, right = 0;
    var ul = document.createElement('ul'); ul.className = 'tf-list';
    shuffle(cfg).forEach(function (it) {
      var li = document.createElement('li'); li.className = 'tf-item';
      var p = document.createElement('p'); p.className = 'tf-statement'; p.textContent = it.s;
      var row = document.createElement('div'); row.className = 'act-actions';
      var out = document.createElement('p'); out.className = 'tf-out';
      labels.forEach(function (label, li2) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
        b.addEventListener('click', function () {
          var ok = (li2 === 0) === it.truth;
          answered++; if (ok) right++;
          Array.prototype.slice.call(row.querySelectorAll('button')).forEach(function (x) { x.disabled = true; });
          li.classList.add(ok ? 'correct' : 'incorrect');
          out.textContent = (ok ? '✓ Right: ' : '✗ Not quite: ') + (labels[0] === 'Fact' ? 'this is a ' + (it.truth ? 'fact' : 'myth') + '. ' : (it.truth ? labels[0] : labels[1]) + '. ') + it.explain;
          score.textContent = right + ' of ' + answered + ' correct so far (' + cfg.length + ' statements).';
          if (answered === cfg.length) markActivity(id, right + '/' + cfg.length);
        });
        row.appendChild(b);
      });
      li.appendChild(p); li.appendChild(row); li.appendChild(out);
      ul.appendChild(li);
    });
    root.appendChild(ul); root.appendChild(score);
  });

  /* ---------- shared helpers for student work ---------- */
  var WORK_KEY = 'phys106-work-v1';
  var pageId = document.body.getAttribute('data-week') || 'page';
  function getWork(id) { var w = load(WORK_KEY, {}); return (w[pageId] && w[pageId][id]) || {}; }
  function setWork(id, obj) { var w = load(WORK_KEY, {}); w[pageId] = w[pageId] || {}; w[pageId][id] = obj; save(WORK_KEY, w); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function paras(t) { return String(t || '').split(/\n{2,}|\r\n\r\n/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join(''); }
  function sectionLabel(node) {
    var sec = node.closest('.reading-section') || node.closest('section[id]');
    var h = sec && sec.querySelector('h2');
    var num = sec && sec.querySelector('.section-num');
    return (num ? num.textContent.trim() + ' ' : '') + (h ? h.textContent.trim() : document.title);
  }
  function toNotes(html, label) {
    if (window.PHYS106Notes) window.PHYS106Notes.add(html, label);
    else announce('Notes are not available on this page.', true);
  }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, primary) { var b = mk('button', primary ? 'btn-primary' : '', text); b.type = 'button'; return b; }
  function readCfg(root) {
    var src = document.getElementById(root.getAttribute('data-source'));
    if (!src) return null;
    try { return JSON.parse(src.textContent); } catch (e) { return null; }
  }
  function textArea(id, label, rows, value) {
    var wrap = mk('div', 'field');
    var l = mk('label', null, label); l.setAttribute('for', id);
    var ta = mk('textarea'); ta.id = id; ta.rows = rows || 4; ta.value = value || '';
    wrap.appendChild(l); wrap.appendChild(ta);
    return { wrap: wrap, ta: ta };
  }
  window.PHYS106.toNotes = toNotes;
  window.PHYS106.sectionLabel = sectionLabel;
  window.PHYS106.esc = esc;

  /* ---------- guided problems: step-by-step reveal of a worked solution ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.guided[data-source]')).forEach(function (root) {
    var cfg = readCfg(root); if (!cfg) return;
    var id = root.id, st = getWork(id);
    var prompt = mk('div', 'guided-prompt'); prompt.innerHTML = cfg.prompt;
    root.appendChild(prompt);
    var work = textArea(id + '-work', 'Your work (saved on this device)', 4, st.work);
    root.appendChild(work.wrap);
    var chk = null, chkIn = null, chkOut = null;
    if (cfg.check) {
      chk = mk('div', 'guided-check');
      var lab = mk('label', null, cfg.check.label || 'Your answer'); lab.setAttribute('for', id + '-ans');
      chkIn = mk('input'); chkIn.type = 'number'; chkIn.step = 'any'; chkIn.id = id + '-ans'; chkIn.setAttribute('inputmode', 'decimal'); chkIn.value = st.ans || '';
      var unit = mk('span', 'guided-unit', cfg.check.unit || '');
      var cb = btn('Check');
      chkOut = mk('p', 'act-feedback'); chkOut.setAttribute('aria-live', 'polite');
      var row = mk('div', 'guided-row'); row.appendChild(chkIn); row.appendChild(unit); row.appendChild(cb);
      chk.appendChild(lab); chk.appendChild(row); chk.appendChild(chkOut);
      root.appendChild(chk);
      cb.addEventListener('click', function () {
        var v = parseFloat(chkIn.value);
        if (isNaN(v)) { chkOut.textContent = 'Enter a number first.'; return; }
        var target = cfg.check.answer, tol = cfg.check.tol || 0.05;
        var ok = Math.abs(v - target) <= Math.abs(target) * tol;
        chkOut.textContent = ok ? '✓ That is within ' + Math.round(tol * 100) + '% of the expected answer. Reveal the steps to compare your method.' : '✗ Not quite. Use the steps below one at a time until you find where your work went differently.';
        chkOut.className = 'act-feedback ' + (ok ? 'good' : 'bad');
        st.ans = chkIn.value; setWork(id, st);
      });
    }
    var ol = mk('ol', 'guided-steps');
    root.appendChild(ol);
    var controls = mk('div', 'act-actions');
    var next = btn('', true), all = btn('Show the full solution'), reset = btn('Start over'), note = btn('Add my work to notes');
    controls.appendChild(next); controls.appendChild(all); controls.appendChild(reset); controls.appendChild(note);
    root.appendChild(controls);
    var shown = st.shown || 0;
    function render(focusNew) {
      ol.innerHTML = '';
      cfg.steps.forEach(function (s, i) {
        if (i >= shown) return;
        var li = mk('li', 'guided-step');
        var h = mk('strong', null, 'Step ' + (i + 1) + ': ' + s.title);
        var body = mk('div'); body.innerHTML = s.body;
        li.appendChild(h); li.appendChild(body);
        if (i === shown - 1) li.tabIndex = -1;
        ol.appendChild(li);
      });
      if (shown >= cfg.steps.length && cfg.final) {
        var fin = mk('li', 'guided-step guided-final'); fin.innerHTML = '<strong>Answer</strong><div>' + cfg.final + '</div>';
        ol.appendChild(fin);
      }
      var done = shown >= cfg.steps.length;
      next.hidden = done; all.hidden = done; reset.hidden = shown === 0;
      if (!done) next.textContent = 'Reveal step ' + (shown + 1) + ' of ' + cfg.steps.length + ': ' + cfg.steps[shown].title;
      if (focusNew) { var last = ol.querySelector('[tabindex="-1"]') || ol.lastElementChild; if (last) { last.tabIndex = -1; last.focus(); } }
    }
    next.addEventListener('click', function () { shown = Math.min(cfg.steps.length, shown + 1); st.shown = shown; setWork(id, st); render(true); });
    all.addEventListener('click', function () { shown = cfg.steps.length; st.shown = shown; setWork(id, st); render(true); });
    reset.addEventListener('click', function () { shown = 0; st.shown = 0; setWork(id, st); render(false); next.focus(); });
    work.ta.addEventListener('input', function () { st.work = work.ta.value; setWork(id, st); });
    note.addEventListener('click', function () {
      var h = '<h3>' + esc(cfg.title || 'Guided problem') + '</h3><div>' + cfg.prompt + '</div>';
      if (work.ta.value.trim()) h += '<p><strong>My work:</strong></p>' + paras(work.ta.value);
      if (chkIn && chkIn.value) h += '<p><strong>My answer:</strong> ' + esc(chkIn.value) + ' ' + esc(cfg.check.unit || '') + '</p>';
      if (shown) {
        h += '<p><strong>Solution steps:</strong></p><ol>' + cfg.steps.slice(0, shown).map(function (s) { return '<li><strong>' + esc(s.title) + ':</strong> ' + s.body.replace(/<\/?(div|p)[^>]*>/g, ' ') + '</li>'; }).join('') + '</ol>';
        if (shown >= cfg.steps.length && cfg.final) h += '<p><strong>Answer:</strong> ' + cfg.final.replace(/<\/?(div|p)[^>]*>/g, ' ') + '</p>';
      }
      toNotes(h, sectionLabel(root));
    });
    render(false);
  });

  /* ---------- label the diagram ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.label-activity[data-source]')).forEach(function (root) {
    var cfg = readCfg(root); if (!cfg) return;
    var id = root.id, st = getWork(id);
    var grid = mk('div', 'label-grid');
    var sels = cfg.targets.map(function (ans, i) {
      var w = mk('div', 'label-item');
      var l = mk('label', null, 'Label ' + (i + 1)); l.setAttribute('for', id + '-s' + i);
      var s = mk('select'); s.id = id + '-s' + i;
      var o0 = mk('option', null, 'Choose…'); o0.value = ''; s.appendChild(o0);
      cfg.options.forEach(function (o) { var op = mk('option', null, o); op.value = o; s.appendChild(op); });
      if (st.sel && st.sel[i]) s.value = st.sel[i];
      var mark = mk('span', 'label-mark'); mark.setAttribute('aria-live', 'polite');
      s.addEventListener('change', function () { st.sel = sels.map(function (x) { return x.s.value; }); setWork(id, st); mark.textContent = ''; w.classList.remove('correct', 'incorrect'); });
      w.appendChild(l); w.appendChild(s); w.appendChild(mark); grid.appendChild(w);
      return { s: s, mark: mark, w: w, ans: ans };
    });
    root.appendChild(grid);
    var fb = mk('p', 'act-feedback'); fb.setAttribute('aria-live', 'polite');
    var actions = mk('div', 'act-actions');
    var check = btn('Check my labels', true), show = btn('Show the answers');
    actions.appendChild(check); actions.appendChild(show);
    root.appendChild(actions); root.appendChild(fb);
    check.addEventListener('click', function () {
      var right = 0;
      sels.forEach(function (x) {
        var ok = x.s.value === x.ans; if (ok) right++;
        x.w.classList.toggle('correct', ok); x.w.classList.toggle('incorrect', !ok);
        x.mark.textContent = ok ? '✓' : (x.s.value ? '✗' : '✗ choose one');
      });
      fb.textContent = right + ' of ' + sels.length + ' correct.' + (right === sels.length ? ' ' + (cfg.explain || '') : '');
      if (right === sels.length) markActivity(id, 'done');
    });
    show.addEventListener('click', function () {
      sels.forEach(function (x) { x.s.value = x.ans; x.w.classList.add('correct'); x.w.classList.remove('incorrect'); x.mark.textContent = '✓'; });
      fb.textContent = 'Answers shown. ' + (cfg.explain || '');
    });
  });

  /* ---------- estimation (Fermi) problems ---------- */
  function niceNum(v) {
    if (!isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a !== 0 && (a >= 1e6 || a < 0.01)) {
      var e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e);
      var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
      return m.toFixed(1) + ' × 10' + String(e).split('').map(function (c) { return SUP[c]; }).join('');
    }
    return Number(v.toPrecision(3)).toLocaleString('en-US');
  }
  Array.prototype.slice.call(document.querySelectorAll('.estimate-activity[data-source]')).forEach(function (root) {
    var cfg = readCfg(root); if (!cfg) return;
    var id = root.id, st = getWork(id);
    var q = mk('p', 'estimate-q'); q.innerHTML = cfg.q; root.appendChild(q);
    var gw = mk('div', 'act-grid');
    var gd = mk('div'); var gl = mk('label', null, 'Your gut guess first (' + cfg.unit + ')'); gl.setAttribute('for', id + '-guess');
    var gi = mk('input'); gi.type = 'number'; gi.step = 'any'; gi.id = id + '-guess'; gi.value = st.guess || ''; gi.setAttribute('inputmode', 'decimal');
    gd.appendChild(gl); gd.appendChild(gi); gw.appendChild(gd); root.appendChild(gw);
    var h = mk('h4', null, 'Now build an estimate step by step'); root.appendChild(h);
    var sg = mk('div', 'act-grid');
    var ins = cfg.steps.map(function (s, i) {
      var d = mk('div');
      var l = mk('label', null, (i === 0 ? '' : (s.op === '/' ? '÷ ' : '× ')) + s.label + (s.unit ? ' (' + s.unit + ')' : '')); l.setAttribute('for', id + '-st' + i);
      var inp = mk('input'); inp.type = 'number'; inp.step = 'any'; inp.id = id + '-st' + i; inp.setAttribute('inputmode', 'decimal');
      inp.value = st.steps && st.steps[i] != null ? st.steps[i] : (s.value != null ? s.value : '');
      if (s.hint) { var hn = mk('span', 'est-hint', s.hint); d.appendChild(l); d.appendChild(inp); d.appendChild(hn); } else { d.appendChild(l); d.appendChild(inp); }
      sg.appendChild(d); return inp;
    });
    root.appendChild(sg);
    var out = mk('div', 'act-result'); out.setAttribute('aria-live', 'polite'); root.appendChild(out);
    var actions = mk('div', 'act-actions'); var cmp = btn('Compare with an astronomer\u2019s estimate', true); var nb = btn('Add to notes');
    actions.appendChild(cmp); actions.appendChild(nb); root.appendChild(actions);
    var ref = mk('div', 'act-result'); ref.hidden = !st.revealed; root.appendChild(ref);
    function calc() {
      var v = null;
      ins.forEach(function (inp, i) {
        var x = parseFloat(inp.value);
        if (isNaN(x)) { v = NaN; return; }
        if (i === 0) v = x; else v = cfg.steps[i].op === '/' ? v / x : v * x;
      });
      return v;
    }
    function render() {
      var v = calc();
      out.innerHTML = '<p><strong>Your step-by-step estimate:</strong> ' + (isNaN(v) || v === null ? 'fill in every step' : niceNum(v) + ' ' + esc(cfg.unit)) +
        (gi.value && !isNaN(v) ? '. Your gut guess was ' + niceNum(parseFloat(gi.value)) + '.' : '') + '</p>';
      st.guess = gi.value; st.steps = ins.map(function (x) { return x.value; }); setWork(id, st);
      if (!ref.hidden) showRef();
    }
    function showRef() {
      var v = calc(), f = (!isNaN(v) && v) ? Math.max(v / cfg.reference, cfg.reference / v) : null;
      ref.innerHTML = '<p><strong>Astronomer\u2019s estimate:</strong> about ' + niceNum(cfg.reference) + ' ' + esc(cfg.unit) + '.' +
        (f ? ' Yours is within a factor of ' + (f < 1.05 ? '1 (a near match!)' : niceNum(f)) + '.' + (f <= 3 ? ' That is a good estimate.' : f <= 10 ? ' Same order of magnitude or close to it.' : ' Check which step is furthest off.') : '') + '</p>' + cfg.explain;
    }
    ins.concat([gi]).forEach(function (x) { x.addEventListener('input', render); });
    cmp.addEventListener('click', function () { ref.hidden = false; st.revealed = true; setWork(id, st); showRef(); markActivity(id, 'done'); });
    nb.addEventListener('click', function () {
      var v = calc();
      var hh = '<h3>Estimate: ' + esc(cfg.title || '') + '</h3><p>' + cfg.q + '</p><ul>' + cfg.steps.map(function (s, i) { return '<li>' + esc(s.label) + ': ' + esc(ins[i].value || '?') + ' ' + esc(s.unit || '') + '</li>'; }).join('') + '</ul><p><strong>My estimate:</strong> ' + niceNum(v) + ' ' + esc(cfg.unit) + '</p>';
      if (!ref.hidden) hh += '<p><strong>Reference:</strong> about ' + niceNum(cfg.reference) + ' ' + esc(cfg.unit) + '</p>';
      toNotes(hh, sectionLabel(root));
    });
    render();
  });

  /* ---------- predict, observe, explain ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.poe[data-source]')).forEach(function (root) {
    var cfg = readCfg(root); if (!cfg) return;
    var id = root.id, st = getWork(id);
    var s1 = mk('div', 'poe-step'), s2 = mk('div', 'poe-step'), s3 = mk('div', 'poe-step');
    s1.appendChild(mk('h4', null, '1. Predict'));
    var q = mk('p'); q.innerHTML = cfg.question; s1.appendChild(q);
    var fs = mk('fieldset', 'poe-options'); var lg = mk('legend', 'visually-hidden', 'Your prediction'); fs.appendChild(lg);
    var radios = cfg.options.map(function (o, i) {
      var l = mk('label', 'choice'); var r = mk('input'); r.type = 'radio'; r.name = id + '-p'; r.value = String(i);
      if (st.pick === i) r.checked = true;
      l.appendChild(r); l.appendChild(mk('span', null, o)); fs.appendChild(l); return r;
    });
    s1.appendChild(fs);
    var why = textArea(id + '-why', 'Why do you think so?', 3, st.why); s1.appendChild(why.wrap);
    var lock = btn('Lock in my prediction', true); var s1a = mk('div', 'act-actions'); s1a.appendChild(lock); s1.appendChild(s1a);
    var s1fb = mk('p', 'act-feedback'); s1fb.setAttribute('aria-live', 'polite'); s1.appendChild(s1fb);
    s2.appendChild(mk('h4', null, '2. Observe')); var obs = mk('div'); obs.innerHTML = cfg.observe; s2.appendChild(obs);
    var seen = textArea(id + '-seen', 'What did you observe?', 3, st.seen); s2.appendChild(seen.wrap);
    var s2b = btn('I have made my observation', true); var s2a = mk('div', 'act-actions'); s2a.appendChild(s2b); s2.appendChild(s2a);
    s3.appendChild(mk('h4', null, '3. Explain'));
    var res = mk('p', 'act-feedback'); s3.appendChild(res);
    var ex = mk('div'); ex.innerHTML = cfg.explain; s3.appendChild(ex);
    var nb = btn('Add to notes'); var s3a = mk('div', 'act-actions'); s3a.appendChild(nb); s3.appendChild(s3a);
    root.appendChild(s1); root.appendChild(s2); root.appendChild(s3);
    function stage(n, focus) {
      st.stage = n; setWork(id, st);
      s2.hidden = n < 2; s3.hidden = n < 3;
      radios.forEach(function (r) { r.disabled = n >= 2; }); why.ta.readOnly = n >= 2; lock.hidden = n >= 2;
      s2b.hidden = n >= 3;
      if (n >= 3) {
        var ok = st.pick === cfg.correct;
        res.textContent = (ok ? '✓ Your prediction matched: ' : '✗ Your prediction was “' + cfg.options[st.pick] + '.” What actually happens: ') + cfg.options[cfg.correct] + '.';
        res.className = 'act-feedback ' + (ok ? 'good' : 'bad');
      }
      if (focus) { var h4 = (n === 2 ? s2 : s3).querySelector('h4'); h4.tabIndex = -1; h4.focus(); }
    }
    lock.addEventListener('click', function () {
      var pick = radios.findIndex(function (r) { return r.checked; });
      if (pick < 0) { s1fb.textContent = 'Choose a prediction first.'; return; }
      st.pick = pick; stage(2, true);
    });
    s2b.addEventListener('click', function () { stage(3, true); markActivity(id, 'done'); });
    why.ta.addEventListener('input', function () { st.why = why.ta.value; setWork(id, st); });
    seen.ta.addEventListener('input', function () { st.seen = seen.ta.value; setWork(id, st); });
    nb.addEventListener('click', function () {
      var hh = '<h3>Predict, observe, explain</h3><p>' + cfg.question + '</p><p><strong>My prediction:</strong> ' + esc(cfg.options[st.pick]) + '</p>' +
        (why.ta.value ? '<p><strong>My reasoning:</strong> ' + esc(why.ta.value) + '</p>' : '') + (seen.ta.value ? '<p><strong>What I observed:</strong> ' + esc(seen.ta.value) + '</p>' : '') +
        '<p><strong>What actually happens:</strong> ' + esc(cfg.options[cfg.correct]) + '</p>' + cfg.explain;
      toNotes(hh, sectionLabel(root));
    });
    stage(st.stage || 1, false);
  });

  /* ---------- explain it to a friend ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.explain-it[data-source]')).forEach(function (root) {
    var cfg = readCfg(root); if (!cfg) return;
    var id = root.id, st = getWork(id);
    var p = mk('p'); p.innerHTML = cfg.prompt; root.appendChild(p);
    var t = textArea(id + '-txt', 'Your explanation', 6, st.text); root.appendChild(t.wrap);
    var wc = mk('p', 'word-count'); wc.setAttribute('aria-live', 'polite'); root.appendChild(wc);
    root.appendChild(mk('h4', null, 'Check your own explanation. Did you…'));
    var ul = mk('ul', 'checklist');
    var boxes = cfg.checklist.map(function (c, i) {
      var li = mk('li'); var l = mk('label'); var cb = mk('input'); cb.type = 'checkbox'; cb.checked = !!(st.checks && st.checks[i]);
      l.appendChild(cb); l.appendChild(mk('span', null, c)); li.appendChild(l); ul.appendChild(li);
      cb.addEventListener('change', function () { st.checks = boxes.map(function (b) { return b.checked; }); setWork(id, st); });
      return cb;
    });
    root.appendChild(ul);
    var actions = mk('div', 'act-actions'); var show = btn('Compare with a model answer', true); var nb = btn('Add to notes');
    actions.appendChild(show); actions.appendChild(nb); root.appendChild(actions);
    var model = mk('div', 'act-result'); model.hidden = true; model.innerHTML = '<p><strong>One strong answer:</strong></p>' + cfg.model; root.appendChild(model);
    var min = cfg.minWords || 60;
    function count() {
      var n = (t.ta.value.trim().match(/\S+/g) || []).length;
      wc.textContent = n + ' words' + (n < min ? ' (write at least ' + min + ' before comparing)' : '');
      show.disabled = n < min && !st.shown;
      st.text = t.ta.value; setWork(id, st);
    }
    t.ta.addEventListener('input', count);
    show.addEventListener('click', function () { model.hidden = false; st.shown = true; setWork(id, st); markActivity(id, 'done'); model.tabIndex = -1; model.focus(); });
    nb.addEventListener('click', function () {
      toNotes('<h3>Explain it: ' + esc(cfg.title || '') + '</h3><p>' + cfg.prompt + '</p>' + paras(t.ta.value), sectionLabel(root));
    });
    if (st.shown) model.hidden = false;
    count();
  });

})();
