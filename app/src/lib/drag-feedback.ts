import { EXPLORER } from './explorer-config';
import { listenAll, type Binding } from './listen';

export type DragKind = 'pan' | 'orbit';

export type Press = {
  button: number;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export function orbitDragKind(p: Press): DragKind | null {
  if (p.button === 2) return 'pan';
  if (p.button !== 0) return null;
  return p.ctrlKey || p.metaKey || p.shiftKey ? 'pan' : 'orbit';
}

const beyondSlop = (dx: number, dy: number, slop = EXPLORER.drag.slopPx) =>
  dx * dx + dy * dy > slop * slop;

type PointerLike = { clientX: number; clientY: number; pointerType?: string };

export type DragFeedback = {
  start(kind: DragKind, at: PointerLike): void;
  end(): void;
  destroy(): void;
};

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type DragConfig = typeof EXPLORER.drag;

const ringBox = (size: number) =>
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

function ringPaint(cfg: DragConfig) {
  const colour = `var(--drag-ring, ${cfg.ringColour})`;
  const outline = `var(--drag-outline, ${cfg.ringOutline})`;
  const bar = `linear-gradient(${colour}, ${colour}) center`;
  const crosshair = `${bar} / 1px 40% no-repeat, ${bar} / 40% 1px no-repeat`;
  return {
    border: `1.5px solid ${colour}`,
    boxShadow: `0 0 0 1px ${outline}, inset 0 0 0 1px ${outline}`,
    background: crosshair,
  } satisfies Partial<CSSStyleDeclaration>;
}

function createHiddenRing(host: HTMLElement) {
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

function followPointer(host: HTMLElement, ring: HTMLElement) {
  let origin = { x: 0, y: 0 };
  let hostBox = { left: 0, top: 0 };
  const place = (e: { clientX: number; clientY: number }) => {
    ring.style.transform = `translate(${e.clientX - hostBox.left}px, ${e.clientY - hostBox.top}px)`;
  };
  const begin = (p: PointerLike) => {
    origin = { x: p.clientX, y: p.clientY };
    hostBox = host.getBoundingClientRect();
    place(p);
  };
  const move = (e: PointerEvent) => {
    place(e);
    const hidden = ring.style.visibility === 'hidden';
    if (hidden && beyondSlop(e.clientX - origin.x, e.clientY - origin.y)) showRing(ring);
  };
  return { begin, move };
}

type Drag = {
  host: HTMLElement;
  ring: HTMLElement;
  follow: ReturnType<typeof followPointer>;
  active: boolean;
  unlisten: () => void;
};

function endDrag(d: Drag) {
  if (!d.active) return;
  d.active = false;
  delete d.host.dataset.drag;
  hideRing(d.ring);
  d.unlisten();
}

function dragBindings(d: Drag, touch: boolean): Binding[] {
  const end = () => endDrag(d);
  const ends: Binding[] = [
    [window, 'pointerup', end],
    [window, 'pointercancel', end],
    [window, 'blur', end],
  ];
  const onMove = (e: PointerEvent) => {
    if (d.active) d.follow.move(e);
  };
  return touch ? ends : [...ends, [window, 'pointermove', onMove]];
}

function startDrag(d: Drag, kind: DragKind, p: PointerLike) {
  endDrag(d);
  d.active = true;
  d.host.dataset.drag = kind;
  const touch = p.pointerType === 'touch';
  if (!touch) d.follow.begin(p);
  d.unlisten = listenAll(dragBindings(d, touch));
}

export function createDragFeedback(host: HTMLElement): DragFeedback {
  const ring = createHiddenRing(host);
  const follow = followPointer(host, ring);
  const d: Drag = { host, ring, follow, active: false, unlisten: () => {} };
  const destroy = () => {
    endDrag(d);
    ring.remove();
  };
  return { start: (kind, p) => startDrag(d, kind, p), end: () => endDrag(d), destroy };
}
