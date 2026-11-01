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
const local: Store = () => localStorage;
const session: Store = () => sessionStorage;

const read = (store: Store, key: string) => {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
};

const write = (store: Store, key: string, value: string | null) => {
  try {
    if (value === null) store().removeItem(key);
    else store().setItem(key, value);
  } catch {
    return;
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

export const persistStep = (step: number | null) =>
  write(local, TOUR_KEY, step === null ? null : JSON.stringify({ active: true, step }));

export const recordEnd = (done: boolean) =>
  done ? write(local, TOUR_DONE_KEY, '1') : write(session, TOUR_SNOOZE_KEY, '1');

export const clearEnd = () => {
  write(local, TOUR_DONE_KEY, null);
  write(session, TOUR_SNOOZE_KEY, null);
};

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

export const pageHref = (
  langBase: string,
  to: string,
  carry: { step: number; storageOk: boolean },
) => langBase + to + (carry.storageOk ? '' : `?${TOUR_PARAM}=${carry.step}`);
