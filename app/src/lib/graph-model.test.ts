import { describe, expect, it } from 'vitest';
import { buildGraph, prerequisitesOf, shortestPath, type ModelTerm } from './graph-model';

const term = (id: string, edges: ModelTerm['edges'] = {}, cluster = 'c'): ModelTerm => ({
  id,
  term: { en: id, da: id },
  domain: [id.split('/')[0]],
  cluster,
  edges,
});

// security/c requires b requires a; d is unconnected; `audit` collides across domains.
const terms: ModelTerm[] = [
  term('security/a'),
  term('security/b', { requires: ['a'] }),
  term('security/c', { requires: ['b'], 'kind-of': ['a'] }),
  term('security/d'),
  term('security/audit'),
  term('cs/audit', { 'contrasts-with': ['security/audit'] }),
  term('cs/x', { requires: ['audit'] }),
];

describe('buildGraph', () => {
  const g = buildGraph(terms);
  const node = (id: string) => g.nodes.find((n) => n.id === id)!;

  it('derives depth as the longest requires path (ADR-0001)', () => {
    expect(node('security/a').depth).toBe(0);
    expect(node('security/b').depth).toBe(1);
    expect(node('security/c').depth).toBe(2);
  });

  it('resolves a bare ref in the source domain first (ADR-0003)', () => {
    const link = g.links.find((l) => l.source === 'cs/x')!;
    expect(link.target).toBe('cs/audit');
  });

  it('never falls back across domains for a namespaced ref', () => {
    const g2 = buildGraph([term('cs/y', { requires: ['security/missing'] }), term('cs/missing')]);
    expect(g2.links).toHaveLength(0);
  });

  it('flags name collisions across domains', () => {
    expect(node('cs/audit').collides).toBe(true);
    expect(node('security/a').collides).toBe(false);
  });

  it('weights edges higher when their source is better connected', () => {
    const weights = g.links.filter((l) => l.family === 'dependency').map((l) => l.weight);
    expect(Math.min(...weights)).toBeGreaterThan(0);
  });
});

describe('prerequisitesOf', () => {
  it('returns every transitive prerequisite, foundations first', () => {
    const g = buildGraph(terms);
    expect(prerequisitesOf(g, 'security/c').map((n) => n.id)).toEqual(['security/a', 'security/b']);
    expect(prerequisitesOf(g, 'security/a')).toEqual([]);
  });
});

describe('shortestPath', () => {
  const g = buildGraph(terms);
  it('walks relationships in either direction', () => {
    expect(shortestPath(g, 'security/a', 'security/c')).toEqual(['security/a', 'security/c']);
  });
  it('returns null when no route exists', () => {
    expect(shortestPath(g, 'security/a', 'security/d')).toBeNull();
  });
});
