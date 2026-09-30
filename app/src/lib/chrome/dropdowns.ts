/**
 * Header drop-down menus (theme, language): a button + role="menu" (A92).
 * Arrow keys move, Home/End jump, Esc closes and returns focus, Tab leaves.
 */

export type Dropdown = { root: HTMLElement; close: (refocus: boolean) => void };
type OpenAt = 'first' | 'last' | 'current';

/** The item to focus when a menu opens; `current` is the checked item's index or -1. */
export function openIndex(at: OpenAt, current: number, count: number): number {
  if (at === 'last') return count - 1;
  return at === 'first' ? 0 : Math.max(0, current);
}

const MOVES = new Map<string, (i: number, count: number) => number>([
  ['ArrowDown', (i) => i + 1],
  ['ArrowUp', (i) => i - 1],
  ['Home', () => 0],
  ['End', (_, count) => count - 1],
]);

/** The item a key moves focus to from item `i`, wrapping at both ends; null for other keys. */
export function moveIndex(key: string, i: number, count: number): number | null {
  const move = MOVES.get(key);
  return move ? (move(i, count) + count) % count : null;
}

/** Keys inside an open menu. */
function onMenuKey(e: KeyboardEvent, items: HTMLElement[], close: Dropdown['close']) {
  const to = moveIndex(e.key, items.indexOf(document.activeElement as HTMLElement), items.length);
  if (to !== null) {
    e.preventDefault();
    items[to]?.focus();
  } else if (e.key === 'Escape') {
    e.preventDefault(); // handled: the mobile menu and the tour leave it alone
    close(true);
  } else if (e.key === 'Tab') close(false);
}

function makeDropdown(root: HTMLElement, all: Dropdown[]): Dropdown | null {
  const button = root.querySelector<HTMLButtonElement>('[data-dropdown-button]');
  const list = root.querySelector<HTMLElement>('[role="menu"]');
  if (!button || !list) return null;
  const items = [...list.querySelectorAll<HTMLElement>('[role^="menuitem"]')];
  const close = (refocus: boolean) => {
    if (list.hidden) return;
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (refocus) button.focus();
  };
  const open = (at: OpenAt) => {
    for (const d of all) if (d.root !== root) d.close(false);
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    const current = items.findIndex(
      (i) => i.getAttribute('aria-checked') === 'true' || i.hasAttribute('aria-current'),
    );
    items[openIndex(at, current, items.length)]?.focus();
  };
  button.addEventListener('click', () => (list.hidden ? open('current') : close(false)));
  button.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    open(e.key === 'ArrowDown' ? 'first' : 'last');
  });
  list.addEventListener('keydown', (e) => onMenuKey(e, items, close));
  return { root, close };
}

/** Wire every `[data-dropdown]` on the page; a click outside closes them all. */
export function initDropdowns(): Dropdown[] {
  const dropdowns: Dropdown[] = [];
  for (const root of document.querySelectorAll<HTMLElement>('[data-dropdown]')) {
    const d = makeDropdown(root, dropdowns);
    if (d) dropdowns.push(d);
  }
  document.addEventListener('click', (e) => {
    for (const d of dropdowns) if (!d.root.contains(e.target as Node)) d.close(false);
  });
  return dropdowns;
}
