/**
 * Drag feedback for the Explorer's maps (A95): while the reader pans (2D, 3D) or orbits
 * (3D), the map's host carries `data-drag="pan" | "orbit"` (the page's CSS turns that
 * into a grabbing / rotate cursor) and a light ring with a crosshair follows the mouse
 * pointer. The ring has a light stroke and a dark outline, so it reads on the night map
 * and on any light background; under prefers-reduced-motion it appears without a fade.
 * Touch gets no ring (the finger covers it). Nothing here re-renders the map.
 */
import { EXPLORER } from './explorer-config';
import { listenAll, type Binding } from './listen';

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

type DragConfig = typeof EXPLORER.drag;

/** The ring's box: a circle centred on its position (the pointer), hidden until shown. */
export const ringBox = (size: number) =>
  ({
    position: 'absolute',
    left: '0',
    top: '0',
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: '5',
    opacity: '0',
    visibility: 'hidden',
  }) satisfies Partial<CSSStyleDeclaration>;

/**
 * The ring's paint: a light stroke with a dark outline and a crosshair. Colours follow
 * the page theme live (A92): global.css sets --drag-ring/--drag-outline (light stroke,
 * dark outline on the night map; the reverse on the cream map).
 */
export function ringPaint(cfg: DragConfig) {
  const colour = `var(--drag-ring, ${cfg.ringColour})`;
  const outline = `var(--drag-outline, ${cfg.ringOutline})`;
  const bar = `linear-gradient(${colour}, ${colour}) center`;
  return {
    border: `1.5px solid ${colour}`,
    boxShadow: `0 0 0 1px ${outline}, inset 0 0 0 1px ${outline}`,
    // The crosshair: two thin light bars through the centre.
    background: `${bar} / 1px 40% no-repeat, ${bar} / 40% 1px no-repeat`,
  } satisfies Partial<CSSStyleDeclaration>;
}

/** The ring, hidden, in the host (positioned so the ring can sit over it). */
function createRing(host: HTMLElement) {
  const ring = document.createElement('div');
  ring.setAttribute('aria-hidden', 'true');
  ring.dataset.dragRing = '';
  Object.assign(ring.style, ringBox(EXPLORER.drag.ringSize), ringPaint(EXPLORER.drag));
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(ring);
  return ring;
}

function showRing(ring: HTMLElement) {
  ring.style.transition = reduced() ? 'none' : `opacity ${EXPLORER.drag.fadeMs}ms ease-out`;
  ring.style.visibility = 'visible';
  ring.style.opacity = String(EXPLORER.drag.ringOpacity);
}

function hideRing(ring: HTMLElement) {
  ring.style.transition = 'none';
  ring.style.opacity = '0';
  ring.style.visibility = 'hidden';
}

/** The ring follows the mouse from `begin`, appearing once the drag passes the slop. */
function followPointer(host: HTMLElement, ring: HTMLElement) {
  let origin = { x: 0, y: 0 };
  // The host does not move during a drag: read its box once, never per pointer move.
  let at = { left: 0, top: 0 };
  const place = (e: { clientX: number; clientY: number }) => {
    ring.style.transform = `translate(${e.clientX - at.left}px, ${e.clientY - at.top}px)`;
  };
  const begin = (p: PointerLike) => {
    origin = { x: p.clientX, y: p.clientY };
    at = host.getBoundingClientRect();
    place(p);
  };
  const move = (e: PointerEvent) => {
    place(e);
    const hidden = ring.style.visibility === 'hidden';
    if (hidden && beyondSlop(e.clientX - origin.x, e.clientY - origin.y)) showRing(ring);
  };
  return { begin, move };
}

export function createDragFeedback(host: HTMLElement): DragFeedback {
  const ring = createRing(host);
  const follow = followPointer(host, ring);
  let active = false;
  let unlisten = () => {};
  const onMove = (e: PointerEvent) => {
    if (active) follow.move(e);
  };
  const end = () => {
    if (!active) return;
    active = false;
    delete host.dataset.drag;
    hideRing(ring);
    unlisten();
  };
  const start = (kind: DragKind, p: PointerLike) => {
    end();
    active = true;
    host.dataset.drag = kind;
    const ends: Binding[] = [
      [window, 'pointerup', end],
      [window, 'pointercancel', end],
      [window, 'blur', end],
    ];
    // Touch gets no ring (the finger covers it).
    const touch = p.pointerType === 'touch';
    if (!touch) follow.begin(p);
    unlisten = listenAll(touch ? ends : [...ends, [window, 'pointermove', onMove]]);
  };
  const destroy = () => {
    end();
    ring.remove();
  };
  return { start, end, destroy };
}
