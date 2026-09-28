import { useEffect, useRef, useState } from 'preact/hooks';
import type { Chip } from '../../lib/timeline-layout';
import { useDismiss } from '../../lib/use-dismiss';
import { canHover } from './use-selection';

/** The open "+N" list: which chip's terms, where, and whether it is pinned. */
export type More = { key: string; ids: string[]; pinned: boolean; x: number; y: number };

/** Grace period for the pointer to move from a chip into its list. */
const LEAVE_MS = 180;

/**
 * The "+N" chip list: a preview on hover, pinned on click (then Escape or a click
 * outside closes it). Closed whenever the chart changes (`resetOn`: zoom, domains).
 */
export function useMoreList(resetOn: unknown[]) {
  const [more, setMore] = useState<More | null>(null);
  const timer = useRef<number>();
  const hold = () => clearTimeout(timer.current);
  const open = (chip: Chip, el: HTMLElement, pinned: boolean) => {
    hold();
    const r = el.getBoundingClientRect();
    setMore({ key: chip.key, ids: chip.ids, pinned, x: r.left, y: r.bottom });
  };
  const leave = () => {
    hold();
    timer.current = window.setTimeout(() => setMore((m) => (m?.pinned ? m : null)), LEAVE_MS);
  };
  const close = () => setMore(null);
  useEffect(close, resetOn);
  useDismiss(!!more?.pinned, close, (t) => !!t.closest('[data-tl-more]'));
  return { more, open, leave, hold, close };
}

export type MoreList = ReturnType<typeof useMoreList>;

/** A "+N" chip's handlers: hover previews its list, a click pins it (or closes it again). */
export function chipHandlers(chip: Chip, list: MoreList) {
  const { more } = list;
  const pinned = more?.key === chip.key && more.pinned;
  return {
    onClick: (e: MouseEvent) =>
      pinned ? list.close() : list.open(chip, e.currentTarget as HTMLElement, true),
    onMouseEnter: (e: MouseEvent) => {
      if (!more?.pinned && canHover()) list.open(chip, e.currentTarget as HTMLElement, false);
    },
    onMouseLeave: list.leave,
  };
}
