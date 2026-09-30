/** Danish readers on an English page: suggest the Danish one (A63). */
import { LANG_SUGGEST_KEY, prefersDanish } from '../prefs';

function dismissed(): boolean {
  try {
    return localStorage.getItem(LANG_SUGGEST_KEY) === '1';
  } catch {
    return false; // storage unavailable: show it
  }
}

export function initLangSuggest() {
  const suggest = document.getElementById('lang-suggest');
  if (!suggest) return;
  if (!dismissed() && prefersDanish(navigator.languages ?? [navigator.language])) {
    suggest.hidden = false;
  }
  suggest.querySelector('[data-lang-keep]')?.addEventListener('click', () => {
    suggest.hidden = true;
    try {
      localStorage.setItem(LANG_SUGGEST_KEY, '1');
    } catch {
      /* hidden for this page only */
    }
  });
}
