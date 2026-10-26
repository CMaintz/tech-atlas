import type { RefObject } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState, type Inputs } from 'preact/hooks';
import { useMedia } from './use-media';

export type BarSize = 'full' | 'medium' | 'compact' | 'sheet';
const SMALLER: Record<BarSize, BarSize> = {
  full: 'medium',
  medium: 'compact',
  compact: 'sheet',
  sheet: 'sheet',
};
const SHEET_WIDTH_QUERY = '(max-width: 767px)';

function oneRowWidth(el: HTMLElement): number {
  const kids = [...el.children] as HTMLElement[];
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  const pad = el.offsetWidth - el.clientWidth + 12; // border + px-1.5 padding
  return (
    kids.reduce((w, k) => w + k.getBoundingClientRect().width, 0) + gap * (kids.length - 1) + pad
  );
}

function useFullOnResize(slot: RefObject<HTMLElement | null>, reset: () => void) {
  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      reset();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
}

export function useBarSize(findOpen: boolean, resetOn: Inputs) {
  const narrow = useMedia(SHEET_WIDTH_QUERY);
  const bar = useRef<HTMLDivElement>(null);
  const slot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<BarSize>('full');
  useFullOnResize(slot, () => setSize('full'));
  useLayoutEffect(() => {
    const b = bar.current;
    if (size === 'sheet' || (size === 'compact' && findOpen)) return;
    const room = slot.current?.clientWidth ?? 0;
    if (b && !narrow && room && oneRowWidth(b) > room + 1) setSize(SMALLER[size]);
  });
  useEffect(() => setSize('full'), resetOn);
  return { bar, slot, size, sheet: narrow || size === 'sheet' };
}
