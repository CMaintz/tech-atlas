import { useEffect, useState, type MutableRef } from 'preact/hooks';

/**
 * One open popover at a time among a bar's buttons, by key. It closes on Esc (focus back
 * on the button whose aria-controls is `${prefix}${key}`) or on a press outside the bar.
 */
export function usePopoverGroup<K extends string>(
  bar: MutableRef<HTMLElement | null>,
  prefix: string,
) {
  const [open, setOpen] = useState<K | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      e.preventDefault();
      setOpen(null);
      bar.current?.querySelector<HTMLElement>(`[aria-controls="${prefix}${open}"]`)?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(null);
    };
    return listen(onKey, onDown);
  }, [open]);
  return [open, setOpen] as const;
}

/** Window key and (capturing) pointer-down listeners; returns their removal. */
function listen(onKey: (e: KeyboardEvent) => void, onDown: (e: PointerEvent) => void) {
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', onDown, true);
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerdown', onDown, true);
  };
}
