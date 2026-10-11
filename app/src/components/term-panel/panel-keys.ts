import { arrowDir, isTyping } from '../../lib/key-intent';
import type { Panel } from './types';

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

function wrapTabWithinModal(e: KeyboardEvent, root: HTMLElement) {
  if (e.key !== 'Tab') return;
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.offsetParent !== null,
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

export const panelKeyHandler = (panel: Panel) => (e: KeyboardEvent) => {
  const root = panel.refs.root.current;
  if (panel.expanded && root) wrapTabWithinModal(e, root);
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const dir = arrowDir(e.key);
  if (!dir || isTyping(e.target as HTMLElement | null)) return;
  e.preventDefault();
  if (e.altKey) panel.nav.move(dir);
  else panel.nav.step(dir);
};
