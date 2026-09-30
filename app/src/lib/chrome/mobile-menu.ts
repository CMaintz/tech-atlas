/** The phone header's menu button: opens the nav, Esc or a click outside closes it. */
export function initMobileMenu() {
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const setOpen = (open: boolean) => {
    header?.toggleAttribute('data-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };
  toggle?.addEventListener('click', () => setOpen(!header?.hasAttribute('data-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.defaultPrevented && header?.hasAttribute('data-open')) {
      e.preventDefault(); // handled: the tour leaves this Escape alone
      setOpen(false);
      toggle?.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (header && !header.contains(e.target as Node)) setOpen(false);
  });
}
