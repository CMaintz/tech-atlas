import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { TOUR_PAIR, TOUR_STEPS, TOUR_TERM, UI } from './site';
import { pairSlugFromIds } from './slug';
import {
  CARD_GAP,
  EDGE,
  SPOT_PAD,
  bridgeSelectors,
  fillCount,
  moveTo,
  nearViewport,
  needsBridge,
  pageOf,
  parseTourState,
  placeCard,
  resolveTour,
  scrollDelta,
  stepFromQuery,
  type Rect,
  type TourStep,
} from './tour';

const steps: TourStep[] = [
  { page: null, anchors: [], title: 'welcome', body: '' },
  { page: '', anchors: ['#search'], title: 'search', body: '' },
  { page: '', anchors: ['#browse'], title: 'browse', body: '' },
  { page: 'study/', anchors: ['#study'], title: 'study', body: '' },
];
const base = { steps, state: null, done: false, snoozed: false, page: '', autoStart: true };

describe('pageOf', () => {
  const root = '/tech-atlas/en/';
  it('is relative to the language root', () => {
    expect(pageOf('/tech-atlas/en/', root)).toBe('');
    expect(pageOf('/tech-atlas/en', root)).toBe('');
    expect(pageOf('/tech-atlas/en/study/', root)).toBe('study/');
    expect(pageOf('/tech-atlas/en/study', root)).toBe('study/');
    expect(pageOf('/tech-atlas/en/study/index.html', root)).toBe('study/');
    expect(pageOf('/tech-atlas/en/terms/security/risk/', root)).toBe('terms/security/risk/');
  });
  it('decodes, and is null outside the root', () => {
    expect(pageOf('/tech-atlas/en/terms/a%20b/', root)).toBe('terms/a b/');
    expect(pageOf('/tech-atlas/da/study/', root)).toBeNull();
    expect(pageOf('/tech-atlas/404', root)).toBeNull();
  });
  it('is null for a malformed escape instead of throwing', () => {
    expect(pageOf('/tech-atlas/en/terms/100%/', root)).toBeNull();
  });
});

describe('stepFromQuery', () => {
  it('reads a valid step from ?tour=N', () => {
    expect(stepFromQuery('?tour=3', 4)).toBe(3);
    expect(stepFromQuery('?x=1&tour=0', 4)).toBe(0);
  });
  it('ignores missing, malformed or out-of-range steps', () => {
    for (const q of ['', '?tour=', '?tour=4', '?tour=-1', '?tour=1.5', '?tour=abc', '?tour=1e2'])
      expect(stepFromQuery(q, 4)).toBeNull();
  });
});

describe('parseTourState', () => {
  it('accepts a running tour within range', () => {
    expect(parseTourState('{"active":true,"step":2}', 4)).toEqual({ active: true, step: 2 });
  });
  it('rejects anything else', () => {
    for (const raw of [
      null,
      '',
      'nope',
      '[]',
      '{"active":false,"step":1}',
      '{"active":true,"step":4}',
      '{"active":true,"step":-1}',
      '{"active":true,"step":1.5}',
      '{"active":true,"step":"1"}',
    ]) {
      expect(parseTourState(raw, 4)).toBeNull();
    }
  });
});

describe('resolveTour', () => {
  it('greets a first-time visitor with the welcome card on any page', () => {
    expect(resolveTour(base)).toEqual({ kind: 'show', step: 0 });
    expect(resolveTour({ ...base, page: 'terms/x/' })).toEqual({ kind: 'show', step: 0 });
  });
  it('stays quiet once done, snoozed this session, or where auto-start is off', () => {
    expect(resolveTour({ ...base, done: true })).toEqual({ kind: 'off' });
    expect(resolveTour({ ...base, snoozed: true })).toEqual({ kind: 'off' });
    expect(resolveTour({ ...base, autoStart: false })).toEqual({ kind: 'off' });
  });
  it('resumes a running tour on its page, and offers to continue elsewhere', () => {
    const state = { active: true, step: 3 };
    expect(resolveTour({ ...base, state, page: 'study/' })).toEqual({ kind: 'show', step: 3 });
    expect(resolveTour({ ...base, state, page: '' })).toEqual({ kind: 'resume', step: 3 });
    // A running tour wins over "done" (the reader restarted it).
    expect(resolveTour({ ...base, state, done: true, page: 'study/' }).kind).toBe('show');
  });
});

describe('moveTo', () => {
  it('stays on the page, goes to another, or finishes past either end', () => {
    expect(moveTo(steps, 2, '')).toEqual({ kind: 'stay', step: 2 });
    expect(moveTo(steps, 3, '')).toEqual({ kind: 'go', step: 3, page: 'study/' });
    expect(moveTo(steps, 1, 'study/')).toEqual({ kind: 'go', step: 1, page: '' });
    expect(moveTo(steps, 0, 'study/')).toEqual({ kind: 'stay', step: 0 });
    expect(moveTo(steps, 4, 'study/')).toEqual({ kind: 'finish' });
    expect(moveTo(steps, -1, '')).toEqual({ kind: 'finish' });
  });
});

it('fillCount fills {n} and {m}', () => {
  expect(fillCount(UI.en.tourStepOf, 2, 15)).toBe('Step 2 of 15');
  expect(fillCount(UI.da.tourContinue, 2, 15)).toBe('Fortsæt rundvisningen (2/15)');
});

describe('needsBridge', () => {
  it('points at the link first only when moving forward onto another page', () => {
    expect(needsBridge(steps, 2, 3, '')).toBe(true); // home → study/
    expect(needsBridge(steps, 1, 2, '')).toBe(false); // same page
    expect(needsBridge(steps, 3, 2, 'study/')).toBe(false); // back: go straight there
    expect(needsBridge(steps, 0, 1, 'study/')).toBe(true); // welcome on a deep page → home
  });
});

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

describe('bridgeSelectors', () => {
  it('looks in the nav, the page and the header, then the phone menu for nav pages', () => {
    expect(bridgeSelectors('/tech-atlas/en/', 'explorer/')).toEqual([
      '#site-nav a[href="/tech-atlas/en/explorer/"]',
      'main a[href="/tech-atlas/en/explorer/"]',
      'header a[href="/tech-atlas/en/explorer/"]',
      '[data-menu-toggle]',
    ]);
    // An entry is not in the menu, so the menu button would point nowhere.
    expect(bridgeSelectors('/tech-atlas/en/', 'terms/security/risk/')).not.toContain(
      '[data-menu-toggle]',
    );
    expect(bridgeSelectors('/tech-atlas/en/', '')).toContain('[data-menu-toggle]');
  });
  it('escapes quotes so a selector cannot break out', () => {
    expect(bridgeSelectors('/x/', 'a"b/')[0]).toBe('#site-nav a[href="/x/a\\"b/"]');
  });
});

it('nearViewport ignores links more than a screen and a half away', () => {
  expect(nearViewport(r(500, 0, 10, 10), 900)).toBe(true);
  expect(nearViewport(r(2000, 0, 10, 10), 900)).toBe(true);
  expect(nearViewport(r(9000, 0, 10, 10), 900)).toBe(false);
  expect(nearViewport(r(-2000, 0, 10, 10), 900)).toBe(false);
});

describe('TOUR_STEPS', () => {
  it('names the way to every page it moves to (the bridge card)', () => {
    for (let i = 1; i < TOUR_STEPS.length; i++) {
      if (TOUR_STEPS[i].page !== TOUR_STEPS[i - 1].page) {
        expect(TOUR_STEPS[i].via?.en.trim()).toBeTruthy();
        expect(TOUR_STEPS[i].via?.da.trim()).toBeTruthy();
      }
    }
  });
  it('starts with a page-agnostic welcome card and is bilingual throughout', () => {
    expect(TOUR_STEPS[0].page).toBeNull();
    for (const s of TOUR_STEPS) {
      for (const text of [s.title, s.body]) {
        expect(text.en.trim()).not.toBe('');
        expect(text.da.trim()).not.toBe('');
      }
      expect(s.page === null || s.page === '' || s.page.endsWith('/')).toBe(true);
    }
  });
  it('visits the pages it promises', () => {
    const pages = new Set(TOUR_STEPS.map((s) => s.page));
    for (const p of ['', `terms/${TOUR_TERM}/`, `compare/${TOUR_PAIR}/`, 'explorer/', 'study/'])
      expect(pages).toContain(p);
    expect(pages).toContain('timeline/');
  });
  it('walks through a term that exists and a compare pair it really has', () => {
    const file = new URL(`../content/terms/${TOUR_TERM}.yaml`, import.meta.url);
    expect(existsSync(file)).toBe(true);
    const term = parse(readFileSync(file, 'utf8')) as {
      edges: { requires?: string[]; 'contrasts-with'?: { to: string }[] };
    };
    expect(term.edges.requires?.length).toBeGreaterThan(0); // "learn first" has content
    const [folder] = TOUR_TERM.split('/');
    const partners = (term.edges['contrasts-with'] ?? []).map((e) =>
      e.to.includes('/') ? e.to : `${folder}/${e.to}`,
    );
    expect(partners.map((p) => pairSlugFromIds(TOUR_TERM, p))).toContain(TOUR_PAIR);
  });
});
