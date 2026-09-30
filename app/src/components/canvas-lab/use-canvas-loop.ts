/** Mount the canvas lab's loop, pointer and resize handling once the graph is in. */
import { useEffect } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import type { Engine } from '../../lib/canvas-explorer/engine';
import { fitCanvas } from './camera';
import { drawFrame, newFrame } from './frame';
import { startLoop } from './loop';
import { PointerControl, type PointerHooks } from './pointer';
import type { View } from './state';
import type { LabRefs } from './use-lab-state';

/** Follow the reduced-motion preference live; returns its stop. */
function watchReducedMotion(v: View) {
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  v.reduced = !!motionQuery?.matches;
  const onMotion = () => {
    v.reduced = !!motionQuery?.matches;
    v.dirty = true;
  };
  motionQuery?.addEventListener('change', onMotion);
  return () => motionQuery?.removeEventListener('change', onMotion);
}

/** Refit the canvas whenever its box changes (and now); returns its stop. */
function watchSize(el: HTMLCanvasElement, e: Engine, refs: LabRefs) {
  const resize = () => fitCanvas(el, e, refs.view.current, refs.cam.current);
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  return () => ro.disconnect();
}

/** The loop, pointer and observers, for one graph; everything stops on unmount. */
export function useCanvasLoop(
  refs: LabRefs,
  graph: Graph | null,
  families: string[],
  hooks: PointerHooks,
) {
  useEffect(() => {
    const el = refs.canvas.current;
    const e = refs.eng.current;
    if (!graph || !el || !e) return;
    const [v, c] = [refs.view.current, refs.cam.current];
    const stopMotion = watchReducedMotion(v);
    const stopSize = watchSize(el, e, refs);
    const frame = newFrame(el.getContext('2d')!, e, v, c);
    const pointer = new PointerControl(el, e, v, c, hooks);
    const draw = (now: number) => drawFrame(frame, now, refs.theme.current);
    const stopLoop = startLoop({ e, v, c, families, dragging: () => !!pointer.drag, draw });
    return () => {
      stopLoop();
      stopSize();
      stopMotion();
      pointer.detach();
    };
  }, [graph]);
}
