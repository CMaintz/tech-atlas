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
 * The current page relative to the language root: `/tech-atlas/en/study/` with root
 * `/tech-atlas/en/` → `study/`. Always ends in '/' unless it is the home page (''),
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
  if (state?.active) {
    const s = steps[state.step];
    if (!s) return { kind: 'off' };
    return s.page === null || s.page === page
      ? { kind: 'show', step: state.step }
      : { kind: 'resume', step: state.step };
  }
  if (autoStart && !done && !snoozed && steps.length > 0) return { kind: 'show', step: 0 };
  return { kind: 'off' };
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

// ---------------------------------------------------------------------------
// Motion and placement (A85). Pure geometry, so the card's position and the scroll
// that precedes each move can be unit-tested; Tour.tsx only measures and writes.

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}
export interface Size {
  width: number;
  height: number;
}

/** Breathing room around the spotlit element. */
export const SPOT_PAD = 6;
/** Gap between the spotlight and the card. */
export const CARD_GAP = 14;
/** Minimum distance from the viewport edge. */
export const EDGE = 12;
/** Below this width the card is a bottom sheet. */
export const PHONE_MAX = 640;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

export type CardSide = 'below' | 'above' | 'right' | 'left' | 'sheet' | 'centre';

export interface Placement {
  /** Top-left corner of the card, in viewport pixels. */
  card: { x: number; y: number };
  side: CardSide;
  /** The padded spotlight, clipped so the card never covers it; null = dim everything. */
  spot: Rect | null;
}

/**
 * Where the card goes for a target rect (viewport coordinates, unpadded). Desktop: below
 * the target, else above, else beside it, else pinned to the bottom with the spotlight
 * clipped above it — the card never overlaps what it describes. Phones: a bottom sheet,
 * with the spotlight clipped to the space above it. No target: centred (sheet on phones).
 */
export function placeCard(target: Rect | null, card: Size, vp: Size): Placement {
  const phone = vp.width < PHONE_MAX;
  const sheetY = vp.height - card.height - EDGE;
  if (!target) {
    return phone
      ? { card: { x: EDGE, y: sheetY }, side: 'sheet', spot: null }
      : {
          card: { x: (vp.width - card.width) / 2, y: (vp.height - card.height) / 2 },
          side: 'centre',
          spot: null,
        };
  }
  const spot: Rect = {
    top: target.top - SPOT_PAD,
    left: target.left - SPOT_PAD,
    width: target.width + SPOT_PAD * 2,
    height: target.height + SPOT_PAD * 2,
  };
  /** The spotlight cut off `CARD_GAP` above `y`. */
  const clipAbove = (y: number): Rect => ({
    ...spot,
    height: clamp(y - CARD_GAP - spot.top, 0, spot.height),
  });
  if (phone) return { card: { x: EDGE, y: sheetY }, side: 'sheet', spot: clipAbove(sheetY) };

  const bottom = spot.top + spot.height;
  const right = spot.left + spot.width;
  const x = clamp(spot.left, EDGE, vp.width - card.width - EDGE);
  const below = bottom + CARD_GAP;
  if (below + card.height <= vp.height - EDGE)
    return { card: { x, y: below }, side: 'below', spot };
  const above = spot.top - CARD_GAP - card.height;
  if (above >= EDGE) return { card: { x, y: above }, side: 'above', spot };
  const y = clamp(spot.top, EDGE, vp.height - card.height - EDGE);
  if (right + CARD_GAP + card.width <= vp.width - EDGE)
    return { card: { x: right + CARD_GAP, y }, side: 'right', spot };
  if (spot.left - CARD_GAP - card.width >= EDGE)
    return { card: { x: spot.left - CARD_GAP - card.width, y }, side: 'left', spot };
  return {
    card: { x: vp.width - card.width - EDGE, y: sheetY },
    side: 'sheet',
    spot: clipAbove(sheetY),
  };
}

/**
 * How far to scroll (px, + = down) so the target and its card both fit on screen before
 * the spotlight moves. 0 when they already fit. A target taller than the free space is
 * brought near the top instead. Clamped to what the document can actually scroll.
 */
export function scrollDelta(
  target: Rect,
  card: Size,
  vp: Size,
  scroll: { y: number; max: number },
): number {
  const top = EDGE + SPOT_PAD;
  const tBottom = target.top + target.height;
  // Room for the card below the target (on phones: the bottom sheet's height).
  const bandBottom = vp.height - card.height - CARD_GAP - EDGE - SPOT_PAD;
  if (target.top >= top && tBottom <= bandBottom) return 0;
  if (vp.width >= PHONE_MAX) {
    // Fully visible with room for the card above or beside it: leave the page be.
    const visible = target.top >= top && tBottom <= vp.height - EDGE - SPOT_PAD;
    if (visible && placeCard(target, card, vp).side !== 'sheet') return 0;
  }
  const band = bandBottom - top;
  const want =
    target.height <= band ? top + Math.round((band - target.height) / 2) : top + CARD_GAP * 2;
  const delta = target.top - want;
  return clamp(scroll.y + delta, 0, scroll.max) - scroll.y;
}

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

/**
 * Whether an in-page link is close enough to point at: within `reach` screens of the
 * viewport. The home page's index lists every term far below the fold; scrolling a
 * reader there just to show a link is worse than a plain "Next".
 */
export const nearViewport = (r: Rect, vpHeight: number, reach = 1.5) =>
  r.top + r.height > -vpHeight * reach && r.top < vpHeight * (1 + reach);

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
