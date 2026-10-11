import {
  midY,
  panelReserve,
  restingView,
  TOOLBAR_ROOM_PX,
  type Cam,
  type Mode,
  type Rig,
} from './state';

export function fitCanvas(el: HTMLCanvasElement, { e, v, c }: Rig) {
  const r = el.getBoundingClientRect();
  c.dpr = Math.min(2, window.devicePixelRatio || 1);
  el.width = Math.max(1, Math.round(r.width * c.dpr));
  el.height = Math.max(1, Math.round(r.height * c.dpr));
  c.w = r.width;
  c.h = r.height;
  c.fit = Math.min((r.width * 0.92) / e.span.w, (r.height - TOOLBAR_ROOM_PX - 70) / e.span.h);
  c.tcx = (c.w - (v.selected >= 0 ? panelReserve() : 0)) / 2;
  if (!c.cx) c.cx = c.tcx;
  v.dirty = true;
}

export function zoomAt({ c, v }: Pick<Rig, 'c' | 'v'>, p: { x: number; y: number }, k0: number) {
  const next = Math.min(8, Math.max(0.3, c.zoom * k0));
  const k = next / c.zoom;
  c.panX = p.x - c.cx - (p.x - c.cx - c.panX) * k;
  c.panY = p.y - midY(c.h) - (p.y - midY(c.h) - c.panY) * k;
  c.zoom = next;
  c.focus = -1;
  v.dirty = true;
}

export function panBy(c: Cam, dx: number, dy: number) {
  c.panX += dx;
  c.panY += dy;
  c.focus = -1;
}

export function orbitBy(c: Cam, dx: number, dy: number) {
  c.yaw += dx * 0.006;
  c.tyaw = c.yaw;
  c.pitch = Math.max(-1.3, Math.min(1.3, c.pitch + dy * 0.005));
  c.tpitch = c.pitch;
}

export function enterMode(c: Cam, mode: Mode) {
  c.yaw = Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw));
  const to = restingView(mode);
  c.tyaw = to.yaw;
  c.tpitch = to.pitch;
  c.focal = to.focal;
}

export function resetCamera(c: Cam, mode: Mode) {
  c.zoom = 1;
  c.panX = c.panY = 0;
  c.focus = -1;
  if (mode === 'depth') {
    c.tyaw = restingView(mode).yaw;
    c.tpitch = restingView(mode).pitch;
  }
}

export function focusOn(c: Cam, i: number, glide: { ms: number; minZoom?: number }) {
  c.zoom = Math.max(c.zoom, glide.minZoom ?? c.zoom);
  c.focus = i;
  c.focusUntil = performance.now() + glide.ms;
}
