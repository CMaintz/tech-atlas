/** Camera moves in the canvas lab (A91): fit, zoom, pan, reset and a search focus. */
import type { Engine } from '../../lib/canvas-explorer/engine';
import { midY, modeView, panelReserve, TOP, type Cam, type Mode, type View } from './state';

/** Size the canvas to its box (device pixels) and fit the map below the toolbar. */
export function fitCanvas(el: HTMLCanvasElement, e: Engine, v: View, c: Cam) {
  const r = el.getBoundingClientRect();
  c.dpr = Math.min(2, window.devicePixelRatio || 1);
  el.width = Math.max(1, Math.round(r.width * c.dpr));
  el.height = Math.max(1, Math.round(r.height * c.dpr));
  c.w = r.width;
  c.h = r.height;
  c.fit = Math.min((r.width * 0.92) / e.span.w, (r.height - TOP - 70) / e.span.h);
  c.tcx = (c.w - (v.selected >= 0 ? panelReserve() : 0)) / 2;
  if (!c.cx) c.cx = c.tcx;
  v.dirty = true;
}

/** Zoom by `k` about the screen point `p`: the point under it stays put. */
export function zoomAt(c: Cam, v: View, p: { x: number; y: number }, k0: number) {
  const next = Math.min(8, Math.max(0.3, c.zoom * k0));
  const k = next / c.zoom;
  c.panX = p.x - c.cx - (p.x - c.cx - c.panX) * k;
  c.panY = p.y - midY(c.h) - (p.y - midY(c.h) - c.panY) * k;
  c.zoom = next;
  c.focus = -1;
  v.dirty = true;
}

/** Pan by a screen delta (ends a search focus glide). */
export function panBy(c: Cam, dx: number, dy: number) {
  c.panX += dx;
  c.panY += dy;
  c.focus = -1;
}

/** Orbit by a drag delta: yaw freely, pitch within ± 1.3 rad. */
export function orbitBy(c: Cam, dx: number, dy: number) {
  c.yaw += dx * 0.006;
  c.tyaw = c.yaw;
  c.pitch = Math.max(-1.3, Math.min(1.3, c.pitch + dy * 0.005));
  c.tpitch = c.pitch;
}

/** A mode switch eases the camera to that mode's view (a click keeps your orbit). */
export function enterMode(c: Cam, mode: Mode) {
  // Unwind auto-rotation, so going back to Flat never spins through many turns.
  c.yaw = Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw));
  const to = modeView(mode);
  c.tyaw = to.yaw;
  c.tpitch = to.pitch;
  c.focal = to.focal;
}

/** Reset view: zoom 1, no pan, and in Depth the resting angles again. */
export function resetCamera(c: Cam, mode: Mode) {
  c.zoom = 1;
  c.panX = c.panY = 0;
  c.focus = -1;
  if (mode === 'depth') {
    c.tyaw = modeView(mode).yaw;
    c.tpitch = modeView(mode).pitch;
  }
}

/** Glide term `i` to the middle of the view over `ms`, zoomed in to at least `zoom`. */
export function focusOn(c: Cam, i: number, ms: number, zoom = c.zoom) {
  c.zoom = Math.max(c.zoom, zoom);
  c.focus = i;
  c.focusUntil = performance.now() + ms;
}
