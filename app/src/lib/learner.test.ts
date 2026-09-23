import { describe, expect, it } from 'vitest';
import { buildGraph, type ModelTerm } from './graph-model';
import { isDue, isKnown, recordAnswer, recommendNext, setStatus, type Learner } from './learner';

const DAY = 24 * 60 * 60 * 1000;
const empty: Learner = { terms: {} };

describe('recordAnswer (Leitner spaced repetition)', () => {
  it('moves a term up a box and schedules it later on a right answer when due', () => {
    const l = recordAnswer(recordAnswer(empty, 't', true, 0), 't', true, DAY);
    expect(l.terms.t.box).toBe(2);
    expect(l.terms.t.due).toBe(DAY + 3 * DAY);
    expect(l.terms.t.right).toBe(2);
  });

  it('does not promote a term that is not yet due', () => {
    let l = empty;
    for (let i = 0; i < 3; i++) l = recordAnswer(l, 't', true, 0);
    expect(l.terms.t.box).toBe(1);
    expect(l.terms.t.right).toBe(3);
  });

  it('sends a term back to box 1 (due tomorrow) on a wrong answer', () => {
    const l = recordAnswer(recordAnswer(empty, 't', true, 0), 't', false, 0);
    expect(l.terms.t.box).toBe(1);
    expect(l.terms.t.due).toBe(DAY);
    expect(l.terms.t.wrong).toBe(1);
  });

  it('does not mutate the previous state', () => {
    recordAnswer(empty, 't', true);
    expect(empty.terms).toEqual({});
  });
});

describe('isDue / isKnown', () => {
  it('is due once the scheduled time has passed', () => {
    const l = recordAnswer(empty, 't', true, 0);
    expect(isDue(l.terms.t, DAY - 1)).toBe(false);
    expect(isDue(l.terms.t, DAY)).toBe(true);
  });

  it('counts a term as known by self-assessment or by three right answers running', () => {
    expect(isKnown(setStatus(empty, 't', 'know').terms.t)).toBe(true);
    let l = empty;
    for (const at of [0, DAY, 4 * DAY]) l = recordAnswer(l, 't', true, at);
    expect(isKnown(l.terms.t)).toBe(true);
    expect(isKnown(undefined)).toBe(false);
  });
});

describe('recommendNext', () => {
  const t = (id: string, requires: string[] = []): ModelTerm => ({
    id: `cs/${id}`,
    term: { en: id, da: id },
    domain: ['cs'],
    cluster: 'c',
    edges: requires.length ? { requires } : {},
  });
  const graph = buildGraph([t('a'), t('b', ['a']), t('c', ['b'])]);

  it('suggests foundations to a new learner', () => {
    expect(recommendNext(graph, empty).map((n) => n.id)).toEqual(['cs/a']);
  });

  it('suggests terms whose prerequisites are known', () => {
    const l = setStatus(empty, 'cs/a', 'know');
    expect(recommendNext(graph, l).map((n) => n.id)).toEqual(['cs/b']);
  });
});
