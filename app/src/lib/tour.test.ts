import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { TOUR_PAIR, TOUR_STEPS, TOUR_TERM, UI } from './site';
import { pairSlugFromIds } from './slug';
import { fillCount, moveTo, pageOf, parseTourState, resolveTour, type TourStep } from './tour';

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

describe('TOUR_STEPS', () => {
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
