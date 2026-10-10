type MenuParts = { header: HTMLElement | null; toggle: HTMLButtonElement | null };
type SetOpen = (open: boolean) => void;

function openSetter({ header, toggle }: MenuParts): SetOpen {
  return (open) => {
    header?.toggleAttribute('data-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };
}

function closeOnEscape(e: KeyboardEvent, { header, toggle }: MenuParts, setOpen: SetOpen) {
  if (e.key === 'Escape' && !e.defaultPrevented && header?.hasAttribute('data-open')) {
    e.preventDefault(); // handled: the tour leaves this Escape alone
    setOpen(false);
    toggle?.focus();
  }
}

export function initMobileMenu() {
  const parts: MenuParts = {
    header: document.querySelector<HTMLElement>('[data-site-header]'),
    toggle: document.querySelector<HTMLButtonElement>('[data-menu-toggle]'),
  };
  const { header, toggle } = parts;
  const setOpen = openSetter(parts);
  toggle?.addEventListener('click', () => setOpen(!header?.hasAttribute('data-open')));
  document.addEventListener('keydown', (e) => closeOnEscape(e, parts, setOpen));
  document.addEventListener('click', (e) => {
    if (header && !header.contains(e.target as Node)) setOpen(false);
  });
}
