/* PHYS 106 notes tool.
   One notebook per module, stored in IndexedDB (falls back to localStorage).
   Rich-text editing with paste/drag/upload of images, "Add to notes" buttons across the page,
   and export to Word (.docx), PDF (print), Markdown, and HTML. No external libraries. */
(function () {
  'use strict';
  var P = window.PHYS106 || {};
  var MOD = document.body.getAttribute('data-week');
  if (!MOD) return;
  var kicker = document.querySelector('.week-kicker');
  var MOD_LABEL = kicker ? kicker.textContent.replace(/ of \d+$/, '').trim() : MOD;
  var MOD_TITLE = (document.querySelector('h1') || {}).textContent || '';
  var FILE_BASE = 'PHYS106-' + MOD_LABEL.replace(/\s+/g, '-') + '-notes';
  function announce(m) { if (P.announce) P.announce(m, true); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ================= storage ================= */
  var DB = null, dbReady;
  dbReady = new Promise(function (resolve) {
    try {
      var req = indexedDB.open('phys106-notes', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('notebooks'); };
      req.onsuccess = function () { DB = req.result; resolve(); };
      req.onerror = function () { resolve(); };
    } catch (e) { resolve(); }
  });
  function getBook() {
    return dbReady.then(function () {
      if (!DB) { try { return JSON.parse(localStorage.getItem('phys106-notes-' + MOD)); } catch (e) { return null; } }
      return new Promise(function (res) {
        var r = DB.transaction('notebooks').objectStore('notebooks').get(MOD);
        r.onsuccess = function () { res(r.result || null); }; r.onerror = function () { res(null); };
      });
    });
  }
  function putBook(obj) {
    return dbReady.then(function () {
      if (!DB) { try { localStorage.setItem('phys106-notes-' + MOD, JSON.stringify(obj)); return true; } catch (e) { return false; } }
      return new Promise(function (res) {
        var tx = DB.transaction('notebooks', 'readwrite'); tx.objectStore('notebooks').put(obj, MOD);
        tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); };
      });
    });
  }

  /* ================= sanitizer ================= */
  var MAP = { P: 'p', DIV: 'p', SECTION: 'p', ARTICLE: 'p', H1: 'h2', H2: 'h2', H3: 'h3', H4: 'h3', H5: 'h3', H6: 'h3', STRONG: 'strong', B: 'strong', EM: 'em', I: 'em', U: 'u',
    BR: 'br', UL: 'ul', OL: 'ol', LI: 'li', BLOCKQUOTE: 'blockquote', CODE: 'code', PRE: 'pre', SUB: 'sub', SUP: 'sup', IMG: 'img', A: 'a',
    TABLE: 'table', THEAD: 'thead', TBODY: 'tbody', TR: 'tr', TD: 'td', TH: 'th', DT: 'strong', DD: 'p', CAPTION: 'p', FIGCAPTION: 'p' };
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, NOSCRIPT: 1, TEMPLATE: 1, BUTTON: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, SVG: 1, CANVAS: 1, VIDEO: 1, AUDIO: 1, META: 1, LINK: 1, TITLE: 1, HEAD: 1 };
  function sanitize(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    var out = document.createElement('div');
    function walk(src, dst) {
      Array.prototype.forEach.call(src.childNodes, function (n) {
        if (n.nodeType === 3) { dst.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        var tag = n.tagName.toUpperCase();
        if (DROP[tag]) return;
        if (tag === 'SPAN' && n.classList.contains('visually-hidden')) return;
        var t = MAP[tag];
        if (!t) { walk(n, dst); return; }
        var e = document.createElement(t);
        if (t === 'img') {
          var srcA = n.getAttribute('src') || '';
          if (!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(srcA)) {
            dst.appendChild(document.createTextNode(n.getAttribute('alt') ? '[image: ' + n.getAttribute('alt') + ']' : ''));
            return;
          }
          e.setAttribute('src', srcA); e.setAttribute('alt', n.getAttribute('alt') || 'Image');
          dst.appendChild(e); return;
        }
        if (t === 'a') {
          var href = n.getAttribute('href') || '';
          if (/^https?:/i.test(href)) e.setAttribute('href', href); else { walk(n, dst); return; }
        }
        if (t === 'p' && n.classList && n.classList.contains('note-src')) e.className = 'note-src';
        walk(n, e);
        dst.appendChild(e);
      });
    }
    walk(doc.body, out);
    // drop empty paragraphs that came from wrapper divs
    Array.prototype.slice.call(out.querySelectorAll('p')).forEach(function (p) { if (!p.textContent.trim() && !p.querySelector('img')) p.remove(); });
    // unwrap p inside li / p nested in p
    Array.prototype.slice.call(out.querySelectorAll('p p, li > p, h2 p, h3 p')).forEach(function (p) { while (p.firstChild) p.parentNode.insertBefore(p.firstChild, p); p.parentNode.insertBefore(document.createTextNode(' '), p); p.remove(); });
    return out.innerHTML;
  }

  /* ================= images ================= */
  function fileToDataURL(file) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(file); });
  }
  function loadImg(src) {
    return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = rej; im.src = src; });
  }
  function shrink(dataUrl, maxW, forcePng) {
    return loadImg(dataUrl).then(function (im) {
      var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
      var png = forcePng || /^data:image\/png/i.test(dataUrl);
      if (w <= maxW && /^data:image\/(png|jpe?g)/i.test(dataUrl) && dataUrl.length < 1.5e6) return { src: dataUrl, w: w, h: h };
      var s = Math.min(1, maxW / w), c = document.createElement('canvas');
      c.width = Math.round(w * s); c.height = Math.round(h * s);
      var g = c.getContext('2d');
      if (!png) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(im, 0, 0, c.width, c.height);
      var out = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.85);
      if (png && out.length > 2.5e6) out = c.toDataURL('image/jpeg', 0.85);
      return { src: out, w: c.width, h: c.height };
    });
  }
  function svgSnapshot(svg) {
    var clone = svg.cloneNode(true);
    var srcEls = svg.querySelectorAll('*'), dstEls = clone.querySelectorAll('*');
    var PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'opacity', 'fill-opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor'];
    for (var i = 0; i < srcEls.length; i++) {
      var cs = window.getComputedStyle(srcEls[i]), st = '';
      PROPS.forEach(function (p) { var v = cs.getPropertyValue(p); if (v) st += p + ':' + v + ';'; });
      dstEls[i].setAttribute('style', st);
      dstEls[i].removeAttribute('class');
    }
    var vb = svg.viewBox && svg.viewBox.baseVal;
    var w = vb && vb.width ? vb.width : svg.clientWidth, h = vb && vb.height ? vb.height : svg.clientHeight;
    clone.setAttribute('width', w); clone.setAttribute('height', h);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    var bg = window.getComputedStyle(svg.closest('.sim-stage') || svg).backgroundColor;
    var xml = new XMLSerializer().serializeToString(clone);
    var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    return loadImg(url).then(function (im) {
      var c = document.createElement('canvas'), k = 1.5;
      c.width = Math.round(w * k); c.height = Math.round(h * k);
      var g = c.getContext('2d');
      g.fillStyle = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#0B1330'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    });
  }

  /* ================= panel UI ================= */
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }
  var tools = document.querySelector('.topbar .tools');
  var toggle = el('button', { type: 'button', 'class': 'notes-toggle', 'aria-expanded': 'false', 'aria-controls': 'notes-panel' }, '✎ Notes');
  if (tools) tools.insertBefore(toggle, tools.firstChild);

  var panel = el('aside', { id: 'notes-panel', 'class': 'notes-panel', 'aria-labelledby': 'notes-h' });
  var head = el('div', { 'class': 'notes-head' });
  var h = el('h2', { id: 'notes-h' }, MOD_LABEL + ' notes');
  var status = el('span', { 'class': 'notes-status', role: 'status', 'aria-live': 'polite' }, 'Loading…');
  var closeB = el('button', { type: 'button', 'aria-label': 'Close notes' }, '✕');
  head.appendChild(h); head.appendChild(status); head.appendChild(closeB);

  var bar = el('div', { 'class': 'notes-toolbar', role: 'toolbar', 'aria-label': 'Formatting' });
  var BTNS = [
    ['B', 'Bold (Ctrl+B)', function () { exec('bold'); }], ['I', 'Italic (Ctrl+I)', function () { exec('italic'); }], ['U', 'Underline (Ctrl+U)', function () { exec('underline'); }], '|',
    ['H2', 'Heading', function () { exec('formatBlock', '<h2>'); }], ['H3', 'Subheading', function () { exec('formatBlock', '<h3>'); }], ['¶', 'Normal paragraph', function () { exec('formatBlock', '<p>'); }], '|',
    ['• List', 'Bulleted list', function () { exec('insertUnorderedList'); }], ['1. List', 'Numbered list', function () { exec('insertOrderedList'); }], ['❝', 'Quote', function () { exec('formatBlock', '<blockquote>'); }], '|',
    ['🖼 Image', 'Insert an image from a file', function () { fileIn.click(); }], ['↶', 'Undo', function () { exec('undo'); }], ['↷', 'Redo', function () { exec('redo'); }]
  ];
  BTNS.forEach(function (b) {
    if (b === '|') { bar.appendChild(el('span', { 'class': 'sep', 'aria-hidden': 'true' })); return; }
    var x = el('button', { type: 'button', title: b[1], 'aria-label': b[1] }, b[0]);
    x.addEventListener('mousedown', function (e) { e.preventDefault(); });
    x.addEventListener('click', b[2]);
    bar.appendChild(x);
  });
  var fileIn = el('input', { type: 'file', accept: 'image/*', multiple: '', hidden: '' });

  var ed = el('div', { 'class': 'notes-editor', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': MOD_LABEL + ' notes', spellcheck: 'true',
    'data-placeholder': 'Type, or paste text and images here. Use the “Add to notes” buttons on the page to collect worked examples, activity results, and simulation snapshots.' });

  var foot = el('div', { 'class': 'notes-foot' });
  foot.appendChild(el('span', { 'class': 'label' }, 'Export:'));
  var EXP = [['Word', exportDocx], ['PDF', exportPdf], ['Markdown', exportMd], ['HTML', exportHtml]];
  EXP.forEach(function (x) { var b = el('button', { type: 'button', 'aria-label': 'Export notes as ' + x[0] }, x[0]); b.addEventListener('click', x[1]); foot.appendChild(b); });
  var copyB = el('button', { type: 'button' }, 'Copy all');
  var clearB = el('button', { type: 'button', 'class': 'danger' }, 'Clear');
  foot.appendChild(copyB); foot.appendChild(clearB);
  var bk = el('a', { 'class': 'backup-link', href: (document.body.getAttribute('data-root') || '') + 'my-work.html' }, 'Back up all my work');
  foot.appendChild(bk);

  panel.appendChild(head); panel.appendChild(bar); panel.appendChild(ed); panel.appendChild(foot); panel.appendChild(fileIn);
  document.body.appendChild(panel);

  function openPanel(focus) {
    panel.classList.add('open'); toggle.setAttribute('aria-expanded', 'true');
    if (focus) ed.focus();
  }
  function closePanel() { panel.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
  toggle.addEventListener('click', function () { if (panel.classList.contains('open')) closePanel(); else openPanel(true); });
  closeB.addEventListener('click', closePanel);
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } });

  function exec(cmd, val) { ed.focus(); try { document.execCommand(cmd, false, val || null); } catch (e) { /* unsupported */ } scheduleSave(); }

  /* ---------- load & save ---------- */
  var saveTimer = null, loaded = false;
  function timeNow() { return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function saveNow() {
    return putBook({ html: ed.innerHTML, updated: Date.now() }).then(function (ok) {
      status.textContent = ok ? 'Saved ' + timeNow() : 'Could not save (storage full?)';
    });
  }
  function scheduleSave() { if (!loaded) return; status.textContent = 'Saving…'; window.clearTimeout(saveTimer); saveTimer = window.setTimeout(saveNow, 500); }
  ed.addEventListener('input', scheduleSave);
  getBook().then(function (b) {
    if (b && b.html) ed.innerHTML = sanitize(b.html);
    loaded = true;
    status.textContent = b && b.updated ? 'Saved ' + new Date(b.updated).toLocaleDateString() : 'Empty notebook';
  });
  window.addEventListener('pagehide', function () { if (loaded) saveNow(); });

  /* ---------- paste, drop, upload ---------- */
  function insertHtmlAtCursor(html) {
    ed.focus();
    var ok = false;
    try { ok = document.execCommand('insertHTML', false, html); } catch (e) { ok = false; }
    if (!ok) ed.insertAdjacentHTML('beforeend', html);
    scheduleSave();
  }
  function insertImageFiles(files) {
    var imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
    if (!imgs.length) return false;
    status.textContent = 'Adding image…';
    imgs.reduce(function (p, f) {
      return p.then(function () { return fileToDataURL(f); }).then(function (d) { return shrink(d, 1400); }).then(function (r) {
        insertHtmlAtCursor('<p><img src="' + r.src + '" alt="' + esc(f.name || 'Pasted image') + '"></p>');
      });
    }, Promise.resolve()).then(function () { announce('Image added to notes.'); }).catch(function () { status.textContent = 'That image could not be read.'; });
    return true;
  }
  ed.addEventListener('paste', function (e) {
    var cd = e.clipboardData; if (!cd) return;
    if (cd.files && cd.files.length && insertImageFiles(cd.files)) { e.preventDefault(); return; }
    var html = cd.getData('text/html');
    e.preventDefault();
    if (html) insertHtmlAtCursor(sanitize(html));
    else {
      var t = cd.getData('text/plain');
      insertHtmlAtCursor(esc(t).split(/\r?\n\r?\n/).map(function (x) { return '<p>' + x.replace(/\r?\n/g, '<br>') + '</p>'; }).join(''));
    }
  });
  ed.addEventListener('dragover', function (e) { if (e.dataTransfer && Array.prototype.some.call(e.dataTransfer.types || [], function (t) { return t === 'Files'; })) e.preventDefault(); });
  ed.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      e.preventDefault();
      if (document.caretRangeFromPoint) { var r = document.caretRangeFromPoint(e.clientX, e.clientY); if (r) { var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } }
      insertImageFiles(e.dataTransfer.files);
    }
  });
  fileIn.addEventListener('change', function () { if (fileIn.files.length) insertImageFiles(fileIn.files); fileIn.value = ''; });

  /* ---------- public add() used by buttons across the page ---------- */
  function add(html, label) {
    var block = sanitize(html) + '<p class="note-src">From ' + esc(label || MOD_TITLE) + ', ' + esc(new Date().toLocaleDateString()) + '</p><p><br></p>';
    var go = function () {
      ed.insertAdjacentHTML('beforeend', block);
      saveNow();
      toggle.classList.add('pulse');
      window.setTimeout(function () { toggle.classList.remove('pulse'); }, 900);
      announce('Added to your ' + MOD_LABEL + ' notes.');
    };
    if (loaded) go(); else getBook().then(function () { window.setTimeout(go, 50); });
  }
  window.PHYS106Notes = { add: add, open: openPanel };

  /* ---------- copy & clear ---------- */
  copyB.addEventListener('click', function () {
    var html = ed.innerHTML, text = ed.innerText;
    var done = function () { announce('Notes copied. Paste them into Word, OneNote, or an email.'); };
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]).then(done, fallback);
    } else fallback();
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(ed);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      try { document.execCommand('copy'); done(); } catch (e) { announce('Select the notes and press Ctrl+C to copy.'); }
      s.removeAllRanges();
    }
  });
  clearB.addEventListener('click', function () {
    if (!window.confirm('Delete everything in your ' + MOD_LABEL + ' notes? Export first if you want a copy. This cannot be undone.')) return;
    ed.innerHTML = ''; saveNow(); announce('Notes cleared.');
  });

  /* ================= export ================= */
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    announce('Downloading ' + name + '.');
  }
  function contentHtml() { return sanitize(ed.innerHTML); }
  function titleText() { return 'PHYS 106 ' + MOD_LABEL + ': ' + MOD_TITLE; }
  function fullHtml(forPrint) {
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(titleText()) + ' notes</title><style>' +
      'body{font-family:"Iowan Old Style","Palatino Linotype",Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#172036}' +
      'h1,h2,h3{font-family:"IBM Plex Sans","Segoe UI",system-ui,sans-serif;line-height:1.25}h1{font-size:1.6rem;margin-bottom:.2rem}' +
      '.meta{font-family:system-ui,sans-serif;color:#4B5670;font-size:.9rem;margin-top:0}img{max-width:100%;height:auto}' +
      '.note-src{font-family:system-ui,sans-serif;font-size:.8rem;color:#4B5670;border-top:1px dashed #CBD3DF;padding-top:.4rem}' +
      'blockquote{border-left:3px solid #8A4F00;margin:1rem 0;padding-left:1rem;color:#4B5670}table{border-collapse:collapse}td,th{border:1px solid #CBD3DF;padding:.3rem .6rem}' +
      (forPrint ? '@page{margin:18mm}body{margin:0 auto}img{page-break-inside:avoid}' : '') +
      '</style></head><body><h1>' + esc(titleText()) + '</h1><p class="meta">My notes, exported ' + esc(new Date().toLocaleString()) + '</p>' + contentHtml() + '</body></html>';
  }
  function exportHtml() { download(new Blob([fullHtml(false)], { type: 'text/html' }), FILE_BASE + '.html'); }
  function exportPdf() {
    var f = document.createElement('iframe');
    f.setAttribute('title', 'Print preview'); f.style.position = 'fixed'; f.style.right = '0'; f.style.bottom = '0'; f.style.width = '0'; f.style.height = '0'; f.style.border = '0';
    document.body.appendChild(f);
    var d = f.contentWindow.document; d.open(); d.write(fullHtml(true)); d.close();
    var imgs = d.images, pending = imgs.length;
    function go() {
      try { f.contentWindow.focus(); f.contentWindow.print(); announce('Choose “Save as PDF” in the print dialog.'); }
      catch (e) { var w = window.open('', '_blank'); if (w) { w.document.write(fullHtml(true)); w.document.close(); w.print(); } }
      window.setTimeout(function () { f.remove(); }, 60000);
    }
    if (!pending) window.setTimeout(go, 50);
    else Array.prototype.forEach.call(imgs, function (im) { if (im.complete) { if (--pending === 0) go(); } else im.onload = im.onerror = function () { if (--pending === 0) go(); }; });
  }

  /* ---------- Markdown ---------- */
  function toMarkdown(root) {
    function inline(n) {
      var out = '';
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) { out += c.nodeValue.replace(/([*_`\[\]])/g, '\\$1'); return; }
        if (c.nodeType !== 1) return;
        var t = c.tagName.toLowerCase(), inner = inline(c);
        if (t === 'strong') out += inner.trim() ? '**' + inner.trim() + '** ' : '';
        else if (t === 'em') out += inner.trim() ? '*' + inner.trim() + '* ' : '';
        else if (t === 'code') out += '`' + c.textContent + '`';
        else if (t === 'br') out += '  \n';
        else if (t === 'a') out += '[' + inner + '](' + c.getAttribute('href') + ')';
        else if (t === 'img') out += '![' + (c.getAttribute('alt') || 'image') + '](' + c.getAttribute('src') + ')';
        else if (t === 'sub' || t === 'sup' || t === 'u') out += '<' + t + '>' + inner + '</' + t + '>';
        else out += inner;
      });
      return out.replace(/ +\n/g, '  \n');
    }
    function list(n, depth) {
      var i = 0, out = '';
      Array.prototype.forEach.call(n.children, function (li) {
        if (li.tagName.toLowerCase() !== 'li') return;
        i++;
        var clone = li.cloneNode(true);
        Array.prototype.slice.call(clone.querySelectorAll('ul,ol')).forEach(function (x) { x.remove(); });
        out += '  '.repeat(depth) + (n.tagName.toLowerCase() === 'ol' ? i + '. ' : '- ') + inline(clone).trim() + '\n';
        Array.prototype.forEach.call(li.children, function (ch) { if (/^(ul|ol)$/i.test(ch.tagName)) out += list(ch, depth + 1); });
      });
      return out;
    }
    function block(n) {
      var out = '';
      Array.prototype.forEach.call(n.childNodes, function (c) {
        if (c.nodeType === 3) { if (c.nodeValue.trim()) out += c.nodeValue.trim() + '\n\n'; return; }
        if (c.nodeType !== 1) return;
        var t = c.tagName.toLowerCase();
        if (t === 'h2') out += '## ' + c.textContent.trim() + '\n\n';
        else if (t === 'h3') out += '### ' + c.textContent.trim() + '\n\n';
        else if (t === 'ul' || t === 'ol') out += list(c, 0) + '\n';
        else if (t === 'blockquote') out += inline(c).trim().split('\n').map(function (l) { return '> ' + l; }).join('\n') + '\n\n';
        else if (t === 'pre') out += '```\n' + c.textContent + '\n```\n\n';
        else if (t === 'table') {
          var rows = Array.prototype.map.call(c.querySelectorAll('tr'), function (tr) { return Array.prototype.map.call(tr.children, function (td) { return inline(td).trim().replace(/\|/g, '\\|'); }); });
          if (rows.length) {
            var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
            rows.forEach(function (r, i) { while (r.length < w) r.push(''); out += '| ' + r.join(' | ') + ' |\n'; if (i === 0) out += '|' + ' --- |'.repeat(w) + '\n'; });
            out += '\n';
          }
        }
        else if (t === 'p' && c.classList.contains('note-src')) out += '*' + c.textContent.trim() + '*\n\n---\n\n';
        else { var s = inline(c).trim(); if (s) out += s + '\n\n'; }
      });
      return out;
    }
    return '# ' + titleText() + '\n\n*My notes, exported ' + new Date().toLocaleString() + '*\n\n' + block(root).replace(/\n{3,}/g, '\n\n');
  }
  function exportMd() {
    var d = document.createElement('div'); d.innerHTML = contentHtml();
    download(new Blob([toMarkdown(d)], { type: 'text/markdown' }), FILE_BASE + '.md');
  }

  /* ---------- Word (.docx) ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) { // files: [{name, data: Uint8Array}] stored (no compression)
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
      var lh = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(sz), u32(sz), u16(name.length), u16(0));
      parts.push(new Uint8Array(lh), name, f.data);
      central.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(sz), u32(sz), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset))), name);
      offset += lh.length + name.length + sz;
    });
    var cdSize = central.reduce(function (s, x) { return s + x.length; }, 0);
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(offset), u16(0)));
    return new Blob(parts.concat(central, [end]), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  function xesc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dataUrlBytes(u) { var b = atob(u.split(',')[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }

  function exportDocx() {
    status.textContent = 'Building Word file…';
    var root = document.createElement('div'); root.innerHTML = contentHtml();
    var media = [], jobs = [];
    // prepare images (normalize to png/jpeg and get sizes)
    Array.prototype.forEach.call(root.querySelectorAll('img'), function (img, i) {
      var src = img.getAttribute('src');
      jobs.push(shrink(src, 1600, !/^data:image\/(png|jpe?g)/i.test(src)).then(function (r) {
        var ext = /^data:image\/png/i.test(r.src) ? 'png' : 'jpeg';
        var id = media.length + 1;
        media.push({ name: 'image' + id + '.' + ext, data: dataUrlBytes(r.src), ext: ext });
        img.setAttribute('data-rid', 'rIdImg' + id); img.setAttribute('data-w', r.w); img.setAttribute('data-h', r.h);
        img.setAttribute('data-n', id);
      }).catch(function () { img.remove(); }));
    });
    Promise.all(jobs).then(function () {
      var numId = 2, nums = [];
      function run(text, f) {
        if (!text) return '';
        var rp = (f.b ? '<w:b/>' : '') + (f.i ? '<w:i/>' : '') + (f.u ? '<w:u w:val="single"/>' : '') + (f.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>' : '') + (f.sub ? '<w:vertAlign w:val="subscript"/>' : '') + (f.sup ? '<w:vertAlign w:val="superscript"/>' : '') + (f.small ? '<w:color w:val="595959"/><w:sz w:val="18"/>' : '');
        return '<w:r>' + (rp ? '<w:rPr>' + rp + '</w:rPr>' : '') + '<w:t xml:space="preserve">' + xesc(text) + '</w:t></w:r>';
      }
      function drawing(img, maxIn) {
        var w = +img.getAttribute('data-w'), hh = +img.getAttribute('data-h'), maxW = (maxIn || 6) * 914400;
        var cx = Math.round(w * 9525), cy = Math.round(hh * 9525);
        if (cx > maxW) { cy = Math.round(cy * maxW / cx); cx = maxW; }
        var n = img.getAttribute('data-n'), alt = xesc(img.getAttribute('alt') || 'Image');
        return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + n + '" name="Picture ' + n + '" descr="' + alt + '"/>' +
          '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>' +
          '<pic:nvPicPr><pic:cNvPr id="' + n + '" name="Picture ' + n + '" descr="' + alt + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + img.getAttribute('data-rid') + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
          '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
      }
      function runs(node, f) {
        var out = '';
        Array.prototype.forEach.call(node.childNodes, function (c) {
          if (c.nodeType === 3) { out += run(c.nodeValue.replace(/\s+/g, ' '), f); return; }
          if (c.nodeType !== 1) return;
          var t = c.tagName.toLowerCase(), g = Object.assign({}, f);
          if (t === 'br') { out += '<w:r><w:br/></w:r>'; return; }
          if (t === 'img') { if (c.getAttribute('data-rid')) out += drawing(c, f.maxIn); return; }
          if (t === 'ul' || t === 'ol') return;
          if (t === 'strong') g.b = true; if (t === 'em') g.i = true; if (t === 'u') g.u = true; if (t === 'code') g.code = true; if (t === 'sub') g.sub = true; if (t === 'sup') g.sup = true;
          out += runs(c, g);
        });
        return out;
      }
      function para(inner, style, extra) { return '<w:p>' + ((style || extra) ? '<w:pPr>' + (style ? '<w:pStyle w:val="' + style + '"/>' : '') + (extra || '') + '</w:pPr>' : '') + inner + '</w:p>'; }
      function list(n, depth, id) {
        var out = '';
        Array.prototype.forEach.call(n.children, function (li) {
          if (li.tagName.toLowerCase() !== 'li') return;
          out += para(runs(li, {}), 'ListParagraph', '<w:numPr><w:ilvl w:val="' + Math.min(depth, 2) + '"/><w:numId w:val="' + id + '"/></w:numPr>');
          Array.prototype.forEach.call(li.children, function (ch) {
            var tt = ch.tagName.toLowerCase();
            if (tt === 'ul') out += list(ch, depth + 1, 1);
            if (tt === 'ol') { var nid = numId++; nums.push(nid); out += list(ch, depth + 1, nid); }
          });
        });
        return out;
      }
      function blocks(n) {
        var out = '';
        Array.prototype.forEach.call(n.childNodes, function (c) {
          if (c.nodeType === 3) { if (c.nodeValue.trim()) out += para(run(c.nodeValue.trim(), {})); return; }
          if (c.nodeType !== 1) return;
          var t = c.tagName.toLowerCase();
          if (t === 'h2') out += para(runs(c, {}), 'Heading1');
          else if (t === 'h3') out += para(runs(c, {}), 'Heading2');
          else if (t === 'ul') out += list(c, 0, 1);
          else if (t === 'ol') { var nid = numId++; nums.push(nid); out += list(c, 0, nid); }
          else if (t === 'blockquote') out += para(runs(c, { i: true }), 'Quote');
          else if (t === 'pre') out += para(runs(c, { code: true }));
          else if (t === 'img') out += para(drawing(c));
          else if (t === 'table') {
            var rows = c.querySelectorAll('tr');
            if (!rows.length) return;
            var cols = Math.max.apply(null, Array.prototype.map.call(rows, function (r) { return r.children.length; }));
            out += '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tblGrid>' + ('<w:gridCol w:w="' + Math.floor(9000 / cols) + '"/>').repeat(cols) + '</w:tblGrid>';
            Array.prototype.forEach.call(rows, function (r) {
              out += '<w:tr>';
              for (var k = 0; k < cols; k++) { var cell = r.children[k]; out += '<w:tc><w:tcPr><w:tcW w:w="' + Math.floor(9000 / cols) + '" w:type="dxa"/></w:tcPr>' + para(cell ? runs(cell, { b: cell.tagName.toLowerCase() === 'th', maxIn: 6 / cols }) : '') + '</w:tc>'; }
              out += '</w:tr>';
            });
            out += '</w:tbl>' + para('');
          }
          else if (t === 'p' && c.classList.contains('note-src')) out += para(runs(c, { small: true, i: true }), null, '<w:pBdr><w:bottom w:val="dashed" w:sz="4" w:space="4" w:color="BFBFBF"/></w:pBdr>');
          else out += para(runs(c, {}));
        });
        return out;
      }
      var body = para(run(titleText(), {}), 'Title') + para(run('My notes, exported ' + new Date().toLocaleString(), { i: true, small: true })) + blocks(root);
      var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
      var doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body +
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>';
      function lvl(i, fmt, txt) { return '<w:lvl w:ilvl="' + i + '"><w:start w:val="1"/><w:numFmt w:val="' + fmt + '"/><w:lvlText w:val="' + txt + '"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="' + (720 + 360 * i) + '" w:hanging="360"/></w:pPr></w:lvl>'; }
      var numbering = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>' + lvl(0, 'bullet', '•') + lvl(1, 'bullet', '◦') + lvl(2, 'bullet', '▪') + '</w:abstractNum>' +
        '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>' + lvl(0, 'decimal', '%1.') + lvl(1, 'lowerLetter', '%2.') + lvl(2, 'lowerRoman', '%3.') + '</w:abstractNum>' +
        '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
        nums.map(function (n) { return '<w:num w:numId="' + n + '"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>'; }).join('') + '</w:numbering>';
      var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="172036"/><w:sz w:val="40"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="100"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="2447A6"/><w:sz w:val="30"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="172036"/><w:sz w:val="25"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="8A4F00"/></w:pBdr></w:pPr><w:rPr><w:color w:val="4B5670"/></w:rPr></w:style>' +
        '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style>' +
        '<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/></w:tblBorders></w:tblPr></w:style>' +
        '</w:styles>';
      var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '<Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
        media.map(function (m, i) { return '<Relationship Id="rIdImg' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>'; }).join('') + '</Relationships>';
      var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
        '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
        '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
      var root_rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
      var core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
        '<dc:title>' + xesc(titleText() + ' notes') + '</dc:title><dc:creator>PHYS 106 student</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + new Date().toISOString().replace(/\.\d+Z$/, 'Z') + '</dcterms:created></cp:coreProperties>';
      var enc = new TextEncoder();
      var files = [
        { name: '[Content_Types].xml', data: enc.encode(ct) }, { name: '_rels/.rels', data: enc.encode(root_rels) },
        { name: 'docProps/core.xml', data: enc.encode(core) },
        { name: 'word/document.xml', data: enc.encode(doc) }, { name: 'word/styles.xml', data: enc.encode(styles) },
        { name: 'word/numbering.xml', data: enc.encode(numbering) }, { name: 'word/_rels/document.xml.rels', data: enc.encode(rels) }
      ].concat(media.map(function (m) { return { name: 'word/media/' + m.name, data: m.data }; }));
      download(zip(files), FILE_BASE + '.docx');
      status.textContent = 'Word file ready';
    });
  }

  /* ================= "Add to notes" buttons across the page ================= */
  function noteBtn(label) { var b = el('button', { type: 'button', 'class': 'to-notes' }, label || '＋ Add to notes'); return b; }
  var label = P.sectionLabel || function () { return MOD_TITLE; };
  // worked examples
  Array.prototype.forEach.call(document.querySelectorAll('.worked'), function (w) {
    var b = noteBtn(); w.appendChild(b);
    b.addEventListener('click', function () {
      var c = w.cloneNode(true); c.querySelector('.to-notes').remove();
      Array.prototype.forEach.call(c.querySelectorAll('.eq'), function (e) { var p = document.createElement('p'); var cd = document.createElement('code'); cd.textContent = e.textContent; p.appendChild(cd); e.replaceWith(p); });
      Array.prototype.forEach.call(c.querySelectorAll('h4'), function (x) { var h3 = document.createElement('h3'); h3.textContent = x.textContent; x.replaceWith(h3); });
      add(c.innerHTML, label(w));
    });
  });
  // analogies and misconception callouts
  Array.prototype.forEach.call(document.querySelectorAll('.callout.analogy, .callout.misconception'), function (cl) {
    var b = noteBtn(); cl.appendChild(b);
    b.addEventListener('click', function () {
      var c = cl.cloneNode(true); c.querySelector('.to-notes').remove();
      var t = c.querySelector('.callout-title'); var title = t ? t.textContent : ''; if (t) t.remove();
      add('<blockquote><strong>' + esc(cl.classList.contains('analogy') ? 'Analogy' : 'Misconception') + ':</strong> ' + c.innerHTML + '</blockquote>', label(cl));
    });
  });
  // simulations: snapshot + readout
  Array.prototype.forEach.call(document.querySelectorAll('.sim'), function (sim) {
    var svg = sim.querySelector('.sim-stage svg'); if (!svg) return;
    var row = el('div', { 'class': 'to-notes-row' });
    var b = noteBtn('📷 Snapshot to notes'); row.appendChild(b);
    var readout = sim.querySelector('.sim-readout');
    if (readout && readout.nextSibling) sim.insertBefore(row, readout.nextElementSibling && readout.nextElementSibling.classList.contains('sim-note') ? readout.nextElementSibling.nextSibling : readout.nextSibling);
    else sim.appendChild(row);
    b.addEventListener('click', function () {
      b.disabled = true;
      svgSnapshot(svg).then(function (png) {
        var title = (sim.querySelector('.sim-head h3') || {}).textContent || 'Simulation';
        var html = '<h3>' + esc(title) + '</h3><p><img src="' + png + '" alt="Snapshot of ' + esc(title) + '"></p>';
        var ctr = Array.prototype.map.call(sim.querySelectorAll('.sim-controls .control'), function (c) {
          var lab = c.querySelector('label'), sel = c.querySelector('select');
          var txt = lab ? lab.textContent.replace(/\s+/g, ' ').trim() : '';
          if (sel && sel.selectedIndex >= 0) txt += ': ' + sel.options[sel.selectedIndex].text;
          return txt;
        }).filter(Boolean);
        if (ctr.length) html += '<p><strong>Settings:</strong> ' + esc(ctr.join('; ')) + '</p>';
        if (readout) html += '<ul>' + Array.prototype.map.call(readout.querySelectorAll('div'), function (d) { var dt = d.querySelector('dt'), dd = d.querySelector('dd'); return '<li><strong>' + esc(dt ? dt.textContent : '') + ':</strong> ' + esc(dd ? dd.textContent : '') + '</li>'; }).join('') + '</ul>';
        var note = sim.querySelector('.sim-note'); if (note && note.textContent.trim()) html += '<p>' + esc(note.textContent) + '</p>';
        add(html, label(sim));
      }).catch(function () { announce('Snapshot failed; try a screenshot and paste it into your notes.'); }).then(function () { b.disabled = false; });
    });
  });
  // calculator-style activities with a result box
  Array.prototype.forEach.call(document.querySelectorAll('.activity'), function (act) {
    if (act.querySelector('.guided, .estimate-activity, .poe, .explain-it, .order-activity, .tf-activity, .checklist, .label-activity, #mj-body')) return;
    var res = act.querySelectorAll('.act-result'); if (!res.length) return;
    var b = noteBtn('＋ Add result to notes'); act.appendChild(b);
    b.addEventListener('click', function () {
      var title = (act.querySelector('h3') || {}).textContent || 'Activity';
      var html = '<h3>' + esc(title) + '</h3>';
      var inputs = Array.prototype.map.call(act.querySelectorAll('.act-grid input, .act-grid select'), function (i) {
        var l = act.querySelector('label[for="' + i.id + '"]'); if (!l) return '';
        var v = i.tagName === 'SELECT' ? i.options[i.selectedIndex].text : (i.type === 'checkbox' ? (i.checked ? 'yes' : 'no') : i.value);
        return v ? l.textContent.replace(/\s+/g, ' ').trim() + ': ' + v : '';
      }).filter(Boolean);
      if (inputs.length) html += '<p><strong>Inputs:</strong> ' + esc(inputs.join('; ')) + '</p>';
      Array.prototype.forEach.call(res, function (r) {
        var c = r.cloneNode(true);
        Array.prototype.forEach.call(c.querySelectorAll('dl'), function (dl) {
          var ul = document.createElement('ul');
          Array.prototype.forEach.call(dl.querySelectorAll('div'), function (d) { var li = document.createElement('li'); li.innerHTML = '<strong>' + esc((d.querySelector('dt') || {}).textContent) + ':</strong> ' + esc((d.querySelector('dd') || {}).textContent); ul.appendChild(li); });
          dl.replaceWith(ul);
        });
        html += c.innerHTML;
      });
      add(html, label(act));
    });
  });
})();
