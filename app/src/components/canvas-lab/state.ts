/**
 * The canvas lab's loop state: what the view shows and where the camera is. Both
 * live in refs the rAF loop reads every frame, so the loop is never rebuilt.
 */
import { LAB } from '../../lib/canvas-explorer';

export type Mode = 'flat' | 'depth';

/** What the loop reads each frame (pushed from component state). */
export type View = {
  mode: Mode;
  showAll: boolean;
  spin: boolean;
  selected: number;
  hover: number;
  families: Set<string>;
  reduced: boolean;
  dirty: boolean;
};

/** The camera: current and target angles, zoom, pan, fit, size and a search focus. */
export type Cam = {
  yaw: number;
  pitch: number;
  tyaw: number;
  tpitch: number;
  zoom: number;
  panX: number;
  panY: number;
  fit: number;
  focal: number;
  w: number;
  h: number;
  dpr: number;
  cx: number;
  tcx: number;
  focus: number;
  focusUntil: number;
};

export const newView = (): View => ({
  mode: 'flat',
  showAll: false,
  spin: true,
  selected: -1,
  hover: -1,
  families: new Set<string>(),
  reduced: false,
  dirty: true,
});

export const newCam = (): Cam => ({
  yaw: 0,
  pitch: 0,
  tyaw: 0,
  tpitch: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  fit: 1,
  focal: Infinity,
  w: 1,
  h: 1,
  dpr: 1,
  cx: 0,
  tcx: 0,
  focus: -1,
  focusUntil: 0,
});

/** Room the floating toolbar takes at the top of the map (px); the map centres below it. */
export const TOP = 56;
export const midY = (h: number) => (h + TOP) / 2;
export const panelReserve = () => (window.innerWidth >= 1024 ? 416 : 0);
export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The camera's resting angles and perspective for a mode. */
export const modeView = (mode: Mode) =>
  mode === 'depth'
    ? { yaw: 0.55, pitch: -0.28, focal: LAB.focal as number }
    : { yaw: 0, pitch: 0, focal: Infinity };
