import { arrowDir, isTyping } from '../../lib/key-intent';
import type { Panel } from './types';

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

/** The focusable elements inside `root` that are actually rendered (not hidden). */
const visibleFocusables = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);

/** Keep Tab inside `root` (the expanded panel is a modal dialog): wrap at either end. */
function trapTab(e: KeyboardEvent, root: HTMLElement) {
  if (e.key !== 'Tab') return;
  const items = visibleFocusables(root);
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

/**
 * The panel's keys: Tab cycles inside it while expanded; ←/→ step through the
 * connections and Alt+←/→ go back/forward — while focus is in the panel, outside fields.
 * Widgets that use the arrows themselves (the facet tabs) handle them first and call
 * preventDefault.
 */
export const panelKeyHandler = (panel: Panel) => (e: KeyboardEvent) => {
  const root = panel.refs.root.current;
  if (panel.expanded && root) trapTab(e, root);
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const dir = arrowDir(e.key);
  if (!dir || isTyping(e.target as HTMLElement | null)) return;
  e.preventDefault();
  if (e.altKey) panel.nav.move(dir);
  else panel.nav.step(dir);
};
