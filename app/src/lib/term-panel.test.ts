import { describe, expect, it, vi } from 'vitest';
import type { Graph, GraphLink, GraphNode } from './graph-model';
import {
  connectionCycle,
  makeTermCache,
  nextCycleState,
  positionText,
  startHistory,
  stepCycle,
  travel,
  visit,
  neighbourIds,
  neighbourhoodGraph,
  paragraphs,
  relationGroups,
  termFromSearch,
  withTermParam,
} from './term-panel';

const node = (id: string): GraphNode => ({
  id,
  term: { en: id.toUpperCase(), da: `${id}-da` },
  domain: ['security'],
  cluster: 'c',
  depth: 0,
  degree: 0,
  requires: [],
  collides: false,
  mentions: [],
});
const link = (source: string, type: GraphLink['type'], target: string): GraphLink => ({
  source,
  target,
  type,
  family: 'structure',
  weight: 1,
});
const graph: Graph = {
  nodes: ['a', 'b', 'c', 'd'].map(node),
  links: [
    link('a', 'requires', 'b'),
    link('c', 'requires', 'a'),
    link('a', 'contrasts-with', 'd'),
    link('d', 'kind-of', 'a'),
    link('b', 'used-with', 'c'),
  ],
};
const inverse = {
  requires: 'unlocks',
  'contrasts-with': 'contrasts-with',
  'kind-of': 'has-kind',
  'used-with': 'used-with',
};
const order = ['has-kind', 'requires', 'unlocks', 'contrasts-with'];

describe('relationGroups', () => {
  it('keeps outgoing types, inverts incoming ones, in reading order', () => {
    expect(relationGroups(graph, 'a', inverse, order)).toEqual([
      { type: 'has-kind', ids: ['d'] },
      { type: 'requires', ids: ['b'] },
      { type: 'unlocks', ids: ['c'] },
      { type: 'contrasts-with', ids: ['d'] },
    ]);
  });

  it('maps symmetric types to themselves and sorts unknown types last', () => {
    expect(relationGroups(graph, 'c', inverse, order)).toEqual([
      { type: 'requires', ids: ['a'] },
      { type: 'used-with', ids: ['b'] },
    ]);
  });

  it('is empty for an isolated term and ignores self-links', () => {
    const g: Graph = { nodes: [node('x')], links: [link('x', 'requires', 'x')] };
    expect(relationGroups(g, 'x', inverse, order)).toEqual([]);
  });
});

describe('neighbourIds / neighbourhoodGraph', () => {
  it('lists each direct neighbour once, either direction', () => {
    expect(neighbourIds(graph, 'a').sort()).toEqual(['b', 'c', 'd']);
  });

  it('builds the focal term plus neighbours with authored, labelled edges', () => {
    const g = neighbourhoodGraph(graph, 'b', 'da', { requires: 'Forudsætter' });
    expect(g.nodes.map((n) => [n.id, n.label, n.focus])).toEqual([
      ['b', 'b-da', true],
      ['a', 'a-da', false],
      ['c', 'c-da', false],
    ]);
    expect(g.edges).toEqual([
      { source: 'a', target: 'b', type: 'requires', family: 'structure', label: 'Forudsætter' },
      { source: 'b', target: 'c', type: 'used-with', family: 'structure', label: 'used-with' },
    ]);
  });
});

describe('makeTermCache', () => {
  it('fetches each term once and exposes it for instant display', async () => {
    const fetchJson = vi.fn(async (u: string) => ({ id: u }));
    const cache = makeTermCache(fetchJson, '/base/api/terms/');
    expect(cache.peek('security/phishing')).toBeUndefined();
    cache.prefetch('security/phishing');
    const r = await cache.load('security/phishing');
    await cache.load('security/phishing');
    expect(fetchJson).toHaveBeenCalledTimes(1);
    expect(fetchJson).toHaveBeenCalledWith('/base/api/terms/security/phishing.json');
    expect(r).toEqual({ id: '/base/api/terms/security/phishing.json' });
    expect(cache.peek('security/phishing')).toBe(r);
  });

  it('forgets a failed request so the next load retries', async () => {
    const fetchJson = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ id: 'x' });
    const cache = makeTermCache(fetchJson, '/');
    await expect(cache.load('x')).rejects.toThrow('offline');
    await expect(cache.load('x')).resolves.toEqual({ id: 'x' });
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('swallows prefetch errors', async () => {
    const cache = makeTermCache(() => Promise.reject(new Error('no')), '/');
    expect(() => cache.prefetch('x')).not.toThrow();
    await Promise.resolve();
  });
});

describe('deep link', () => {
  it('reads ?term=', () => {
    expect(termFromSearch('?term=security%2Fphishing&focus=x')).toBe('security/phishing');
    expect(termFromSearch('?term=')).toBeNull();
    expect(termFromSearch('')).toBeNull();
  });

  it('sets and removes ?term= while keeping other parameters and the hash', () => {
    const href = 'https://x.test/tech-atlas/en/explorer/?from=a&to=b#top';
    expect(withTermParam(href, 'security/phishing')).toBe(
      '/tech-atlas/en/explorer/?from=a&to=b&term=security%2Fphishing#top',
    );
    expect(withTermParam('/en/explorer/?term=a&focus=b', null)).toBe('/en/explorer/?focus=b');
    expect(withTermParam('/en/explorer/?term=a', null)).toBe('/en/explorer/');
  });
});

describe('paragraphs', () => {
  it('splits on blank lines and joins inner line breaks', () => {
    expect(paragraphs('One\nline.\n\n  Two.  \r\n\r\nThree.\n')).toEqual([
      'One line.',
      'Two.',
      'Three.',
    ]);
  });

  it('is empty for missing or blank text', () => {
    expect(paragraphs(undefined)).toEqual([]);
    expect(paragraphs('  \n\n ')).toEqual([]);
  });
});

describe('connection cycle (Previous / Next)', () => {
  const cycle = connectionCycle(relationGroups(graph, 'a', inverse, order));

  it('lists connections in the relationships order, one entry per group membership', () => {
    expect(cycle).toEqual([
      { type: 'has-kind', id: 'd' },
      { type: 'requires', id: 'b' },
      { type: 'unlocks', id: 'c' },
      { type: 'contrasts-with', id: 'd' },
    ]);
  });

  it('skips ids that are not on the map', () => {
    const known = (x: string) => x !== 'd';
    expect(connectionCycle(relationGroups(graph, 'a', inverse, order), known)).toEqual([
      { type: 'requires', id: 'b' },
      { type: 'unlocks', id: 'c' },
    ]);
  });

  it('steps from the anchor to either end and wraps around', () => {
    expect(stepCycle(4, null, 1)).toBe(0);
    expect(stepCycle(4, null, -1)).toBe(3);
    expect(stepCycle(4, 1, 1)).toBe(2);
    expect(stepCycle(4, 3, 1)).toBe(0);
    expect(stepCycle(4, 0, -1)).toBe(3);
    expect(stepCycle(1, 0, 1)).toBe(0);
    expect(stepCycle(0, null, 1)).toBeNull();
  });

  it('keeps the anchor while stepping, and a full lap comes back round', () => {
    let s = nextCycleState(null, 'a', { via: 'other' }, []);
    expect(s).toEqual({ anchor: 'a', index: null });
    const seen: string[] = [];
    for (let k = 0; k < cycle.length + 1; k++) {
      const i = stepCycle(cycle.length, s.index, 1)!;
      s = nextCycleState(s, cycle[i].id, { via: 'step', index: i }, cycle);
      seen.push(`${cycle[i].type}:${cycle[i].id}`);
    }
    expect(s).toEqual({ anchor: 'a', index: 0 });
    expect(seen).toEqual([
      'has-kind:d',
      'requires:b',
      'unlocks:c',
      'contrasts-with:d',
      'has-kind:d',
    ]);
  });

  it('re-anchors on any other pick, even of a connection', () => {
    const s = { anchor: 'a', index: 1 };
    expect(nextCycleState(s, 'c', { via: 'other' }, cycle)).toEqual({ anchor: 'c', index: null });
  });

  it('keeps the anchor when Back/Forward land on it or on one of its connections', () => {
    const s = { anchor: 'a', index: 2 };
    expect(nextCycleState(s, 'a', { via: 'history' }, cycle)).toEqual({ anchor: 'a', index: null });
    expect(nextCycleState(s, 'b', { via: 'history' }, cycle)).toEqual({ anchor: 'a', index: 1 });
    expect(nextCycleState(s, 'd', { via: 'history' }, cycle)).toEqual({ anchor: 'a', index: 0 });
    expect(nextCycleState(s, 'z', { via: 'history' }, cycle)).toEqual({ anchor: 'z', index: null });
  });

  it('formats the position text', () => {
    expect(positionText('{i} of {n} · {type}', 2, 12, 'requires')).toBe('3 of 12 · requires');
  });
});

describe('panel history (Back / Forward)', () => {
  it('visits push, and re-visiting the current term is a no-op', () => {
    const h = visit(visit(startHistory('a'), 'b'), 'b');
    expect(h).toEqual({ entries: ['a', 'b'], pos: 1 });
  });

  it('goes back and forward, and stops at the ends', () => {
    const h = visit(visit(startHistory('a'), 'b'), 'c');
    const back = travel(h, -1)!;
    expect(back.id).toBe('b');
    expect(travel(travel(back.history, -1)!.history, -1)).toBeNull();
    expect(travel(back.history, 1)!.id).toBe('c');
    expect(travel(h, 1)).toBeNull();
  });

  it('drops the forward trail on a new visit, like a browser', () => {
    const h = visit(visit(startHistory('a'), 'b'), 'c');
    const back = travel(travel(h, -1)!.history, -1)!.history;
    expect(visit(back, 'd')).toEqual({ entries: ['a', 'd'], pos: 1 });
  });

  it('remembers at most the limit', () => {
    let h = startHistory('t0');
    for (let k = 1; k < 10; k++) h = visit(h, `t${k}`, 3);
    expect(h).toEqual({ entries: ['t7', 't8', 't9'], pos: 2 });
  });
});
