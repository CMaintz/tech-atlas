import { useCallback, useEffect, useMemo, useRef, useState, type MutableRef } from 'preact/hooks';
import { EXPLORER } from './explorer-config';
import { matchesMedia } from './use-media';
import type { Point } from './use-explorer-maps';

type CardDelay = {
  shown: MutableRef<boolean>;
  timer: MutableRef<number>;
  setCard: (card: Point | null) => void;
  finePointer: boolean;
};

function restartCardDelay(d: CardDelay, hit: Point | null) {
  window.clearTimeout(d.timer.current);
  if (d.shown.current) {
    d.shown.current = false;
    d.setCard(null);
  }
  if (!hit || !d.finePointer) return;
  d.timer.current = window.setTimeout(() => {
    d.shown.current = true;
    d.setCard(hit);
  }, EXPLORER.hoverCardMs);
}

export function useHoverCard() {
  const [card, setCard] = useState<Point | null>(null);
  const shown = useRef(false);
  const timer = useRef(0);
  const finePointer = useMemo(() => matchesMedia('(hover: hover) and (pointer: fine)'), []);
  const onPoint = useCallback(
    (hit: Point | null) => restartCardDelay({ shown, timer, setCard, finePointer }, hit),
    [],
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { card, onPoint };
}
