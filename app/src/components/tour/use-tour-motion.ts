import { useEffect, useLayoutEffect } from 'preact/hooks';
import { bridgeSelectors, type TourScreen, type TourStep } from '../../lib/tour';
import { listen } from '../../lib/listen';
import { pageSettled, viaOf, waitForAnchor } from './dom';
import { appear, apply, glide, measure, scrollIntoBand, type TourRefs } from './overlay';
import type { Shown, TourNav, TourNavDeps } from './use-tour-nav';

/** `fn` at most once per animation frame, however often it is requested. */
function oncePerFrame(fn: () => void) {
  let raf = 0;
  const request = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      fn();
    });
  };
  return { request, cancel: () => cancelAnimationFrame(raf) };
}

/** Call `cb` when the page, the card or the target changes size. Returns the cleanup. */
function observeLayout(r: TourRefs, cb: () => void) {
  const ro = new ResizeObserver(cb);
  ro.observe(document.documentElement);
  if (r.card.current) ro.observe(r.card.current);
  const observeTarget = setInterval(() => {
    if (r.target.current?.isConnected) ro.observe(r.target.current);
  }, 500);
  return () => {
    clearInterval(observeTarget);
    ro.disconnect();
  };
}

/** Follow the target while the page scrolls, resizes or reflows: one measurement per frame. */
export function useFollowTarget(active: boolean, r: TourRefs) {
  useEffect(() => {
    if (!active) return;
    const track = oncePerFrame(() => {
      const p = measure(r);
      if (p) apply(r, p);
    });
    const offs = [
      listen(window, 'scroll', track.request, { capture: true, passive: true }),
      listen(window, 'resize', track.request),
      observeLayout(r, track.request),
    ];
    return () => {
      track.cancel();
      offs.forEach((off) => off());
    };
  }, [active]);
}

type Moving = Extract<TourScreen, { kind: 'show' | 'bridge' }>;

/** The selectors a screen points at: its step's anchors, or (a bridge) the link onwards. */
const anchorsOf = (view: Moving, steps: TourStep[], langBase: string) =>
  view.kind === 'bridge'
    ? bridgeSelectors(langBase, steps[view.to].page ?? '')
    : steps[view.step].anchors;

/**
 * Let the page settle (before the tour's first card) and scroll `el` into the card's
 * band. Resolves false as soon as the move has gone `stale()`.
 */
async function bringIntoView(el: HTMLElement | null, r: TourRefs, stale: () => boolean) {
  if (!r.appeared.current) await pageSettled();
  if (stale()) return false;
  const scrolling = el && scrollIntoBand(el, r);
  if (scrolling) await scrolling;
  return !stale();
}

/**
 * One move: find the target, scroll it into view, then hand the view to the card (the
 * glide runs once the new text has rendered). Gives up as soon as `stale()`.
 */
async function travel(view: Moving, d: TourNavDeps, nav: TourNav, stale: () => boolean) {
  const anchors = anchorsOf(view, d.steps, d.langBase);
  const bridge = view.kind === 'bridge';
  const el = anchors.length ? await waitForAnchor(anchors, bridge, stale) : null;
  if (stale()) return;
  // Nothing nearby leads there: a card pointing at nothing is just an extra click.
  if (bridge && !el) return nav.leave(view.to, d.steps[view.to].page ?? '');
  if (!(await bringIntoView(el, d.refs, stale))) return;
  d.refs.target.current = el;
  d.setShown({ view, via: viaOf(el) });
}

/** Each move: find the target, scroll it into view, then glide there. */
export function useTourMove(view: TourScreen, d: TourNavDeps, nav: TourNav) {
  const viewKey = JSON.stringify(view);
  useEffect(() => {
    if (view.kind !== 'show' && view.kind !== 'bridge') return;
    let stale = false;
    // Marks a move in progress (until the glide or fade-in ends) — also a test hook.
    d.refs.root.current?.setAttribute('data-busy', '');
    void travel(view, d, nav, () => stale);
    return () => {
      stale = true;
    };
  }, [viewKey]);
}

/** The card now shows the new step: measure it and glide (or fade in on arrival). */
export function useTourReveal(shown: Shown | null, r: TourRefs) {
  useLayoutEffect(() => {
    if (!shown) return;
    const root = r.root.current;
    const p = measure(r);
    if (!root || !p) return;
    r.travelling.current = false;
    root.removeAttribute('data-travel');
    const cleanup = r.appeared.current ? glide(root, r, p) : appear(root, r, p);
    r.card.current?.focus({ preventScroll: true });
    return cleanup;
  }, [shown]);
}
