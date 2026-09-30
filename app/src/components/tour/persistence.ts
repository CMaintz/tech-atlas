/**
 * Where the tour keeps its place between page loads. Storage can be missing or throw
 * (private mode, blocked site data). The tour then carries its step across page loads
 * in the URL (?tour=N) instead, and never auto-starts — it could not remember being
 * dismissed.
 */
import {
  TOUR_DONE_KEY,
  TOUR_KEY,
  TOUR_PARAM,
  TOUR_SNOOZE_KEY,
  parseTourState,
  resolveTour,
  stepFromQuery,
  type TourStep,
  type TourView,
} from '../../lib/tour';

type Store = () => Storage;
export const local: Store = () => localStorage;
export const session: Store = () => sessionStorage;

export const read = (store: Store, key: string) => {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
};

/** Set `key` (or remove it, for null); silently not persisted when storage fails. */
export const write = (store: Store, key: string, value: string | null) => {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {
    /* not persisted */
  }
};

export const storageWorks = () => {
  try {
    localStorage.setItem('atlas.probe', '1');
    localStorage.removeItem('atlas.probe');
    return true;
  } catch {
    return false;
  }
};

/** Remember the running tour's step (null: no tour running). */
export const persistStep = (step: number | null) =>
  write(local, TOUR_KEY, step === null ? null : JSON.stringify({ active: true, step }));

/** Record how the tour ended: done for good, or snoozed for this session. */
export const recordEnd = (done: boolean) =>
  done ? write(local, TOUR_DONE_KEY, '1') : write(session, TOUR_SNOOZE_KEY, '1');

/** "Take the tour" clears both, so the tour starts afresh. */
export const clearEnd = () => {
  write(local, TOUR_DONE_KEY, null);
  write(session, TOUR_SNOOZE_KEY, null);
};

/**
 * What to show on this page load. A step carried in the URL (storage unavailable) wins
 * over stored state, and is dropped from the URL.
 */
export function initialView(steps: TourStep[], page: string | null, autoStart: boolean): TourView {
  const fromUrl = stepFromQuery(location.search, steps.length);
  if (fromUrl !== null) dropStepFromUrl();
  return resolveTour({
    steps,
    state:
      fromUrl !== null
        ? { active: true, step: fromUrl }
        : parseTourState(read(local, TOUR_KEY), steps.length),
    done: read(local, TOUR_DONE_KEY) === '1',
    snoozed: read(session, TOUR_SNOOZE_KEY) === '1',
    page,
    autoStart,
  });
}

function dropStepFromUrl() {
  const clean = new URL(location.href);
  clean.searchParams.delete(TOUR_PARAM);
  history.replaceState(history.state, '', clean);
}

/** The URL of `to` (relative to `langBase`), carrying `step` when storage can't. */
export const pageHref = (langBase: string, to: string, step: number, storageOk: boolean) =>
  langBase + to + (storageOk ? '' : `?${TOUR_PARAM}=${step}`);
