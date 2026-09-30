/**
 * The guided tour's motion and placement. Pure geometry, so the card's position
 * and the scroll that precedes each move can be unit-tested; Tour.tsx only measures and
 * writes. Re-exported from `tour.ts`.
 */

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
  if (!target) return phone ? sheet(card, vp, null) : centred(card, vp);
  const spot = padded(target);
  if (phone) return sheet(card, vp, spot);
  return belowOrAbove(spot, card, vp) ?? beside(spot, card, vp) ?? pinned(spot, card, vp);
}

/** The target grown by `SPOT_PAD` on every side. */
const padded = (target: Rect): Rect => ({
  top: target.top - SPOT_PAD,
  left: target.left - SPOT_PAD,
  width: target.width + SPOT_PAD * 2,
  height: target.height + SPOT_PAD * 2,
});

/** The spotlight cut off `CARD_GAP` above `y`, so a card at `y` never covers it. */
const clipAbove = (spot: Rect, y: number): Rect => ({
  ...spot,
  height: clamp(y - CARD_GAP - spot.top, 0, spot.height),
});

const sheetY = (card: Size, vp: Size) => vp.height - card.height - EDGE;

/** The phone bottom sheet, with the spotlight (if any) clipped above it. */
function sheet(card: Size, vp: Size, spot: Rect | null): Placement {
  const y = sheetY(card, vp);
  return { card: { x: EDGE, y }, side: 'sheet', spot: spot && clipAbove(spot, y) };
}

function centred(card: Size, vp: Size): Placement {
  const x = (vp.width - card.width) / 2;
  return { card: { x, y: (vp.height - card.height) / 2 }, side: 'centre', spot: null };
}

/** Below the spotlight, else above it — left-aligned with it; null when neither fits. */
function belowOrAbove(spot: Rect, card: Size, vp: Size): Placement | null {
  const x = clamp(spot.left, EDGE, vp.width - card.width - EDGE);
  const below = spot.top + spot.height + CARD_GAP;
  if (below + card.height <= vp.height - EDGE)
    return { card: { x, y: below }, side: 'below', spot };
  const above = spot.top - CARD_GAP - card.height;
  if (above >= EDGE) return { card: { x, y: above }, side: 'above', spot };
  return null;
}

/** Right of the spotlight, else left of it — top-aligned with it; null when neither fits. */
function beside(spot: Rect, card: Size, vp: Size): Placement | null {
  const y = clamp(spot.top, EDGE, vp.height - card.height - EDGE);
  const right = spot.left + spot.width + CARD_GAP;
  if (right + card.width <= vp.width - EDGE) return { card: { x: right, y }, side: 'right', spot };
  const left = spot.left - CARD_GAP - card.width;
  if (left >= EDGE) return { card: { x: left, y }, side: 'left', spot };
  return null;
}

/** Last resort on desktop: bottom right, with the spotlight clipped above the card. */
function pinned(spot: Rect, card: Size, vp: Size): Placement {
  const y = sheetY(card, vp);
  const x = vp.width - card.width - EDGE;
  return { card: { x, y }, side: 'sheet', spot: clipAbove(spot, y) };
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
  // Room for the card below the target (on phones: the bottom sheet's height).
  const bandBottom = vp.height - card.height - CARD_GAP - EDGE - SPOT_PAD;
  if (alreadyFits(target, card, vp, bandBottom)) return 0;
  const band = bandBottom - top;
  const want =
    target.height <= band ? top + Math.round((band - target.height) / 2) : top + CARD_GAP * 2;
  const delta = target.top - want;
  return clamp(scroll.y + delta, 0, scroll.max) - scroll.y;
}

/**
 * Whether the page can stay put: the target sits above `bandBottom` (room for the card
 * below it), or — on desktop — is fully visible with room for the card above or beside it.
 */
function alreadyFits(target: Rect, card: Size, vp: Size, bandBottom: number): boolean {
  const top = EDGE + SPOT_PAD;
  const tBottom = target.top + target.height;
  if (target.top >= top && tBottom <= bandBottom) return true;
  if (vp.width < PHONE_MAX) return false;
  const visible = target.top >= top && tBottom <= vp.height - EDGE - SPOT_PAD;
  return visible && placeCard(target, card, vp).side !== 'sheet';
}

/**
 * Whether an in-page link is close enough to point at: within `reach` screens of the
 * viewport. The home page's index lists every term far below the fold; scrolling a
 * reader there just to show a link is worse than a plain "Next".
 */
export const nearViewport = (r: Rect, vpHeight: number, reach = 1.5) =>
  r.top + r.height > -vpHeight * reach && r.top < vpHeight * (1 + reach);
