import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EXPLORER } from './explorer-config';
import { matchesMedia } from './use-media';
import type { Point } from './use-explorer-maps';

/**
 * The hover card: a term under a resting mouse pointer (never on touch), shown after
 * `EXPLORER.hoverCardMs`. `onPoint` is the maps' pointer callback (null = moved away).
 */
export function useHoverCard() {
  const [card, setCard] = useState<Point | null>(null);
  const shown = useRef(false);
  const timer = useRef(0);
  const finePointer = useMemo(() => matchesMedia('(hover: hover) and (pointer: fine)'), []);
  const onPoint = useCallback((hit: Point | null) => {
    window.clearTimeout(timer.current);
    if (shown.current) {
      shown.current = false;
      setCard(null);
    }
    if (!hit || !finePointer) return;
    timer.current = window.setTimeout(() => {
      shown.current = true;
      setCard(hit);
    }, EXPLORER.hoverCardMs);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { card, onPoint };
}
