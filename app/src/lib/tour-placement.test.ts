import { describe, expect, it } from 'vitest';
import {
  CARD_GAP,
  EDGE,
  SPOT_PAD,
  nearViewport,
  placeCard,
  scrollDelta,
  type Rect,
} from './tour-placement';
const desk = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const card = { width: 352, height: 180 };
const r = (top: number, left: number, width: number, height: number): Rect => ({
  top,
  left,
  width,
  height,
});
/** Positive-area intersection (a spotlight clipped to nothing covers nothing). */
const overlaps = (a: Rect, b: Rect) =>
  a.width > 0 &&
  a.height > 0 &&
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

describe('placeCard', () => {
  it('centres the card with no target (a sheet on phones), dimming everything', () => {
    expect(placeCard(null, card, desk)).toEqual({
      card: { x: (1440 - 352) / 2, y: (900 - 180) / 2 },
      side: 'centre',
      spot: null,
    });
    const p = placeCard(null, { width: 366, height: 180 }, phone);
    expect(p.side).toBe('sheet');
    expect(p.card).toEqual({ x: EDGE, y: 844 - 180 - EDGE });
  });
  it('prefers below, then above, then beside the target', () => {
    const below = placeCard(r(100, 200, 600, 40), card, desk);
    expect(below.side).toBe('below');
    expect(below.card.y).toBe(100 + 40 + SPOT_PAD + CARD_GAP);
    expect(placeCard(r(700, 200, 600, 40), card, desk).side).toBe('above');
    expect(placeCard(r(100, 100, 300, 760), card, desk).side).toBe('right');
    expect(placeCard(r(100, 1000, 300, 760), card, desk).side).toBe('left');
  });
  it('keeps the card inside the viewport', () => {
    const p = placeCard(r(100, 1400, 30, 30), card, desk);
    expect(p.card.x + card.width).toBeLessThanOrEqual(1440 - EDGE);
  });
  it('pins the card bottom right, clipping the spotlight, when nothing else fits', () => {
    const p = placeCard(r(40, 0, 1440, 2000), card, desk);
    expect(p.side).toBe('sheet');
    expect(p.card).toEqual({ x: 1440 - 352 - EDGE, y: 900 - 180 - EDGE });
    expect(p.spot?.height).toBe(900 - 180 - EDGE - CARD_GAP - (40 - SPOT_PAD));
  });
  it('never lets the card cover the spotlight — even for a full-width, full-height target', () => {
    const targets = [
      r(100, 200, 600, 40),
      r(700, 200, 600, 40),
      r(100, 100, 300, 760),
      r(40, 0, 1440, 2000), // the timeline
      r(300, 20, 350, 900), // a tall section on a phone
    ];
    for (const vp of [desk, phone]) {
      const size = vp === phone ? { width: 366, height: 220 } : card;
      for (const t of targets) {
        const p = placeCard(t, size, vp);
        const c = r(p.card.y, p.card.x, size.width, size.height);
        expect(p.spot && overlaps(p.spot, c)).toBeFalsy();
      }
    }
  });
});

describe('scrollDelta', () => {
  const at = { y: 1000, max: 5000 };
  it('leaves the page alone when the target and card already fit', () => {
    expect(scrollDelta(r(200, 100, 600, 60), card, desk, at)).toBe(0);
    expect(scrollDelta(r(700, 100, 600, 60), card, desk, at)).toBe(0); // card fits above
    expect(scrollDelta(r(200, 16, 350, 60), card, phone, at)).toBe(0);
  });
  it('brings a target that is off screen (or under the phone sheet) into the free band', () => {
    const down = scrollDelta(r(1600, 100, 600, 60), card, desk, at);
    expect(down).toBeGreaterThan(0);
    const t = 1600 - down;
    expect(t).toBeGreaterThanOrEqual(EDGE + SPOT_PAD);
    expect(t + 60).toBeLessThanOrEqual(900 - card.height - CARD_GAP - EDGE - SPOT_PAD);
    const under = scrollDelta(r(700, 16, 350, 60), card, phone, at);
    expect(under).toBeGreaterThan(0);
    expect(scrollDelta(r(-400, 100, 600, 60), card, desk, at)).toBeLessThan(0);
  });
  it('brings a tall target to the top, and never past what the page can scroll', () => {
    expect(scrollDelta(r(500, 0, 1440, 3000), card, desk, at)).toBe(
      500 - EDGE - SPOT_PAD - CARD_GAP * 2,
    );
    expect(scrollDelta(r(-400, 100, 600, 60), card, desk, { y: 100, max: 5000 })).toBe(-100);
    expect(scrollDelta(r(1600, 100, 600, 60), card, desk, { y: 0, max: 300 })).toBe(300);
  });
});

it('nearViewport ignores links more than a screen and a half away', () => {
  expect(nearViewport(r(500, 0, 10, 10), 900)).toBe(true);
  expect(nearViewport(r(2000, 0, 10, 10), 900)).toBe(true);
  expect(nearViewport(r(9000, 0, 10, 10), 900)).toBe(false);
  expect(nearViewport(r(-2000, 0, 10, 10), 900)).toBe(false);
});
