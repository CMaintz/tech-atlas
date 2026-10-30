export interface TourStep<T = string> {
  page: string | null;
  anchors: string[];
  title: T;
  body: T;
  via?: T;
}

export interface TourState {
  active: boolean;
  step: number;
}

export const TOUR_KEY = 'atlas.tour';
export const TOUR_DONE_KEY = 'atlas.tour.done';
export const TOUR_SNOOZE_KEY = 'atlas.tour.snoozed';

export function parseTourState(raw: string | null, stepCount: number): TourState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<TourState>;
    if (
      v.active === true &&
      typeof v.step === 'number' &&
      Number.isInteger(v.step) &&
      v.step >= 0 &&
      v.step < stepCount
    ) {
      return { active: true, step: v.step };
    }
  } catch {
    return null;
  }
  return null;
}

export function pageOf(pathname: string, langRoot: string): string | null {
  const root = langRoot.endsWith('/') ? langRoot : `${langRoot}/`;
  let path: string;
  try {
    path = decodeURIComponent(pathname).replace(/index\.html$/, '');
  } catch {
    return null; // malformed escape (e.g. a stray '%')
  }
  if (!path.endsWith('/')) path += '/';
  return path.startsWith(root) ? path.slice(root.length) : null;
}

export type TourView =
  /** Show step `step` on this page. */
  | { kind: 'show'; step: number }
  /** A tour is running but its step lives on another page: offer to continue. */
  | { kind: 'resume'; step: number }
  | { kind: 'off' };

export function resolveTour(opts: {
  steps: readonly TourStep<unknown>[];
  state: TourState | null;
  done: boolean;
  snoozed: boolean;
  page: string | null;
  autoStart: boolean;
}): TourView {
  const { steps, state, done, snoozed, page, autoStart } = opts;
  if (state?.active) return runningView(steps, state.step, page);
  if (autoStart && !done && !snoozed && steps.length > 0) return { kind: 'show', step: 0 };
  return { kind: 'off' };
}

function runningView(
  steps: readonly TourStep<unknown>[],
  step: number,
  page: string | null,
): TourView {
  const s = steps[step];
  if (!s) return { kind: 'off' };
  return s.page === null || s.page === page ? { kind: 'show', step } : { kind: 'resume', step };
}

export type TourScreen = TourView | { kind: 'bridge'; from: number; to: number };

export function cardModel(screen: TourScreen | undefined, stepCount: number) {
  const bridge = screen?.kind === 'bridge' ? screen : null;
  const step = screen?.kind === 'show' ? screen.step : bridge ? bridge.from : 0;
  const welcome = !bridge && step === 0;
  const last = !bridge && step === stepCount - 1;
  return { step, bridge, welcome, last, textStep: bridge ? bridge.to : step };
}

export function moveTo(
  steps: readonly TourStep<unknown>[],
  to: number,
  page: string | null,
):
  { kind: 'finish' } | { kind: 'stay'; step: number } | { kind: 'go'; step: number; page: string } {
  if (to < 0 || to >= steps.length) return { kind: 'finish' };
  const target = steps[to].page;
  return target === null || target === page
    ? { kind: 'stay', step: to }
    : { kind: 'go', step: to, page: target };
}

export const TOUR_PARAM = 'tour';

export function stepFromQuery(search: string, stepCount: number): number | null {
  const raw = new URLSearchParams(search).get(TOUR_PARAM);
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n < stepCount ? n : null;
}

export const fillCount = (template: string, n: number, m: number) =>
  template.replace('{n}', String(n)).replace('{m}', String(m));

export { nearViewport, placeCard, scrollDelta, type Placement, type Rect } from './tour-placement';

export const NAV_PAGES: readonly string[] = ['', 'explorer/', 'timeline/', 'compare/', 'study/'];

export function bridgeSelectors(langBase: string, page: string): string[] {
  const href = `${langBase}${page}`.replace(/["\\]/g, '\\$&');
  return [
    `#site-nav a[href="${href}"]`,
    `main a[href="${href}"]`,
    `header a[href="${href}"]`,
    ...(NAV_PAGES.includes(page) ? ['[data-menu-toggle]'] : []),
  ];
}

export function needsBridge(
  steps: readonly TourStep<unknown>[],
  { from, to }: { from: number; to: number },
  page: string | null,
): boolean {
  const move = moveTo(steps, to, page);
  return move.kind === 'go' && to > from;
}
