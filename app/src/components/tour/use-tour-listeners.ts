import { useEffect, type MutableRef } from 'preact/hooks';
import { listen } from '../../lib/listen';
import { isTypingTarget } from '../../lib/prefs';
import { bridgeSelectors, pageOf, type TourScreen } from '../../lib/tour';
import { findAnchor, viaOf } from './dom';
import type { TourRefs } from './overlay';
import { clearEnd, initialView, storageWorks } from './persistence';
import type { Shown, TourNav, TourNavDeps } from './use-tour-nav';

/** A click on any `[data-tour-start]` element (re)starts the tour from the welcome card. */
function startOnClick(e: Event, r: TourRefs, go: (step: number) => void) {
  const t = (e.target as Element | null)?.closest?.<HTMLElement>('[data-tour-start]');
  if (!t) return;
  e.preventDefault();
  r.opener.current = t;
  clearEnd();
  go(0);
}

/** Decide what to show on load; listen for "Take the tour". */
export function useTourBoot(d: TourNavDeps, nav: TourNav, autoStart: boolean) {
  useEffect(() => {
    d.refs.storageOk.current = storageWorks();
    d.setView(initialView(d.steps, d.page, autoStart && d.refs.storageOk.current));
    const offStart = listen(document, 'click', (e) => startOnClick(e, d.refs, nav.go));
    // Back from the next page via the bfcache: undo the fade-out that preceded leaving.
    const offShow = listen<PageTransitionEvent>(window, 'pageshow', (e) => {
      if (e.persisted) d.refs.root.current?.removeAttribute('data-leaving');
    });
    return () => {
      offStart();
      offShow();
    };
  }, []);
}

/** Whether a click follows a plain link to the page `dest`. */
function followsLinkTo(e: MouseEvent, langBase: string, dest: string | null) {
  const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey)
    return false;
  return pageOf(new URL(a.href, location.href).pathname, langBase) === dest;
}

/** When the phone menu opens or closes, point the bridge card at what now leads on. */
function retargetOnMenu(shown: Shown, d: TourNavDeps, dest: string) {
  const header = document.querySelector('[data-site-header]');
  const mo = new MutationObserver(() => {
    const el = findAnchor(bridgeSelectors(d.langBase, dest), true);
    if (!el || el === d.refs.target.current) return;
    d.refs.target.current = el;
    d.setShown({ view: shown.view, via: viaOf(el) });
  });
  if (header) mo.observe(header, { attributes: true, attributeFilter: ['data-open'] });
  return () => mo.disconnect();
}

/**
 * While a bridge card is up: a click on any link to the next page continues the tour
 * (with the fade and the ?tour carry), and opening the phone menu retargets the link.
 */
export function useBridgeLinks(shown: Shown | null, d: TourNavDeps, nav: TourNav) {
  useEffect(() => {
    if (shown?.view.kind !== 'bridge') return;
    const { to } = shown.view;
    const dest = d.steps[to].page;
    const onClick = (e: MouseEvent) => {
      if (!followsLinkTo(e, d.langBase, dest)) return;
      e.preventDefault();
      nav.leave(to, dest ?? '');
    };
    const offClick = listen(document, 'click', onClick, { capture: true });
    const offMenu = retargetOnMenu(shown, d, dest ?? '');
    return () => {
      offClick();
      offMenu();
    };
  }, [shown]);
}

/** Whether an Escape press is the tour's to handle. */
function closesTour(e: KeyboardEvent, card: HTMLElement | null) {
  if (e.key !== 'Escape' || e.defaultPrevented) return false;
  // Let a field (the search box) and an open mobile menu have their Escape first.
  const t = e.target as HTMLElement | null;
  if (isTypingTarget(t) && !card?.contains(t)) return false;
  return !document.querySelector('[data-site-header][data-open]');
}

/** Escape ends the tour (on the welcome card, honouring "don't show again"). */
export function useTourEscape(
  view: TourScreen,
  dontShow: boolean,
  card: MutableRef<HTMLDivElement | null>,
  finish: TourNav['finish'],
) {
  useEffect(() => {
    if (view.kind !== 'show' && view.kind !== 'bridge') return;
    return listen<KeyboardEvent>(document, 'keydown', (e) => {
      if (!closesTour(e, card.current)) return;
      e.preventDefault(); // handled: other Escape listeners (the Explorer's panel) stand down
      finish(view.kind === 'show' && view.step === 0 ? dontShow : false);
    });
  }, [view, dontShow]);
}
