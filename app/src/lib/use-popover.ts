import type { RefObject } from 'preact';
import { useEffect, useState } from 'preact/hooks';

type Bar = { bar: RefObject<HTMLElement | null>; prefix: string };

function closeOnEscOrOutside<K extends string>({ bar, prefix }: Bar, open: K, close: () => void) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    e.preventDefault();
    close();
    bar.current?.querySelector<HTMLElement>(`[aria-controls="${prefix}${open}"]`)?.focus();
  };
  const onDown = (e: PointerEvent) => {
    if (!bar.current?.contains(e.target as Node)) close();
  };
  return listenKeyAndCapturedPointerDown(onKey, onDown);
}

export function usePopoverGroup<K extends string>(
  bar: RefObject<HTMLElement | null>,
  prefix: string,
) {
  const [open, setOpen] = useState<K | null>(null);
  useEffect(() => {
    if (!open) return;
    return closeOnEscOrOutside({ bar, prefix }, open, () => setOpen(null));
  }, [open]);
  return [open, setOpen] as const;
}

function listenKeyAndCapturedPointerDown(
  onKey: (e: KeyboardEvent) => void,
  onDown: (e: PointerEvent) => void,
) {
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', onDown, true);
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onDown, true);
  };
}
