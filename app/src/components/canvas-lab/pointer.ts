import { orbitBy, panBy, zoomAt } from './camera';
import type { Rig } from './state';

type Point = { x: number; y: number };
type Drag = { id: number; node: number; x: number; y: number; moved: number; pan: boolean };

export type PointerHooks = {
  select: (id: string | null) => void;
  stopSpin: () => void;
  prefetch: (id: string) => void;
};

export class PointerControl {
  drag: Drag | null = null;
  private touches = new Map<number, Point>();
  private pinch: null | { d: number; x: number; y: number } = null;
  private listeners: [string, (ev: never) => void][];

  constructor(
    private el: HTMLCanvasElement,
    private rig: Rig,
    private hooks: PointerHooks,
  ) {
    this.listeners = [
      ['pointerdown', this.onDown],
      ['pointermove', this.onMove],
      ['pointerup', this.onUp],
      ['pointercancel', this.onUp],
      ['pointerleave', this.onLeave],
    ];
    for (const [type, fn] of this.listeners) el.addEventListener(type, fn as EventListener);
    el.addEventListener('wheel', this.onWheel, { passive: false });
  }

  detach() {
    for (const [type, fn] of this.listeners) this.el.removeEventListener(type, fn as EventListener);
    this.el.removeEventListener('wheel', this.onWheel);
  }

  private local(ev: PointerEvent | WheelEvent): Point {
    const r = this.el.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  private hit(p: Point) {
    return this.rig.e.grid.nearest(p.x, p.y);
  }

  private pinchState() {
    const [a, b] = [...this.touches.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  private onDown = (ev: PointerEvent) => {
    const p = this.local(ev);
    this.touches.set(ev.pointerId, p);
    if (this.touches.size === 2) {
      this.drag = null;
      this.pinch = this.pinchState();
    } else if (this.touches.size > 2) return;
    else this.press(ev, this.hit(p));
    this.el.setPointerCapture(ev.pointerId);
  };

  private press(ev: PointerEvent, node: number) {
    const pan = this.rig.v.mode === 'flat' || ev.shiftKey || ev.button !== 0;
    this.drag = { id: ev.pointerId, node, x: ev.clientX, y: ev.clientY, moved: 0, pan };
    if (node >= 0) this.rig.e.springing.delete(node);
  }

  private onMove = (ev: PointerEvent) => {
    if (this.touches.has(ev.pointerId)) this.touches.set(ev.pointerId, this.local(ev));
    if (this.pinch && this.touches.size === 2) this.pinchMove(this.pinch);
    else if (!this.drag) this.hover(this.local(ev));
    else this.dragMove(ev, this.drag);
  };

  private pinchMove(pinch: { d: number; x: number; y: number }) {
    const next = this.pinchState();
    this.rig.c.panX += next.x - pinch.x;
    this.rig.c.panY += next.y - pinch.y;
    zoomAt(this.rig, next, next.d / pinch.d);
    this.pinch = next;
  }

  private hover(p: Point) {
    const { el } = this;
    const { v, e } = this.rig;
    const hov = this.hit(p);
    if (hov === v.hover) return;
    v.hover = hov;
    v.dirty = true;
    el.style.cursor = hov >= 0 ? 'pointer' : v.mode === 'flat' ? 'grab' : 'move';
    if (hov >= 0) this.hooks.prefetch(e.ids[hov]);
  }

  private dragMove(ev: PointerEvent, drag: Drag) {
    const { e, v, c } = this.rig;
    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;
    [drag.x, drag.y] = [ev.clientX, ev.clientY];
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved < 5) return;
    if (drag.node >= 0) {
      e.ox[drag.node] += dx;
      e.oy[drag.node] += dy;
    } else if (drag.pan) panBy(c, dx, dy);
    else {
      if (v.spin) this.hooks.stopSpin();
      orbitBy(c, dx, dy);
    }
    v.dirty = true;
  }

  private onUp = (ev: PointerEvent) => {
    this.touches.delete(ev.pointerId);
    if (this.pinch) {
      if (this.touches.size < 2) this.pinch = null;
      return;
    }
    if (!this.drag) return;
    const { node, moved } = this.drag;
    this.drag = null;
    if (moved < 5) this.hooks.select(node >= 0 ? this.rig.e.ids[node] : null);
    else if (node >= 0) this.release(node);
  };

  private release(node: number) {
    const { e, v } = this.rig;
    if (v.reduced) {
      e.ox[node] = e.oy[node] = 0;
      v.dirty = true;
    } else {
      e.vx[node] = e.vy[node] = 0;
      e.springing.add(node);
    }
  }

  private onLeave = () => {
    const { v } = this.rig;
    if (v.hover < 0) return;
    v.hover = -1;
    v.dirty = true;
  };

  private onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    zoomAt(this.rig, this.local(ev), Math.exp(-ev.deltaY * 0.0012));
  };
}
