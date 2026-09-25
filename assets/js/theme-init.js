/* Applies saved theme and text size before first paint (external file, CSP-safe). */
(function () {
  try {
    var prefs = JSON.parse(localStorage.getItem('phys106-prefs-v1')) || {};
    if (prefs.theme && prefs.theme !== 'auto') {
      document.documentElement.setAttribute('data-theme', prefs.theme);
    }
    if (prefs.scale) {
      document.documentElement.style.setProperty('--scale', String(prefs.scale));
    }
  } catch (e) { /* storage unavailable: use defaults */ }
})();
