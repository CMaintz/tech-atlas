import { useEffect, useLayoutEffect } from 'preact/hooks';
import { bridgeSelectors, type TourScreen, type TourStep } from '../../lib/tour';
import { listenAll } from '../../lib/listen';
import { pageSettled, viaOf, waitForAnchor } from './dom';
import { appear, apply, glide, measure, scrollIntoBand, type TourRefs } from './overlay';
import type { Shown, TourNav, TourNavDeps } from './use-tour-nav';

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

function observeViewport(cb: () => void) {
  return listenAll([
    [window, 'scroll', cb, { capture: true, passive: true }],
    [window, 'resize', cb],
  ]);
}

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

export function useFollowTarget(active: boolean, r: TourRefs) {
  useEffect(() => {
    if (!active) return;
    const track = oncePerFrame(() => {
      const p = measure(r);
      if (p) apply(r, p);
    });
    const offs = [observeViewport(track.request), observeLayout(r, track.request)];
    return () => {
      track.cancel();
      offs.forEach((off) => off());
    };
  }, [active]);
}

type Moving = Extract<TourScreen, { kind: 'show' | 'bridge' }>;

const anchorsOf = (view: Moving, steps: TourStep[], langBase: string) =>
  view.kind === 'bridge'
    ? bridgeSelectors(langBase, steps[view.to].page ?? '')
    : steps[view.step].anchors;

type Move = { view: Moving; stale: () => boolean };

async function travel({ view, stale }: Move, d: TourNavDeps, nav: TourNav) {
  const anchors = anchorsOf(view, d.steps, d.langBase);
  const bridge = view.kind === 'bridge';
  const el = anchors.length ? await waitForAnchor(anchors, bridge, stale) : null;
  if (stale()) return;
  if (bridge && !el) return nav.leave(view.to, d.steps[view.to].page ?? '');
  if (!(await bringIntoView(el, d.refs, stale))) return;
  d.refs.target.current = el;
  d.setShown({ view, via: viaOf(el) });
}

async function bringIntoView(el: HTMLElement | null, r: TourRefs, stale: () => boolean) {
  if (!r.appeared.current) await pageSettled();
  if (stale()) return false;
  const scrolling = el && scrollIntoBand(el, r);
  if (scrolling) await scrolling;
  return !stale();
}

export function useTourMove(view: TourScreen, d: TourNavDeps, nav: TourNav) {
  const viewKey = JSON.stringify(view);
  useEffect(() => {
    if (view.kind !== 'show' && view.kind !== 'bridge') return;
    let stale = false;
    d.refs.root.current?.setAttribute('data-busy', '');
    void travel({ view, stale: () => stale }, d, nav);
    return () => {
      stale = true;
    };
  }, [viewKey]);
}

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
