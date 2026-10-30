import { useEffect } from 'preact/hooks';
import { listenAll } from './listen';

function listenForDismiss(dismiss: () => void, inside: (target: HTMLElement) => boolean) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') dismiss();
  };
  const onDown = (e: PointerEvent) => {
    if (!inside(e.target as HTMLElement)) dismiss();
  };
  return listenAll([
    [document, 'keydown', onKey],
    [document, 'pointerdown', onDown],
  ]);
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
