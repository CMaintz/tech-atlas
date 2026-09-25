// Sets the colour theme before first paint (A92), so a light-theme reader never sees a
// dark flash. A blocking external script: the CSP's script-src 'self' covers it, no
// hash needed. Mirrors parseTheme/resolveTheme in src/lib/prefs.ts.
(function () {
  var choice = null;
  try {
    choice = localStorage.getItem('atlas.theme');
  } catch (e) {
    /* storage blocked: follow the OS */
  }
  if (choice !== 'light' && choice !== 'dark') choice = 'system';
  var osLight = !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
  var theme = choice === 'system' ? (osLight ? 'light' : 'dark') : choice;
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-theme-choice', choice);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0a0a0a');
})();
