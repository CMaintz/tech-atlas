import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { isField } from '../../lib/key-intent';
import type { PanelChrome } from './types';

/** Remember what had focus before the panel opened, and give it back on close. */
function useRestoreFocus(root: RefObject<HTMLElement>) {
  const opener = useRef<Element | null>(null);
  useEffect(() => {
    const active = document.activeElement;
    opener.current = active && !root.current?.contains(active) ? active : null;
    return () => {
      const back = opener.current as HTMLElement | null;
      if (back && back !== document.body && back.isConnected) back.focus();
    };
  }, []);
}

/**
 * Whether an Escape press is the panel's: not while a tour card or a map popover (the
 * Explorer's control bar) is open, and not when typed in a field elsewhere on the page.
 */
function escapeIsPanels(e: KeyboardEvent, root: HTMLElement | null): boolean {
  if (e.key !== 'Escape' || e.defaultPrevented) return false;
  if (document.querySelector('[data-tour-overlay]')) return false;
  if (document.querySelector('[data-map-popover]')) return false;
  const t = e.target as HTMLElement | null;
  const inPanel = !!t && !!root?.contains(t);
  return inPanel || !isField(t);
}

/**
 * Esc: expanded → docked → closed. Listened for in the capture phase, so it runs before
 * the tour's document-level handler: while a tour card is open, Esc belongs to the tour
 * alone. (Expectation for Tour.tsx: it should call e.preventDefault() when it consumes
 * Escape, so other handlers that check `defaultPrevented` stand down.)
 */
function useEscape(
  root: RefObject<HTMLElement>,
  expanded: boolean,
  collapse: () => void,
  onClose: () => void,
) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!escapeIsPanels(e, root.current)) return;
      e.preventDefault();
      if (expanded) collapse();
      else onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [expanded, onClose]);
}

/**
 * The panel's window behaviour: docked beside the map or expanded over the page, focus
 * given back to the opener on close, and Escape stepping expanded → docked → closed.
 */
export function usePanelChrome(onClose: () => void): PanelChrome {
  const [expanded, setExpanded] = useState(false);
  const refs = {
    root: useRef<HTMLDivElement>(null),
    heading: useRef<HTMLHeadingElement>(null),
    expandBtn: useRef<HTMLButtonElement>(null),
  };
  useRestoreFocus(refs.root);
  const collapse = () => {
    setExpanded(false);
    refs.expandBtn.current?.focus();
  };
  useEscape(refs.root, expanded, collapse, onClose);
  return { expanded, setExpanded, refs };
}
