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

const SPOT_PAD = 6;
const CARD_GAP = 14;
const EDGE = 12;
const PHONE_MAX = 640;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

type CardSide = 'below' | 'above' | 'right' | 'left' | 'sheet' | 'centre';

export interface Placement {
  card: { x: number; y: number };
  side: CardSide;
  spot: Rect | null;
}

export function placeCard(target: Rect | null, card: Size, vp: Size): Placement {
  const phone = vp.width < PHONE_MAX;
  if (!target) return phone ? sheet(card, vp, null) : centred(card, vp);
  const spot = padded(target);
  if (phone) return sheet(card, vp, spot);
  return belowOrAbove(spot, card, vp) ?? beside(spot, card, vp) ?? pinned(spot, card, vp);
}

const padded = (target: Rect): Rect => ({
  top: target.top - SPOT_PAD,
  left: target.left - SPOT_PAD,
  width: target.width + SPOT_PAD * 2,
  height: target.height + SPOT_PAD * 2,
});

const clipAbove = (spot: Rect, y: number): Rect => ({
  ...spot,
  height: clamp(y - CARD_GAP - spot.top, 0, spot.height),
});

const sheetY = (card: Size, vp: Size) => vp.height - card.height - EDGE;

function sheet(card: Size, vp: Size, spot: Rect | null): Placement {
  const y = sheetY(card, vp);
  return { card: { x: EDGE, y }, side: 'sheet', spot: spot && clipAbove(spot, y) };
}

function centred(card: Size, vp: Size): Placement {
  const x = (vp.width - card.width) / 2;
  return { card: { x, y: (vp.height - card.height) / 2 }, side: 'centre', spot: null };
}

function belowOrAbove(spot: Rect, card: Size, vp: Size): Placement | null {
  const x = clamp(spot.left, EDGE, vp.width - card.width - EDGE);
  const below = spot.top + spot.height + CARD_GAP;
  if (below + card.height <= vp.height - EDGE)
    return { card: { x, y: below }, side: 'below', spot };
  const above = spot.top - CARD_GAP - card.height;
  if (above >= EDGE) return { card: { x, y: above }, side: 'above', spot };
  return null;
}

function beside(spot: Rect, card: Size, vp: Size): Placement | null {
  const y = clamp(spot.top, EDGE, vp.height - card.height - EDGE);
  const right = spot.left + spot.width + CARD_GAP;
  if (right + card.width <= vp.width - EDGE) return { card: { x: right, y }, side: 'right', spot };
  const left = spot.left - CARD_GAP - card.width;
  if (left >= EDGE) return { card: { x: left, y }, side: 'left', spot };
  return null;
}

function pinned(spot: Rect, card: Size, vp: Size): Placement {
  const y = sheetY(card, vp);
  const x = vp.width - card.width - EDGE;
  return { card: { x, y }, side: 'sheet', spot: clipAbove(spot, y) };
}

type Page = { vp: Size; scroll: { y: number; max: number } };

const bandBottomOf = (card: Size, vp: Size) => vp.height - card.height - CARD_GAP - EDGE - SPOT_PAD;

export function scrollDelta(target: Rect, card: Size, { vp, scroll }: Page): number {
  const top = EDGE + SPOT_PAD;
  if (alreadyFits(target, card, vp)) return 0;
  const band = bandBottomOf(card, vp) - top;
  const want =
    target.height <= band ? top + Math.round((band - target.height) / 2) : top + CARD_GAP * 2;
  const delta = target.top - want;
  return clamp(scroll.y + delta, 0, scroll.max) - scroll.y;
}

function alreadyFits(target: Rect, card: Size, vp: Size): boolean {
  const top = EDGE + SPOT_PAD;
  const tBottom = target.top + target.height;
  if (target.top >= top && tBottom <= bandBottomOf(card, vp)) return true;
  if (vp.width < PHONE_MAX) return false;
  const visible = target.top >= top && tBottom <= vp.height - EDGE - SPOT_PAD;
  return visible && placeCard(target, card, vp).side !== 'sheet';
}

export const nearViewport = (r: Rect, vpHeight: number, reach = 1.5) =>
  r.top + r.height > -vpHeight * reach && r.top < vpHeight * (1 + reach);
