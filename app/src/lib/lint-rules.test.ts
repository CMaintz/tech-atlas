import { describe, expect, it } from 'vitest';
import { makeRefResolver } from './graph-model';
import {
  circularDefinitions,
  depthHistogram,
  draftRatioByDomain,
  missingPrerequisites,
  redundantChildren,
  type RuleTerm,
} from './lint-rules';

const facet = (en: string) => ({ en, da: en });
const term = (
  id: string,
  edges: RuleTerm['edges'] = {},
  summary = 'Plain words.',
  name = id.split('/').pop()!,
): RuleTerm => ({
  id,
  term: { en: name, da: name },
  summary: { en: summary, da: summary },
  body: { plain: facet('Plain words.') },
  edges,
});
const resolverFor = (terms: RuleTerm[]) => makeRefResolver(terms.map((t) => t.id));

describe('redundantChildren (W2)', () => {
  const parent = term('security/phishing', { exploits: ['trust'], 'contrasts-with': ['spam'] });
  const others = [term('security/trust'), term('security/spam'), term('security/sms')];

  it('flags a child whose edges are a subset of its parent and whose summary names it', () => {
    const child = term(
      'security/spear-phishing',
      { 'kind-of': ['phishing'], exploits: ['trust'] },
      'Phishing aimed at one chosen person.',
    );
    const all = [parent, child, ...others];
    expect(redundantChildren(all, resolverFor(all))).toEqual([
      { id: 'security/spear-phishing', parent: 'security/phishing' },
    ]);
  });

  it('does not flag a child with an edge the parent lacks', () => {
    const child = term(
      'security/smishing',
      { 'kind-of': ['phishing'], requires: ['sms'] },
      'Phishing sent by text message.',
    );
    const all = [parent, child, ...others];
    expect(redundantChildren(all, resolverFor(all))).toEqual([]);
  });

  it('does not flag a subset child whose summary stands alone', () => {
    const child = term('security/whaling', { 'kind-of': ['phishing'] }, 'A lure aimed at bosses.');
    const all = [parent, child, ...others];
    expect(redundantChildren(all, resolverFor(all))).toEqual([]);
  });

  it('matches the parent name as a whole word, in either language, abbreviation included', () => {
    const ids = term('security/ids', {}, 'x', 'Intrusion detection system (IDS)');
    const hids = term('security/hids', { 'kind-of': ['ids'] }, 'An IDS on one machine.');
    const idsy = term('security/idsy', { 'kind-of': ['ids'] }, 'IDSY is something else.');
    const all = [ids, hids, idsy];
    expect(redundantChildren(all, resolverFor(all))).toEqual([
      { id: 'security/hids', parent: 'security/ids' },
    ]);
  });
});

describe('missingPrerequisites (W3)', () => {
  it('flags terms that require nothing and that nothing requires', () => {
    const all = [
      term('cs/network'),
      term('cs/router', { requires: ['network'] }),
      term('cs/nudging', { 'kind-of': ['network'] }),
    ];
    expect(missingPrerequisites(all, resolverFor(all))).toEqual(['cs/nudging']);
  });
});

describe('circularDefinitions (E5)', () => {
  const graph: Record<string, string[]> = {
    a: ['b'],
    b: ['c'],
    c: ['a'],
    d: ['e'],
    e: ['d'],
    f: ['a'],
  };
  const names = (id: string) => graph[id] ?? [];

  it('finds every loop of ungrounded terms', () => {
    expect(circularDefinitions(Object.keys(graph), names, () => false)).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
  });

  it('a grounded term anywhere in the loop breaks it', () => {
    expect(circularDefinitions(Object.keys(graph), names, (id) => id === 'b')).toEqual([
      ['d', 'e'],
    ]);
  });

  it('ignores self-mentions and names outside the term set', () => {
    const g: Record<string, string[]> = { a: ['a', 'zz'], b: [] };
    expect(
      circularDefinitions(
        ['a', 'b'],
        (id) => g[id],
        () => false,
      ),
    ).toEqual([]);
  });

  it('handles long chains without recursion', () => {
    const ids = Array.from({ length: 20000 }, (_, i) => `t${i}`);
    const next = (id: string) => [`t${(Number(id.slice(1)) + 1) % ids.length}`];
    expect(circularDefinitions(ids, next, () => false)[0]).toHaveLength(20000);
  });
});

describe('reports', () => {
  it('depthHistogram counts terms per depth, filling gaps with zero', () => {
    expect(depthHistogram([0, 0, 1, 3])).toEqual([2, 1, 0, 1]);
    expect(depthHistogram([])).toEqual([]);
  });

  it('draftRatioByDomain counts a term once per domain tag', () => {
    expect(
      draftRatioByDomain([
        { domain: ['security', 'cs'], draft: true },
        { domain: ['cs'], draft: false },
      ]),
    ).toEqual([
      { domain: 'cs', drafts: 1, total: 2 },
      { domain: 'security', drafts: 1, total: 1 },
    ]);
  });
});
