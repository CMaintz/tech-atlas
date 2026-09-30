import { describe, expect, it } from 'vitest';
import { OVERVIEW_FAMILIES, backbone, backboneOf } from '../graph-layout';
import { FAMILY } from '../graph-model';
import { incidence } from './backbone';

describe('backboneOf', () => {
  const nodes = ['a', 'b', 'c', 'd'].map((id) => ({ id, domain: ['cs'], cluster: 'k' }));
  const L = (source: string, target: string, weight: number, family: string) => ({
    source,
    target,
    weight,
    family,
  });
  const links = [
    L('a', 'b', 5, 'association'),
    L('a', 'c', 4, 'association'),
    L('d', 'b', 3, 'association'),
    L('d', 'c', 3, 'association'),
    L('a', 'd', 1, 'contrast'),
  ];
  it('lets a family that is on fill the slots of one switched off', () => {
    expect(backboneOf(nodes, links, new Set(['association', 'contrast'])).has(4)).toBe(false);
    expect([...backboneOf(nodes, links, new Set(['contrast']))]).toEqual([4]);
  });
  it('strands no visible term: hide AI and data poisoning keeps a visible edge', () => {
    const t = (id: string, domain: string[]) => ({ id, domain, cluster: 'k' });
    const terms = [
      t('ai/data-poisoning', ['ai', 'security']),
      t('ai/training-data', ['ai']),
      t('ai/model-training', ['ai']),
      t('ai/prompt-injection', ['ai', 'security']),
      t('ai/llm', ['ai']),
      t('ai/jailbreak', ['ai']),
    ];
    const edges = [
      L('ai/data-poisoning', 'ai/training-data', 6.3, 'security'),
      L('ai/data-poisoning', 'ai/model-training', 5.9, 'dependency'),
      L('ai/data-poisoning', 'ai/prompt-injection', 2.8, 'security'),
      L('ai/prompt-injection', 'ai/llm', 9, 'security'),
      L('ai/prompt-injection', 'ai/jailbreak', 9, 'security'),
    ];
    const types = new Set(['security', 'dependency']);
    // Over the whole graph its two slots go to AI-only terms: hidden with AI off.
    expect(backboneOf(terms, edges, types).has(2)).toBe(false);
    const securityOnly = new Set(['ai/data-poisoning', 'ai/prompt-injection']);
    expect([...backboneOf(terms, edges, types, securityOnly)]).toEqual([2]);
  });
});

describe('OVERVIEW_FAMILIES (A95)', () => {
  const drawn = (Object.keys(FAMILY) as (keyof typeof FAMILY)[])
    .filter((t) => OVERVIEW_FAMILIES.has(FAMILY[t]))
    .sort();
  it('draws exactly the owner-approved relationship types', () => {
    expect(drawn).toEqual(
      [
        'causes',
        'exploits',
        'implements',
        'kind-of',
        'mandates',
        'mitigates',
        'part-of',
        'requires',
        'supersedes',
      ].sort(),
    );
  });
  it('leaves used-with, contrasts-with and alternative-to out of the overview', () => {
    for (const t of ['used-with', 'contrasts-with', 'alternative-to'] as const)
      expect(OVERVIEW_FAMILIES.has(FAMILY[t])).toBe(false);
  });
  it('is backboneOf’s default: an off type never takes a slot, an on type fills it', () => {
    const nodes = ['a', 'b', 'c'].map((id) => ({ id, domain: ['cs'], cluster: 'k' }));
    const links = [
      { source: 'a', target: 'b', weight: 9, family: 'association', type: 'used-with' },
      { source: 'a', target: 'c', weight: 8, family: 'contrast', type: 'contrasts-with' },
      { source: 'b', target: 'c', weight: 1, family: 'structure', type: 'part-of' },
      {
        source: 'a',
        target: 'c',
        weight: 1,
        family: 'contrast',
        type: 'alternative-to',
        primary: true,
      },
    ];
    const chosen = backboneOf(nodes, links);
    expect([...chosen]).toEqual([2]);
    expect(backboneOf(nodes, links, new Set(['association', 'contrast', 'structure'])).has(0)).toBe(
      true,
    );
  });
});

describe('backbone', () => {
  const nodes = ['a', 'b', 'c', 'd', 'x'].map((id) => ({
    id,
    domain: ['cs'],
    cluster: id === 'x' ? 'other' : 'k',
  }));
  const L = (source: string, target: string, weight: number, family = 'association') => ({
    source,
    target,
    weight,
    family,
  });
  const links = [
    L('a', 'b', 5),
    L('a', 'c', 4),
    L('a', 'd', 1),
    L('b', 'c', 1),
    L('c', 'd', 2, 'structure'),
    L('x', 'a', 9),
  ];
  it('keeps each term’s strongest in-cluster edges, structure counted 1.5×', () => {
    const chosen = backbone(nodes, links, 1);
    expect(chosen.has(0)).toBe(true); // a–b (a's and b's best)
    expect(chosen.has(4)).toBe(true); // c–d: 2 × 1.5 = 3 beats a–d
    expect(chosen.has(2)).toBe(false);
  });
  it('never leaves a connected term without an edge', () => {
    const chosen = backbone(nodes, links, 1);
    expect(chosen.has(5)).toBe(true); // x has no in-cluster edge: keeps its strongest
    for (const n of nodes)
      expect([...chosen].some((i) => links[i].source === n.id || links[i].target === n.id)).toBe(
        true,
      );
  });
  it('is capped by perNode', () => {
    expect(backbone(nodes, links, 1).size).toBeLessThanOrEqual(nodes.length);
  });
  it('always keeps requires and primary edges', () => {
    const extra = [
      ...links,
      { ...L('b', 'd', 0.1), type: 'requires' },
      { ...L('b', 'x', 0.1), primary: true },
    ];
    const chosen = backbone(nodes, extra, 1);
    expect(chosen.has(6)).toBe(true);
    expect(chosen.has(7)).toBe(true);
  });
  it('picks a term’s strongest edges across clusters within its domains', () => {
    const hub = [
      { id: 'h', domain: ['platform'], cluster: 'cloud' },
      { id: 'p', domain: ['platform'], cluster: 'delivery' },
      { id: 'q', domain: ['platform'], cluster: 'delivery' },
      { id: 's', domain: ['security'], cluster: 'identity' },
    ];
    const edges = [L('p', 'h', 2), L('q', 'h', 1.5), L('h', 's', 9)];
    const chosen = backbone(hub, edges, 2);
    expect(chosen.has(0)).toBe(true); // h's links to other clusters of its domain show
    expect(chosen.has(1)).toBe(true);
    expect(chosen.has(2)).toBe(true); // s's only edge: the fallback keeps it
  });
});

describe('incidence', () => {
  it('lists every link at both ends, and as near only when the ends share a domain', () => {
    const nodes = [
      { id: 'a', domain: ['cs'], cluster: 'k' },
      { id: 'b', domain: ['cs', 'ai'], cluster: 'k' },
      { id: 'c', domain: ['ai'], cluster: 'k' },
      { id: 'd', domain: ['security'], cluster: 'k' },
    ];
    const L = (source: string, target: string) => ({ source, target, weight: 1, family: 'x' });
    const { near, any } = incidence(nodes, [L('a', 'b'), L('b', 'c'), L('c', 'd')]);
    expect(Object.fromEntries(any)).toEqual({ a: [0], b: [0, 1], c: [1, 2], d: [2] });
    expect(Object.fromEntries(near)).toEqual({ a: [0], b: [0, 1], c: [1] });
  });
});
