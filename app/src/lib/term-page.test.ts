import { describe, expect, it } from 'vitest';
import type { Source } from '../schema';
import { FAMILY } from './graph-model';
import { termUrl, url } from './site';
import {
  authoredType,
  relationsByType,
  sourcesByTier,
  termCrumbs,
  termJsonLd,
  termNeighbourhood,
} from './term-page';
import type { Relation, TermEntry } from './terms';

const entry = (id: string, aka: string[] = []) =>
  ({
    id,
    data: {
      term: { en: `${id} (en)`, da: `${id} (da)` },
      aka: { en: aka, da: [] },
      summary: { en: 'A summary.', da: 'Et resumé.' },
      domain: ['security'],
      cluster: 'identity',
    },
  }) as unknown as TermEntry;

const rel = (type: string, target: string, generated = false): Relation => ({
  type,
  generated,
  target: entry(target),
});

describe('relationsByType', () => {
  it('groups in reading order and leaves out empty types', () => {
    const groups = relationsByType([
      rel('unlocks', 'c'),
      rel('requires', 'b'),
      rel('requires', 'd'),
    ]);
    expect(groups.map((g) => [g.type, g.items.map((r) => r.target.id)])).toEqual([
      ['requires', ['b', 'd']],
      ['unlocks', ['c']],
    ]);
  });
});

describe('authoredType', () => {
  it('turns a generated inverse back into the authored type', () => {
    expect(authoredType(rel('unlocks', 'b', true))).toBe('requires');
    expect(authoredType(rel('contrasts-with', 'b', true))).toBe('contrasts-with');
    expect(authoredType(rel('requires', 'b'))).toBe('requires');
  });
});

describe('termNeighbourhood', () => {
  it('puts the term first, then each related term once', () => {
    const g = termNeighbourhood(
      entry('a'),
      [rel('requires', 'b'), rel('contrasts-with', 'b'), rel('unlocks', 'c', true)],
      'en',
    );
    expect(g.nodes.map((n) => [n.id, n.focus, n.label])).toEqual([
      ['a', true, 'a (en)'],
      ['b', false, 'b (en)'],
      ['c', false, 'c (en)'],
    ]);
  });
  it('draws each edge in its authored direction', () => {
    const g = termNeighbourhood(
      entry('a'),
      [rel('requires', 'b'), rel('unlocks', 'c', true)],
      'en',
    );
    expect(g.edges.map((e) => [e.source, e.type, e.target])).toEqual([
      ['a', 'requires', 'b'],
      ['c', 'requires', 'a'],
    ]);
    expect(g.edges[0].family).toBe(FAMILY.requires);
  });
});

describe('sourcesByTier', () => {
  it('orders tiers best first and drops empty ones', () => {
    const src = (title: string, tier: Source['tier']) => ({ title, tier }) as Source;
    const groups = sourcesByTier([
      src('Blog', 'other'),
      src('ISO', 'standard'),
      src('Wiki', 'other'),
    ]);
    expect(groups.map((g) => [g.tier, g.items.map((s) => s.title)])).toEqual([
      ['standard', ['ISO']],
      ['other', ['Blog', 'Wiki']],
    ]);
  });
});

describe('termCrumbs', () => {
  it('links the index, the primary domain and the cluster', () => {
    const crumbs = termCrumbs(entry('security/mfa'), 'en', 'Index');
    expect(crumbs.map((c) => c.href)).toEqual([
      url('en/'),
      url('en/#domain-security'),
      url('en/#cluster-security-identity'),
    ]);
    expect(crumbs[0].label).toBe('Index');
  });
});

describe('termJsonLd', () => {
  const site = new URL('https://example.org/');
  it('describes the term as a DefinedTerm in the Atlas set', () => {
    const ld = termJsonLd(entry('security/mfa', ['2FA']), 'en', site);
    expect(ld['@type']).toBe('DefinedTerm');
    expect(ld.url).toBe(new URL(termUrl('en', 'security/mfa'), site).href);
    expect(ld.alternateName).toEqual(['2FA']);
    expect(ld.inDefinedTermSet.name).toBe('Atlas');
  });
  it('leaves out alternateName when the term has no other names', () => {
    expect('alternateName' in termJsonLd(entry('security/mfa'), 'en', site)).toBe(false);
  });
});
