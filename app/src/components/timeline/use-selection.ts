import { useRef, useState } from 'preact/hooks';
import { useDismiss } from '../../lib/use-dismiss';
import type { useTermPanel } from './use-term-panel';

/** The term whose summary popover is up: a preview on hover/focus, pinned on click. */
export type Sel = { id: string; pinned: boolean; x: number; y: number };

/** Whether the device has a real hover (not a tap that emulates one). */
export const canHover = () => matchMedia('(hover: hover)').matches;
const modified = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0;

/**
 * The summary popover's state: which term, where (below the term's element) and whether
 * it is pinned. A pinned popover closes on Escape or a click outside it and the terms.
 */
export function useSelection() {
  const [sel, setSel] = useState<Sel | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const open = (id: string, el: HTMLElement, pinned: boolean) => {
    const r = el.getBoundingClientRect();
    setSel({ id, pinned, x: r.left, y: r.bottom });
  };
  const clear = () => setSel(null);
  /** Drop a hover/focus preview; a pinned popover stays. */
  const unpreview = () => setSel((s) => (s?.pinned ? s : null));
  const inside = (t: HTMLElement) => !!popRef.current?.contains(t) || !!t.closest('[data-tl-item]');
  useDismiss(!!sel?.pinned, clear, inside);
  return { sel, popRef, open, clear, unpreview };
}

export type Selection = ReturnType<typeof useSelection>;
type Panel = ReturnType<typeof useTermPanel>;

/**
 * A term link's handlers: hover or focus previews its summary; a click pins it and
 * starts loading the term panel — or, once the panel is loaded, shows the term there.
 */
export function itemHandlers(s: Selection, panel: Panel) {
  const click = (id: string, e: MouseEvent) => {
    if (modified(e)) return;
    e.preventDefault();
    if (panel.kit) {
      s.clear();
      panel.setId(id);
    } else if (s.sel?.id === id && s.sel.pinned) {
      s.clear();
    } else {
      s.open(id, e.currentTarget as HTMLElement, true);
      panel.open(id);
    }
  };
  const preview = (id: string, e: Event) => {
    if (!s.sel?.pinned) s.open(id, e.currentTarget as HTMLElement, false);
  };
  return (it: { id: string }) => ({
    onClick: (e: MouseEvent) => click(it.id, e),
    onMouseEnter: (e: MouseEvent) => {
      if (canHover()) preview(it.id, e);
    },
    onMouseLeave: s.unpreview,
    onFocus: (e: FocusEvent) => preview(it.id, e),
    onBlur: s.unpreview,
  });
}

export type ItemHandlers = ReturnType<ReturnType<typeof itemHandlers>>;
