import { isSearchShortcut, isTypingTarget } from '../prefs';

/** "/" focuses the search box — or goes to the home page's. */
export function initSearchShortcut() {
  document.addEventListener('keydown', (e) => {
    if (!isSearchShortcut(e) || isTypingTarget(document.activeElement as HTMLElement)) return;
    e.preventDefault();
    const box = document.querySelector<HTMLInputElement>('#search');
    if (box) box.focus();
    else location.href = `${document.documentElement.dataset.langBase ?? ''}#search`;
  });
}
