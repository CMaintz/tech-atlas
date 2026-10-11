import { useRef, useState } from 'preact/hooks';
import { useDismiss } from '../../lib/use-dismiss';
import type { useTermPanel } from './use-term-panel';

export type Sel = { id: string; pinned: boolean; x: number; y: number };

export const canHover = () => matchMedia('(hover: hover)').matches;
const modified = (e: MouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0;

export function useSelection() {
  const [sel, setSel] = useState<Sel | null>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const open = (id: string, el: HTMLElement, pinned: boolean) => {
    const r = el.getBoundingClientRect();
    setSel({ id, pinned, x: r.left, y: r.bottom });
  };
  const clear = () => setSel(null);
  const dropPreviewKeepPinned = () => setSel((s) => (s?.pinned ? s : null));
  const inside = (t: HTMLElement) => !!popRef.current?.contains(t) || !!t.closest('[data-tl-item]');
  useDismiss(!!sel?.pinned, clear, inside);
  return { sel, popRef, open, clear, dropPreviewKeepPinned };
}

export type Selection = ReturnType<typeof useSelection>;
type Panel = ReturnType<typeof useTermPanel>;

const pinOrShowInPanel = (s: Selection, panel: Panel) => (id: string, e: MouseEvent) => {
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

export function itemHandlers(s: Selection, panel: Panel) {
  const click = pinOrShowInPanel(s, panel);
  const preview = (id: string, e: Event) => {
    if (!s.sel?.pinned) s.open(id, e.currentTarget as HTMLElement, false);
  };
  return (it: { id: string }) => ({
    onClick: (e: MouseEvent) => click(it.id, e),
    onMouseEnter: (e: MouseEvent) => {
      if (canHover()) preview(it.id, e);
    },
    onMouseLeave: s.dropPreviewKeepPinned,
    onFocus: (e: FocusEvent) => preview(it.id, e),
    onBlur: s.dropPreviewKeepPinned,
  });
}

export type ItemHandlers = ReturnType<ReturnType<typeof itemHandlers>>;
