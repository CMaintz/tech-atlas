/**
 * Drag feedback for the Explorer's maps (A95): while the reader pans (2D, 3D) or orbits
 * (3D), the map's host carries `data-drag="pan" | "orbit"` (the page's CSS turns that
 * into a grabbing / rotate cursor) and a light ring with a crosshair follows the mouse
 * pointer. The ring has a light stroke and a dark outline, so it reads on the night map
 * and on any light background; under prefers-reduced-motion it appears without a fade.
 * Touch gets no ring (the finger covers it). Nothing here re-renders the map.
 */
import { EXPLORER } from './explorer-config';

export type DragKind = 'pan' | 'orbit';

/** Buttons and modifiers of the press that started a drag. */
export type Press = {
  button: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

/**
 * What a 3D drag does, as three.js OrbitControls maps it: the left button orbits (with
 * Ctrl, ⌘ or Shift it pans), the right button pans, the middle button zooms (no ring).
 */
export function orbitDragKind(p: Press): DragKind | null {
  if (p.button === 2) return 'pan';
  if (p.button !== 0) return null;
  return p.ctrlKey || p.metaKey || p.shiftKey ? 'pan' : 'orbit';
}

/** A drag that has not moved this far (px) is still a click: no feedback yet. */
export const beyondSlop = (dx: number, dy: number, slop = EXPLORER.drag.slopPx) =>
  dx * dx + dy * dy > slop * slop;

type PointerLike = { clientX: number; clientY: number; pointerType?: string };

export type DragFeedback = {
  /** A drag of this kind began at this pointer event (ignored for touch). */
  start(kind: DragKind, at: PointerLike): void;
  end(): void;
  destroy(): void;
};

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createDragFeedback(host: HTMLElement): DragFeedback {
  const cfg = EXPLORER.drag;
  const ring = document.createElement('div');
  ring.setAttribute('aria-hidden', 'true');
  ring.dataset.dragRing = '';
  const size = cfg.ringSize;
  Object.assign(ring.style, {
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    borderRadius: '50%',
    border: `1.5px solid ${cfg.ringColour}`,
    boxShadow: `0 0 0 1px ${cfg.ringOutline}, inset 0 0 0 1px ${cfg.ringOutline}`,
    // The crosshair: two thin light bars through the centre.
    background: `linear-gradient(${cfg.ringColour}, ${cfg.ringColour}) center / 1px 40% no-repeat, linear-gradient(${cfg.ringColour}, ${cfg.ringColour}) center / 40% 1px no-repeat`,
    pointerEvents: 'none',
    zIndex: '5',
    opacity: '0',
    visibility: 'hidden',
  } satisfies Partial<CSSStyleDeclaration>);
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(ring);

  let active = false;
  let origin = { x: 0, y: 0 };
  const place = (e: { clientX: number; clientY: number }) => {
    const r = host.getBoundingClientRect();
    ring.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
  };
  const onMove = (e: PointerEvent) => {
    if (!active) return;
    place(e);
    if (ring.style.visibility === 'hidden' && beyondSlop(e.clientX - origin.x, e.clientY - origin.y))
      show();
  };
  const show = () => {
    ring.style.transition = reduced() ? 'none' : `opacity ${cfg.fadeMs}ms ease-out`;
    ring.style.visibility = 'visible';
    ring.style.opacity = String(cfg.ringOpacity);
  };
  const end = () => {
    if (!active) return;
    active = false;
    delete host.dataset.drag;
    ring.style.transition = 'none';
    ring.style.opacity = '0';
    ring.style.visibility = 'hidden';
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    window.removeEventListener('blur', end);
  };

  return {
    start(kind, at) {
      end();
      active = true;
      host.dataset.drag = kind;
      origin = { x: at.clientX, y: at.clientY };
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      window.addEventListener('blur', end);
      if (at.pointerType === 'touch') return;
      place(at);
      window.addEventListener('pointermove', onMove);
    },
    end,
    destroy() {
      end();
      ring.remove();
    },
  };
}
