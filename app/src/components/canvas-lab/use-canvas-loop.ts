import { useEffect, type MutableRef } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import type { MapTheme } from '../../lib/graph-style';
import { fitCanvas } from './camera';
import { drawFrame, newFrame } from './frame';
import { startLoop } from './loop';
import { PointerControl, type PointerHooks } from './pointer';
import type { Rig, View } from './state';
import type { LabRefs } from './use-lab-state';

export type LoopWiring = { allFamilies: string[]; hooks: PointerHooks };
type Mounting = LoopWiring & { theme: MutableRef<MapTheme> };

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

function watchSize(el: HTMLCanvasElement, rig: Rig) {
  const resize = () => fitCanvas(el, rig);
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  resize();
  return () => ro.disconnect();
}

export function useCanvasLoop(refs: LabRefs, graph: Graph | null, wiring: LoopWiring) {
  useEffect(() => {
    const el = refs.canvas.current;
    const e = refs.eng.current;
    if (!graph || !el || !e) return;
    const rig = { e, v: refs.view.current, c: refs.cam.current };
    return mountLoop(el, rig, { ...wiring, theme: refs.theme });
  }, [graph]);
}

function mountLoop(el: HTMLCanvasElement, rig: Rig, m: Mounting) {
  const ctx = el.getContext('2d');
  if (!ctx) throw new Error('canvas lab: no 2D context for the map canvas');
  const stopMotion = watchReducedMotion(rig.v);
  const stopSize = watchSize(el, rig);
  const frame = newFrame(ctx, rig);
  const pointer = new PointerControl(el, rig, m.hooks);
  const draw = (now: number) => drawFrame(frame, now, m.theme.current);
  const dragging = () => !!pointer.drag;
  const stopLoop = startLoop({ ...rig, allFamilies: m.allFamilies, dragging, draw });
  return () => {
    stopLoop();
    stopSize();
    stopMotion();
    pointer.detach();
  };
}
