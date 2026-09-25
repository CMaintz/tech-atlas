import { describe, expect, it, vi } from 'vitest';
import type { Graph, GraphLink, GraphNode } from './graph-model';
import {
  makeTermCache,
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
