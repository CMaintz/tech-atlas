import { useRef, useState } from 'preact/hooks';
import { pageOf, type TourScreen, type TourStep } from '../../lib/tour';
import { useTourRefs } from './overlay';
import { useBridgeLinks, useTourBoot, useTourEscape } from './use-tour-listeners';
import { useFollowTarget, useTourMove, useTourReveal } from './use-tour-motion';
import { useTourNav, type Shown, type TourNavDeps } from './use-tour-nav';

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
  useTourBoot(deps, nav, autoStart);
  useFollowTarget(shown !== null, refs);
  useTourMove(view, deps, nav);
  useTourReveal(shown, refs);
  useBridgeLinks(shown, deps, nav);
  useTourEscape(view, dontShow, refs.card, nav.finish);
  return { view, setView, shown, dontShow, setDontShow, refs, ...nav };
}

export type Tour = ReturnType<typeof useTour>;
