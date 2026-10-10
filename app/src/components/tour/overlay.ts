import { useRef } from 'preact/hooks';
import { placeCard, scrollDelta, type Placement, type Rect } from '../../lib/tour';
import { FADE_MS, MOVE_MS, rectOf, reducedMotion, scrollSettled, viewport } from './dom';

export function useTourRefs() {
  return {
    root: useRef<HTMLDivElement>(null),
    spot: useRef<HTMLDivElement>(null),
    card: useRef<HTMLDivElement>(null),
    target: useRef<HTMLElement | null>(null),
    appeared: useRef(false),
    travelling: useRef(false),
    lastWrite: useRef(''),
    storageOk: useRef(true),
    opener: useRef<HTMLElement | null>(null),
  };
}

export type TourRefs = ReturnType<typeof useTourRefs>;

export function measure(r: TourRefs): Placement | null {
  const c = r.card.current;
  if (!c) return null;
  const el = r.target.current?.isConnected ? r.target.current : null;
  const size = { width: c.offsetWidth, height: c.offsetHeight };
  return placeCard(el ? rectOf(el) : null, size, viewport());
}

export function apply(r: TourRefs, p: Placement) {
  const s = r.spot.current;
  const c = r.card.current;
  if (!s || !c) return;
  const box = spotBox(p);
  const key = `${box.top}|${box.left}|${box.width}|${box.height}|${p.card.x}|${p.card.y}|${r.travelling.current}`;
  if (key === r.lastWrite.current) return;
  r.lastWrite.current = key;
  s.style.transform = `translate3d(${box.left}px, ${box.top}px, 0)`;
  s.style.width = `${box.width}px`;
  s.style.height = `${box.height}px`;
  s.toggleAttribute('data-ring', !!p.spot && box.height > 0);
  if (!r.travelling.current) c.style.transform = `translate3d(${p.card.x}px, ${p.card.y}px, 0)`;
}

function spotBox(p: Placement): Rect {
  const vp = viewport();
  return p.spot ?? { top: vp.height / 2, left: vp.width / 2, width: 0, height: 0 };
}

export function scrollIntoBand(el: HTMLElement, r: TourRefs): Promise<void> | null {
  const c = r.card.current;
  const card = { width: c?.offsetWidth ?? 352, height: Math.max(c?.offsetHeight ?? 0, 160) };
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const delta = scrollDelta(rectOf(el), card, {
    vp: viewport(),
    scroll: { y: window.scrollY, max },
  });
  if (Math.abs(delta) <= 1) return null;
  r.travelling.current = true;
  r.root.current?.setAttribute('data-travel', '');
  window.scrollBy({ top: delta, behavior: reducedMotion() ? 'auto' : 'smooth' });
  return scrollSettled();
}

export function glide(root: HTMLDivElement, r: TourRefs, p: Placement) {
  root.setAttribute('data-glide', '');
  apply(r, p);
  const t = setTimeout(() => {
    root.removeAttribute('data-glide');
    root.removeAttribute('data-busy');
  }, MOVE_MS + 40);
  return () => clearTimeout(t);
}

export function appear(root: HTMLDivElement, r: TourRefs, p: Placement) {
  apply(r, p);
  r.appeared.current = true;
  const raf = requestAnimationFrame(() => root.setAttribute('data-visible', ''));
  const t = setTimeout(() => root.removeAttribute('data-busy'), FADE_MS + 40);
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(t);
  };
}
