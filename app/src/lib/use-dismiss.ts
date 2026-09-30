import { useEffect } from 'preact/hooks';
import { listen } from './listen';

/**
 * While `active` (a pinned popover is open), Escape or a pointer-down outside it calls
 * `dismiss`. `inside` says whether a pointer-down target belongs to the popover (or to
 * the control that opened it).
 */
export function useDismiss(
  active: boolean,
  dismiss: () => void,
  inside: (target: HTMLElement) => boolean,
) {
  useEffect(() => {
    if (!active) return;
    const offKey = listen<KeyboardEvent>(document, 'keydown', (e) => {
      if (e.key === 'Escape') dismiss();
    });
    const offDown = listen<PointerEvent>(document, 'pointerdown', (e) => {
      if (!inside(e.target as HTMLElement)) dismiss();
    });
    return () => {
      offKey();
      offDown();
    };
  }, [active]);
}
