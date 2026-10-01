import { useRef, useState } from 'preact/hooks';
import { pageOf, type TourScreen, type TourStep } from '../../lib/tour';
import { useTourRefs } from './overlay';
import { useBridgeLinks, useTourBoot, useTourEscape } from './use-tour-listeners';
import { useFollowTarget, useTourMove, useTourReveal } from './use-tour-motion';
import { useTourNav, type Shown, type TourNav, type TourNavDeps } from './use-tour-nav';

type EffectsInput = {
  view: TourScreen;
  shown: Shown | null;
  dontShow: boolean;
  autoStart: boolean;
  deps: TourNavDeps;
  nav: TourNav;
};

/**
 * What the tour does on its own: start on load, keep the card on its target, travel to
 * each new step and reveal it, follow bridge links, and close on Escape.
 */
function useTourEffects({ view, shown, dontShow, autoStart, deps, nav }: EffectsInput) {
  useTourBoot(deps, nav, autoStart);
  useFollowTarget(shown !== null, deps.refs);
  useTourMove(view, deps, nav);
  useTourReveal(shown, deps.refs);
  useBridgeLinks(shown, deps, nav);
  useTourEscape(view, dontShow, deps.refs.card, nav.finish);
}

/**
 * The tour's state and behaviour: `view` is where the tour is heading; `shown` is what
 * the card shows — it lags `view` while the page scrolls to the next target.
 */
export function useTour(steps: TourStep[], langBase: string, autoStart: boolean) {
  const [view, setView] = useState<TourScreen>({ kind: 'off' });
  const [shown, setShown] = useState<Shown | null>(null);
  const [dontShow, setDontShow] = useState(false);
  const refs = useTourRefs();
  const viewRef = useRef(view);
  viewRef.current = view;
  const page = typeof location === 'undefined' ? null : pageOf(location.pathname, langBase);
  const deps: TourNavDeps = { steps, langBase, page, refs, viewRef, setView, setShown };
  const nav = useTourNav(deps);
  useTourEffects({ view, shown, dontShow, autoStart, deps, nav });
  return { view, setView, shown, dontShow, setDontShow, refs, ...nav };
}

export type Tour = ReturnType<typeof useTour>;
