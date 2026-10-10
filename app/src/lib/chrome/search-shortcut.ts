import { isSearchShortcut, isTypingTarget } from '../prefs';

export function initSearchShortcut() {
  document.addEventListener('keydown', (e) => {
    if (!isSearchShortcut(e) || isTypingTarget(document.activeElement as HTMLElement)) return;
    e.preventDefault();
    const box = document.querySelector<HTMLInputElement>('#search');
    if (box) box.focus();
    else location.href = `${document.documentElement.dataset.langBase ?? ''}#search`;
  });
}
