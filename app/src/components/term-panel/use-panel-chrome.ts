import type { RefObject } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { isField } from '../../lib/key-intent';
import type { PanelChrome } from './types';

function useReturnFocusToOpener(root: RefObject<HTMLElement | null>) {
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

function panelOwnsEscape(e: KeyboardEvent, root: HTMLElement | null): boolean {
  if (e.key !== 'Escape' || e.defaultPrevented) return false;
  if (document.querySelector('[data-tour-overlay]')) return false;
  if (document.querySelector('[data-map-popover]')) return false;
  const t = e.target as HTMLElement | null;
  const inPanel = !!t && !!root?.contains(t);
  return inPanel || !isField(t);
}

type EscapeLadder = { expanded: boolean; collapse: () => void; close: () => void };

function useEscapeLadder(root: RefObject<HTMLElement | null>, ladder: EscapeLadder) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!panelOwnsEscape(e, root.current)) return;
      e.preventDefault();
      if (ladder.expanded) ladder.collapse();
      else ladder.close();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [ladder.expanded, ladder.close]);
}

export function usePanelChrome(onClose: () => void): PanelChrome {
  const [expanded, setExpanded] = useState(false);
  const refs = {
    root: useRef<HTMLDivElement>(null),
    heading: useRef<HTMLHeadingElement>(null),
    expandBtn: useRef<HTMLButtonElement>(null),
  };
  useReturnFocusToOpener(refs.root);
  const collapse = () => {
    setExpanded(false);
    refs.expandBtn.current?.focus();
  };
  useEscapeLadder(refs.root, { expanded, collapse, close: onClose });
  return { expanded, setExpanded, refs };
}
