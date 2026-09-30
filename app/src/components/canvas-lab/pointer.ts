/**
 * The canvas lab's pointer: grab a node (elastic), orbit or pan the camera,
 * pinch-zoom with two fingers, wheel-zoom, hover, and click to select.
 */
import type { Engine } from '../../lib/canvas-explorer/engine';
import { orbitBy, panBy, zoomAt } from './camera';
import type { Cam, View } from './state';

type Point = { x: number; y: number };
type Drag = { id: number; node: number; x: number; y: number; moved: number; pan: boolean };

/** What the pointer asks of the component. */
export type PointerHooks = {
  select: (id: string | null) => void;
  stopSpin: () => void;
  prefetch: (id: string) => void;
};

export class PointerControl {
  /** The current press (null while pinching or up). */
  drag: Drag | null = null;
  private touches = new Map<number, Point>();
  private pinch: null | { d: number; x: number; y: number } = null;
  private listeners: [string, (ev: never) => void][];

  constructor(
    private el: HTMLCanvasElement,
    private e: Engine,
    private v: View,
    private c: Cam,
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
    const { e } = this;
    return e.grid.nearest(p.x, p.y, e.sx, e.sy, e.dr, e.order);
  }

  /** Two fingers down: pinch-zoom about their centre (and pan with it). */
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

  /** A press: on a node it grabs the node, else it pans (Flat, Shift, other buttons) or orbits. */
  private press(ev: PointerEvent, node: number) {
    const pan = this.v.mode === 'flat' || ev.shiftKey || ev.button !== 0;
    this.drag = { id: ev.pointerId, node, x: ev.clientX, y: ev.clientY, moved: 0, pan };
    if (node >= 0) this.e.springing.delete(node);
  }

  private onMove = (ev: PointerEvent) => {
    if (this.touches.has(ev.pointerId)) this.touches.set(ev.pointerId, this.local(ev));
    if (this.pinch && this.touches.size === 2) this.pinchMove(this.pinch);
    else if (!this.drag) this.hover(this.local(ev));
    else this.dragMove(ev, this.drag);
  };

  private pinchMove(pinch: { d: number; x: number; y: number }) {
    const next = this.pinchState();
    this.c.panX += next.x - pinch.x;
    this.c.panY += next.y - pinch.y;
    zoomAt(this.c, this.v, next, next.d / pinch.d);
    this.pinch = next;
  }

  private hover(p: Point) {
    const { v, el } = this;
    const hov = this.hit(p);
    if (hov === v.hover) return;
    v.hover = hov;
    v.dirty = true;
    el.style.cursor = hov >= 0 ? 'pointer' : v.mode === 'flat' ? 'grab' : 'move';
    if (hov >= 0) this.hooks.prefetch(this.e.ids[hov]);
  }

  /** Past 5 px of travel: pull the node, pan, or orbit. */
  private dragMove(ev: PointerEvent, drag: Drag) {
    const dx = ev.clientX - drag.x;
    const dy = ev.clientY - drag.y;
    [drag.x, drag.y] = [ev.clientX, ev.clientY];
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (drag.moved < 5) return;
    if (drag.node >= 0) {
      this.e.ox[drag.node] += dx;
      this.e.oy[drag.node] += dy;
    } else if (drag.pan) panBy(this.c, dx, dy);
    else {
      // As in the demo: taking hold of the view stops the auto-rotation.
      if (this.v.spin) this.hooks.stopSpin();
      orbitBy(this.c, dx, dy);
    }
    this.v.dirty = true;
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
    if (moved < 5) this.hooks.select(node >= 0 ? this.e.ids[node] : null);
    else if (node >= 0) this.release(node);
  };

  /** Let go of a pulled node: it springs back (or snaps, with reduced motion). */
  private release(node: number) {
    const { e, v } = this;
    if (v.reduced) {
      e.ox[node] = e.oy[node] = 0;
      v.dirty = true;
    } else {
      e.vx[node] = e.vy[node] = 0;
      e.springing.add(node);
    }
  }

  private onLeave = () => {
    if (this.v.hover < 0) return;
    this.v.hover = -1;
    this.v.dirty = true;
  };

  private onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    zoomAt(this.c, this.v, this.local(ev), Math.exp(-ev.deltaY * 0.0012));
  };
}
