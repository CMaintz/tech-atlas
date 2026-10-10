import { LAB } from '../../lib/canvas-explorer';
import type { Engine } from '../../lib/canvas-explorer/engine';

export type Mode = 'flat' | 'depth';

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

export type Rig = { e: Engine; v: View; c: Cam };

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

export const TOOLBAR_ROOM_PX = 56;
export const midY = (h: number) => (h + TOOLBAR_ROOM_PX) / 2;
export const panelReserve = () => (window.innerWidth >= 1024 ? 416 : 0);
export const reducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const restingView = (mode: Mode) =>
  mode === 'depth'
    ? { yaw: 0.55, pitch: -0.28, focal: LAB.focal as number }
    : { yaw: 0, pitch: 0, focal: Infinity };
