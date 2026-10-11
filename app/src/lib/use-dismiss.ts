import { useEffect } from 'preact/hooks';
import { listen } from './listen';

function listenForDismiss(dismiss: () => void, inside: (target: HTMLElement) => boolean) {
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
}

export function useDismiss(
  active: boolean,
  dismiss: () => void,
  inside: (target: HTMLElement) => boolean,
) {
  useEffect(() => {
    if (!active) return;
    return listenForDismiss(dismiss, inside);
  }, [active]);
}
