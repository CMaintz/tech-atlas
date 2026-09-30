import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Inputs,
  type MutableRef,
} from 'preact/hooks';
import { useMedia } from './use-media';

/**
 * How much of the control bar fits: named domain pills and an open search field
 * when there is room, dot chips next, then short labels and a search icon, and — when
 * even that would wrap — the phones' "Controls" sheet. Measured, never a second row.
 */
export type BarSize = 'full' | 'medium' | 'compact' | 'sheet';
const SMALLER: Record<BarSize, BarSize> = {
  full: 'medium',
  medium: 'compact',
  compact: 'sheet',
  sheet: 'sheet',
};
/** Below this width the bar condenses into a "Controls" sheet. */
const NARROW = '(max-width: 767px)';

/** In-flow width a one-row bar needs: its children, their gaps, border and padding. */
function rowWidth(el: HTMLElement): number {
  const kids = [...el.children] as HTMLElement[];
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  const pad = el.offsetWidth - el.clientWidth + 12; // border + px-1.5 padding
  return (
    kids.reduce((w, k) => w + k.getBoundingClientRect().width, 0) + gap * (kids.length - 1) + pad
  );
}

/** Back to the fullest bar whenever the space it is centred in changes width. */
function useFullOnResize(slot: MutableRef<HTMLElement | null>, reset: () => void) {
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

/**
 * The bar's size: it starts from the fullest bar whenever its space (or `resetOn`)
 * changes, then steps down, before paint, while its one row overflows. `findOpen`: an
 * opened search field in a compact bar may overflow a little — never a sheet for it.
 */
export function useBarSize(findOpen: boolean, resetOn: Inputs) {
  const narrow = useMedia(NARROW);
  const bar = useRef<HTMLDivElement>(null);
  /** The space the bar is centred in (between the legend and the "i"). */
  const slot = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<BarSize>('full');
  useFullOnResize(slot, () => setSize('full'));
  useLayoutEffect(() => {
    const b = bar.current;
    if (size === 'sheet' || (size === 'compact' && findOpen)) return;
    // In-flow widths only: an open popover or result list must not shrink the bar.
    const room = slot.current?.clientWidth ?? 0;
    if (b && !narrow && room && rowWidth(b) > room + 1) setSize(SMALLER[size]);
  });
  useEffect(() => setSize('full'), resetOn);
  /** Phones, or a desktop bar too tight for one row: the "Controls" sheet. */
  return { bar, slot, size, sheet: narrow || size === 'sheet' };
}
