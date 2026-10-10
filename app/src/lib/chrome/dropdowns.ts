export type Dropdown = { root: HTMLElement; close: (refocus: boolean) => void };
type OpenAt = 'first' | 'last' | 'current';

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

export function moveIndex(key: string, i: number, count: number): number | null {
  const move = MOVES.get(key);
  return move ? (move(i, count) + count) % count : null;
}

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

type Menu = {
  root: HTMLElement;
  button: HTMLButtonElement;
  list: HTMLElement;
  items: HTMLElement[];
};

function closer(m: Menu) {
  return (refocus: boolean) => {
    if (m.list.hidden) return;
    m.list.hidden = true;
    m.button.setAttribute('aria-expanded', 'false');
    if (refocus) m.button.focus();
  };
}

function opener(m: Menu, all: Dropdown[]) {
  return (at: OpenAt) => {
    for (const d of all) if (d.root !== m.root) d.close(false);
    m.list.hidden = false;
    m.button.setAttribute('aria-expanded', 'true');
    const current = m.items.findIndex(
      (i) => i.getAttribute('aria-checked') === 'true' || i.hasAttribute('aria-current'),
    );
    m.items[openIndex(at, current, m.items.length)]?.focus();
  };
}

function openFromArrowKey(e: KeyboardEvent, open: (at: OpenAt) => void) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  open(e.key === 'ArrowDown' ? 'first' : 'last');
}

function makeDropdown(root: HTMLElement, all: Dropdown[]): Dropdown | null {
  const button = root.querySelector<HTMLButtonElement>('[data-dropdown-button]');
  const list = root.querySelector<HTMLElement>('[role="menu"]');
  if (!button || !list) return null;
  const m: Menu = {
    root,
    button,
    list,
    items: [...list.querySelectorAll<HTMLElement>('[role^="menuitem"]')],
  };
  const close = closer(m);
  const open = opener(m, all);
  button.addEventListener('click', () => (list.hidden ? open('current') : close(false)));
  button.addEventListener('keydown', (e) => openFromArrowKey(e, open));
  list.addEventListener('keydown', (e) => onMenuKey(e, m.items, close));
  return { root, close };
}

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
