/**
 * The tour's DOM side: finding the element a step points at, waiting for the page to
 * settle, and measuring. Placement itself is pure (lib/tour-placement.ts).
 */
import { nearViewport, type Rect } from '../../lib/tour';

/** How long to wait for an anchor rendered by a client-only island (the Explorer). */
const ANCHOR_WAIT_MS = 3000;
/** Longest a smooth scroll may take before the spotlight moves anyway. */
const SCROLL_WAIT_MS = 1200;
/** Keep in step with the CSS (`--tour-move`, `--tour-fade` in global.css). */
export const MOVE_MS = 420;
export const FADE_MS = 260;

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};
export const viewport = () => ({
  width: document.documentElement.clientWidth,
  height: window.innerHeight,
});

/** The first visible match of `anchors` (in order); with `near`, only one close to the viewport. */
export const findAnchor = (anchors: string[], near: boolean) => {
  for (const sel of anchors) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.getClientRects().length === 0) continue; // hidden (e.g. the phone nav)
      if (near && !nearViewport(rectOf(el), window.innerHeight)) continue;
      return el;
    }
  }
  return null;
};

/** What a bridge card points at: the phone menu button, or a link. */
export const viaOf = (el: Element | null) => (el?.matches('[data-menu-toggle]') ? 'menu' : 'link');
export type Via = ReturnType<typeof viaOf>;

/** Poll once per frame (cheaper than observing the whole DOM) until found or timed out. */
export async function waitForAnchor(anchors: string[], near: boolean, stale: () => boolean) {
  const until = performance.now() + ANCHOR_WAIT_MS;
  for (;;) {
    const el = findAnchor(anchors, near);
    if (el || stale() || performance.now() > until) return el;
    await frame();
  }
}

/** Resolve when a smooth scroll has come to rest (scrollend, or 4 still frames). */
export async function scrollSettled() {
  const until = performance.now() + SCROLL_WAIT_MS;
  let ended = false;
  const onEnd = () => (ended = true);
  window.addEventListener('scrollend', onEnd, { once: true });
  let last = window.scrollY;
  let still = 0;
  await frame();
  while (!ended && still < 4 && performance.now() < until) {
    await frame();
    still = window.scrollY === last ? still + 1 : 0;
    last = window.scrollY;
  }
  window.removeEventListener('scrollend', onEnd);
}

/** On arrival, let fonts and hydrating islands settle before measuring anything. */
export async function pageSettled() {
  await Promise.race([document.fonts?.ready, wait(600)]);
  await new Promise<void>((r) =>
    'requestIdleCallback' in window
      ? requestIdleCallback(() => r(), { timeout: 600 })
      : setTimeout(r, 50),
  );
  await frame();
}
