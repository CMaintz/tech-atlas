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
  viewRef: MutableRef<TourScreen>;
  setView: (v: TourScreen) => void;
  setShown: (s: Shown | null) => void;
};

function makeFinish(d: TourNavDeps) {
  return (markDone: boolean) => {
    persistStep(null);
    recordEnd(markDone);
    returnFocus(d.refs);
    d.setView({ kind: 'off' });
    d.viewRef.current = { kind: 'off' };
    fadeOut(d.refs, () => clearOverlay(d));
  };
}

function makeLeave(d: TourNavDeps) {
  return (step: number, to: string) => {
    persistStep(step);
    d.refs.root.current?.setAttribute('data-leaving', '');
    const href = pageHref(d.langBase, to, { step, storageOk: d.refs.storageOk.current });
    if (reducedMotion()) location.href = href;
    else setTimeout(() => (location.href = href), FADE_MS);
  };
}

type Finish = ReturnType<typeof makeFinish>;
type Leave = ReturnType<typeof makeLeave>;

function makeGo(d: TourNavDeps, finish: Finish, leave: Leave) {
  return (to: number) => {
    const cur = d.viewRef.current;
    const move = moveTo(d.steps, to, d.page);
    if (move.kind === 'finish') return finish(true);
    if (move.kind === 'go') {
      if (cur.kind === 'show' && to > cur.step)
        return d.setView({ kind: 'bridge', from: cur.step, to });
      return leave(move.step, move.page);
    }
    persistStep(move.step);
    d.setView({ kind: 'show', step: move.step });
  };
}

export function useTourNav(d: TourNavDeps) {
  const finish = makeFinish(d);
  const leave = makeLeave(d);
  const go = makeGo(d, finish, leave);
  return { finish, leave, go };
}

export type TourNav = ReturnType<typeof useTourNav>;

function returnFocus(r: TourRefs) {
  const back = r.opener.current?.isConnected ? r.opener.current : document.getElementById('main');
  back?.focus({ preventScroll: true });
  r.opener.current = null;
}

function fadeOut(r: TourRefs, off: () => void) {
  if (!r.appeared.current || reducedMotion()) return off();
  r.root.current?.setAttribute('data-leaving', '');
  setTimeout(off, FADE_MS);
}

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
