/**
 * The guided tour (A61) — pure logic. The tour spans several static pages, so its
 * position lives in localStorage and every page load decides afresh what to show.
 */

export interface TourStep<T = string> {
  /**
   * The page the step belongs to, relative to the language root ('' = home,
   * 'study/' …). `null` = any page (the welcome card).
   */
  page: string | null;
  /** CSS selectors to spotlight, tried in order; none found → a centred card. */
  anchors: string[];
  title: T;
  body: T;
  /**
   * Required when the step lives on a different page from the one before it: the
   * card that points at the link leading there ("Next: the Explorer").
   */
  via?: T;
}

/** Persisted position of a running tour. */
export interface TourState {
  active: boolean;
  step: number;
}

export const TOUR_KEY = 'atlas.tour';
/** Set when the tour is finished or the reader chose "don't show again". */
export const TOUR_DONE_KEY = 'atlas.tour.done';
/** Session-only: the welcome card was closed ("not now"), so don't auto-start again. */
export const TOUR_SNOOZE_KEY = 'atlas.tour.snoozed';

/** Parse a stored state; anything malformed means "no tour running". */
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
    /* fall through */
  }
  return null;
}

/**
 * The current page relative to the language root: `/en/study/` with root
 * `/en/` → `study/`. Always ends in '/' unless it is the home page (''),
 * so `/study`, `/study/` and `/study/index.html` agree. Outside the root → null.
 */
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

/** Decide what the tour shows on a page load. */
export function resolveTour(opts: {
  steps: readonly TourStep<unknown>[];
  state: TourState | null;
  done: boolean;
  snoozed: boolean;
  page: string | null;
  /** Auto-start the welcome card for a first-time visitor (false on e.g. the 404 page). */
  autoStart: boolean;
}): TourView {
  const { steps, state, done, snoozed, page, autoStart } = opts;
  if (state?.active) return runningView(steps, state.step, page);
  if (autoStart && !done && !snoozed && steps.length > 0) return { kind: 'show', step: 0 };
  return { kind: 'off' };
}

/** A running tour at `step`: shown if the step lives on this page, else offered to resume. */
function runningView(
  steps: readonly TourStep<unknown>[],
  step: number,
  page: string | null,
): TourView {
  const s = steps[step];
  if (!s) return { kind: 'off' };
  return s.page === null || s.page === page ? { kind: 'show', step } : { kind: 'resume', step };
}

/** A running tour, plus the "this link takes you there" card shown before a page change. */
export type TourScreen = TourView | { kind: 'bridge'; from: number; to: number };

/**
 * What the card shows for a screen: its step (a bridge card counts as the step it
 * leaves from), whether that is the welcome card or the last step, and whose title and
 * body it uses (`textStep`: a bridge card's come from the step it leads to).
 */
export function cardModel(screen: TourScreen | undefined, stepCount: number) {
  const bridge = screen?.kind === 'bridge' ? screen : null;
  const step = screen?.kind === 'show' ? screen.step : bridge ? bridge.from : 0;
  const welcome = !bridge && step === 0;
  const last = !bridge && step === stepCount - 1;
  return { step, bridge, welcome, last, textStep: bridge ? bridge.to : step };
}

/**
 * Where moving to step `to` takes the reader: stay on this page, go to another, or
 * finish (past either end).
 */
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

/**
 * Query parameter that carries the tour's step across a page load when storage is
 * unavailable (private mode, blocked site data): `?tour=4`.
 */
export const TOUR_PARAM = 'tour';

/** The step carried in a URL query string, if valid. */
export function stepFromQuery(search: string, stepCount: number): number | null {
  const raw = new URLSearchParams(search).get(TOUR_PARAM);
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n < stepCount ? n : null;
}

/** "Step {n} of {m}" style templating. */
export const fillCount = (template: string, n: number, m: number) =>
  template.replace('{n}', String(n)).replace('{m}', String(m));

// Motion and placement (A85) live in tour-placement.ts; re-exported for callers.
export {
  CARD_GAP,
  EDGE,
  PHONE_MAX,
  SPOT_PAD,
  nearViewport,
  placeCard,
  scrollDelta,
  type CardSide,
  type Placement,
  type Rect,
  type Size,
} from './tour-placement';

/** Pages linked from the site nav (relative to the language root). */
export const NAV_PAGES: readonly string[] = ['', 'explorer/', 'timeline/', 'compare/', 'study/'];

/**
 * Where to look for the control that leads to `page` before the tour navigates there
 * (A85): the site nav, then a link in the page itself, then the header (the logo); for
 * a nav page on a phone, the menu button that reveals the nav.
 */
export function bridgeSelectors(langBase: string, page: string): string[] {
  const href = `${langBase}${page}`.replace(/["\\]/g, '\\$&');
  return [
    `#site-nav a[href="${href}"]`,
    `main a[href="${href}"]`,
    `header a[href="${href}"]`,
    ...(NAV_PAGES.includes(page) ? ['[data-menu-toggle]'] : []),
  ];
}

/** The step a bridge card leads to: forward moves onto another page get one. */
export function needsBridge(
  steps: readonly TourStep<unknown>[],
  from: number,
  to: number,
  page: string | null,
): boolean {
  const move = moveTo(steps, to, page);
  return move.kind === 'go' && to > from;
}
