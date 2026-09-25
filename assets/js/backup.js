/* PHYS 106 backup & restore.
   Collects every phys106-* localStorage key and every module notebook in IndexedDB into one JSON file,
   and restores from that file. Used by my-work.html. */
(function () {
  'use strict';
  var P = window.PHYS106 || {};
  function $(id) { return document.getElementById(id); }
  function announce(m) { if (P.announce) P.announce(m, true); }
  var PREFIX = 'phys106-', META = 'phys106-backup-meta';
  // Update this list as modules are published: [id, title, number of reading sections]
  var MODULES = [
    ['module-01', 'Our Place in the Universe', 15],
    ['module-02', 'The Science of Astronomy', 13],
    ['module-03', "Motion, Gravity, Light, and Telescopes", 13],
    ['module-04', "The Solar System and Its Origin", 13],
    ['module-05', "Worlds Up Close", 13],
    ['module-06', "Small Bodies and Other Planetary Systems", 13],
    ['module-07', "Relativity: Space, Time, and Gravity", 13],
    ['module-08', "The Building Blocks of the Universe", 13],
    ['module-09', "The Sun and Measuring Stars", 13],
    ['module-10', "Star Birth and Stellar Lives", 13],
    ['module-11', "Stellar Remnants and the Milky Way", 12],
    ['module-12', "Galaxies and Their Evolution", 12],
    ['module-13', "The Big Bang and the Fate of the Universe", 13]
  ];

  function openDB() {
    return new Promise(function (res) {
      try {
        var r = indexedDB.open('phys106-notes', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('notebooks'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function allNotebooks() {
    return openDB().then(function (db) {
      var out = {};
      if (!db) {
        try {
          for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf('phys106-notes-') === 0) { try { out[k.slice(14)] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* skip */ } } }
        } catch (e) { /* storage unavailable */ }
        return out;
      }
      return new Promise(function (res) {
        var st = db.transaction('notebooks').objectStore('notebooks'), keys = st.getAllKeys(), vals = st.getAll();
        vals.onsuccess = function () { keys.result.forEach(function (k, i) { out[k] = vals.result[i]; }); res(out); };
        vals.onerror = function () { res(out); };
      });
    });
  }
  function putNotebooks(books, clearFirst) {
    return openDB().then(function (db) {
      if (!db) { Object.keys(books).forEach(function (k) { localStorage.setItem('phys106-notes-' + k, JSON.stringify(books[k])); }); return; }
      return new Promise(function (res, rej) {
        var tx = db.transaction('notebooks', 'readwrite'), st = tx.objectStore('notebooks');
        if (clearFirst) st.clear();
        Object.keys(books).forEach(function (k) {
          var b = books[k];
          if (b && typeof b.html === 'string') st.put({ html: b.html, updated: +b.updated || Date.now() }, k);
        });
        tx.oncomplete = res; tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function localData() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf(PREFIX) === 0 && k !== META) out[k] = localStorage.getItem(k);
      }
    } catch (e) { /* storage unavailable */ }
    return out;
  }
  function getJSON(k, fb) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
  function stripHtml(h) { var d = document.createElement('div'); d.innerHTML = h || ''; return { text: (d.textContent || '').trim(), imgs: d.querySelectorAll('img').length }; }
  function kb(n) { return n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }

  /* ---------- summary table ---------- */
  function renderSummary() {
    var body = $('mw-body'); if (!body) return Promise.resolve();
    var prog = getJSON('phys106-progress-v1', {}), quiz = getJSON('phys106-quiz-v1', {}), acts = getJSON('phys106-activities-v1', {}), work = getJSON('phys106-work-v1', {});
    return allNotebooks().then(function (books) {
      body.innerHTML = '';
      var any = false;
      MODULES.forEach(function (m, i) {
        var id = m[0], tr = document.createElement('tr');
        var read = (prog[id] || []).length, q = quiz[id], nb = books[id], nbInfo = nb ? stripHtml(nb.html) : null;
        var workCount = work[id] ? Object.keys(work[id]).filter(function (k) {
          var w = work[id][k] || {};
          return ['work', 'text', 'why', 'seen', 'ans', 'guess'].some(function (f) { return w[f] && String(w[f]).trim(); }) || w.shown > 0 || w.stage > 1 || w.revealed || (w.sel && w.sel.some(Boolean));
        }).length : 0;
        if (read || q || nb || workCount) any = true;
        var cells = [
          'Module ' + (i + 1) + ': ' + m[1],
          read + ' of ' + m[2],
          q && q.best != null ? q.best + '% (' + q.attempts + (q.attempts === 1 ? ' try)' : ' tries)') : '—',
          workCount ? workCount + ' saved' : '—',
          nbInfo && (nbInfo.text || nbInfo.imgs) ? (nbInfo.text.split(/\s+/).filter(Boolean).length + ' words' + (nbInfo.imgs ? ', ' + nbInfo.imgs + (nbInfo.imgs === 1 ? ' image' : ' images') : '')) : '—'
        ];
        cells.forEach(function (c, j) { var td = document.createElement(j ? 'td' : 'th'); if (!j) td.setAttribute('scope', 'row'); else td.className = 'num'; td.textContent = c; tr.appendChild(td); });
        body.appendChild(tr);
      });
      var meta = getJSON(META, {});
      var last = meta.last ? new Date(meta.last) : null;
      var days = last ? Math.floor((Date.now() - last) / 86400000) : null;
      var st = $('mw-last');
      st.textContent = last ? 'Last backup downloaded ' + last.toLocaleString() + (days >= 7 ? ' (' + days + ' days ago; time for a new one).' : '.') : (any ? 'You have not downloaded a backup yet.' : 'Nothing saved yet on this device.');
      st.className = 'mw-last' + ((any && (!last || days >= 7)) ? ' warn' : '');
      var size = JSON.stringify(localData()).length + JSON.stringify(books).length;
      $('mw-size').textContent = 'About ' + kb(size) + ' of course data stored in this browser.';
    }).catch(function () {
      var st = $('mw-last'); if (st) st.textContent = 'This browser is blocking storage, so nothing can be saved or backed up here. Try opening the course in a regular (not private) window.';
    });
  }

  /* ---------- backup ---------- */
  function backup() {
    allNotebooks().then(function (books) {
      var data = { app: 'phys106-astronomy', version: 1, exported: new Date().toISOString(), localStorage: localData(), notebooks: books };
      var d = new Date(), stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
      a.download = 'PHYS106-my-work-backup-' + stamp + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      try { localStorage.setItem(META, JSON.stringify({ last: Date.now() })); } catch (e) { /* ignore */ }
      announce('Backup downloaded. Keep the file somewhere safe, such as OneDrive.');
      renderSummary();
    });
  }

  /* ---------- restore ---------- */
  function readFile(file) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsText(file); });
  }
  function restore(file, mode) {
    var out = $('mw-restore-msg');
    readFile(file).then(function (txt) {
      var data;
      try { data = JSON.parse(txt); } catch (e) { throw new Error('That file is not a PHYS 106 backup (it could not be read as JSON).'); }
      if (!data || data.app !== 'phys106-astronomy' || typeof data.localStorage !== 'object') throw new Error('That file is not a PHYS 106 backup.');
      var keys = Object.keys(data.localStorage).filter(function (k) { return k.indexOf(PREFIX) === 0 && typeof data.localStorage[k] === 'string'; });
      var books = data.notebooks && typeof data.notebooks === 'object' ? data.notebooks : {};
      var when = data.exported ? new Date(data.exported).toLocaleString() : 'an unknown date';
      var msg = mode === 'replace'
        ? 'Replace ALL of your course data in this browser with the backup from ' + when + '? Anything you have not backed up will be lost.'
        : 'Merge the backup from ' + when + ' into this browser? Items in the backup will overwrite matching items here; everything else is kept.';
      if (!window.confirm(msg)) { out.textContent = 'Restore canceled.'; return; }
      if (mode === 'replace') Object.keys(localData()).forEach(function (k) { localStorage.removeItem(k); });
      keys.forEach(function (k) {
        if (mode === 'merge' && /-(v1)$/.test(k) && k !== 'phys106-prefs-v1') {
          // merge object-shaped stores key by key instead of clobbering them
          try {
            var cur = JSON.parse(localStorage.getItem(k)), inc = JSON.parse(data.localStorage[k]);
            if (cur && inc && typeof cur === 'object' && typeof inc === 'object' && !Array.isArray(cur) && !Array.isArray(inc)) {
              localStorage.setItem(k, JSON.stringify(Object.assign(cur, inc))); return;
            }
            if (Array.isArray(cur) && Array.isArray(inc)) { // e.g. Moon journal entries: union by id
              var seen = {}; cur.concat(inc).forEach(function (x) { if (x && x.id != null) seen[x.id] = x; });
              var merged = Object.keys(seen).map(function (id) { return seen[id]; });
              if (merged.length) { localStorage.setItem(k, JSON.stringify(merged)); return; }
            }
          } catch (e) { /* fall through to overwrite */ }
        }
        localStorage.setItem(k, data.localStorage[k]);
      });
      return putNotebooks(books, mode === 'replace').then(function () {
        out.textContent = '✓ Restored ' + keys.length + ' saved items and ' + Object.keys(books).length + ' notebook' + (Object.keys(books).length === 1 ? '' : 's') + ' from the backup made ' + when + '.';
        out.className = 'act-feedback good';
        announce('Backup restored.');
        renderSummary();
      });
    }).catch(function (e) {
      out.textContent = e.message || 'The backup could not be restored.';
      out.className = 'act-feedback bad';
    });
  }

  /* ---------- delete ---------- */
  function wipe() {
    if (!window.confirm('Delete ALL of your PHYS 106 progress, activity answers, quiz scores, journal, and notes from this browser? Download a backup first if you want to keep them. This cannot be undone.')) return;
    Object.keys(localData()).forEach(function (k) { localStorage.removeItem(k); });
    localStorage.removeItem(META);
    putNotebooks({}, true).then(function () { announce('All course data deleted from this browser.'); renderSummary(); });
  }

  var bBtn = $('mw-backup');
  if (bBtn) {
    bBtn.addEventListener('click', backup);
    var file = $('mw-file');
    $('mw-restore').addEventListener('click', function () {
      if (!file.files.length) { $('mw-restore-msg').textContent = 'Choose a backup file first.'; $('mw-restore-msg').className = 'act-feedback bad'; return; }
      var mode = document.querySelector('input[name="mw-mode"]:checked').value;
      restore(file.files[0], mode);
    });
    $('mw-wipe').addEventListener('click', wipe);
    renderSummary();
  }
  window.PHYS106Backup = { backup: backup, summary: renderSummary };
})();
