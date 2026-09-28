import type { MutableRef } from 'preact/hooks';
import { moveTo, type TourScreen, type TourStep } from '../../lib/tour';
import { FADE_MS, reducedMotion, type Via } from './dom';
import type { TourRefs } from './overlay';
import { pageHref, persistStep, recordEnd } from './persistence';

export type Shown = { view: TourScreen; via: Via };

export type TourNavDeps = {
  steps: TourStep[];
  langBase: string;
  page: string | null;
  refs: TourRefs;
  /** The latest view, readable from listeners registered once. */
  viewRef: MutableRef<TourScreen>;
  setView: (v: TourScreen) => void;
  setShown: (s: Shown | null) => void;
};

/**
 * Moving through the tour: `go` to a step (pointing at the link first when the step is
 * forward on another page), `leave` for the page that holds a step, `finish` it.
 */
export function useTourNav(d: TourNavDeps) {
  const finish = (markDone: boolean) => {
    persistStep(null);
    recordEnd(markDone);
    returnFocus(d.refs);
    // Fade out rather than vanish: this stops the step logic; the overlay stays until faded.
    d.setView({ kind: 'off' });
    d.viewRef.current = { kind: 'off' };
    fadeOut(d.refs, () => clearOverlay(d));
  };
  const leave = (step: number, to: string) => {
    persistStep(step);
    d.refs.root.current?.setAttribute('data-leaving', '');
    const href = pageHref(d.langBase, to, step, d.refs.storageOk.current);
    if (reducedMotion()) location.href = href;
    else setTimeout(() => (location.href = href), FADE_MS);
  };
  const go = (to: number) => {
    const cur = d.viewRef.current;
    const move = moveTo(d.steps, to, d.page);
    if (move.kind === 'finish') return finish(true);
    if (move.kind === 'go') {
      // Forward onto another page: first point at the link that goes there.
      if (cur.kind === 'show' && to > cur.step)
        return d.setView({ kind: 'bridge', from: cur.step, to });
      return leave(move.step, move.page);
    }
    persistStep(move.step);
    d.setView({ kind: 'show', step: move.step });
  };
  return { finish, leave, go };
}

export type TourNav = ReturnType<typeof useTourNav>;

/** Focus goes back to the "Take the tour" control, or to the main content. */
function returnFocus(r: TourRefs) {
  const back = r.opener.current?.isConnected ? r.opener.current : document.getElementById('main');
  back?.focus({ preventScroll: true });
  r.opener.current = null;
}

/** Run `off` once the overlay has faded out (at once if it never showed, or without motion). */
function fadeOut(r: TourRefs, off: () => void) {
  if (!r.appeared.current || reducedMotion()) return off();
  r.root.current?.setAttribute('data-leaving', '');
  setTimeout(off, FADE_MS);
}

/** Take the overlay down — unless the tour was restarted while it faded out. */
function clearOverlay(d: TourNavDeps) {
  if (d.viewRef.current.kind !== 'off') {
    d.refs.root.current?.removeAttribute('data-leaving');
    return;
  }
  d.setShown(null);
  d.refs.appeared.current = false;
  d.refs.target.current = null;
  d.refs.lastWrite.current = '';
}
