import cytoscape from 'cytoscape';
import { describe, expect, it } from 'vitest';
import { EXPLORER } from '../explorer-config';
import { buildIslands, groupClusters, islandDomain, islandMap, shapeIsland } from './islands';
import { mapElements } from './elements';
import { mapStylesheet } from './style';
import { FIXTURE } from './test-fixture';

/** The fixture's terms and relationships on a headless instance, styled like the map. */
const headless = () =>
  cytoscape({
    headless: true,
    elements: mapElements(FIXTURE, 'en', 'dark'),
    style: mapStylesheet('dark'),
  });
const links = FIXTURE.links;
const byId = new Map(FIXTURE.nodes.map((n) => [n.id, n]));
const graph = { links, clusterOf: (id: string) => byId.get(id)?.cluster };
const everyone = new Set(FIXTURE.nodes.map((n) => n.id));
const round = (ps: Record<string, { x: number; y: number }>) =>
  Object.fromEntries(Object.entries(ps).map(([k, p]) => [k, [Math.round(p.x), Math.round(p.y)]]));

describe('groupClusters', () => {
  it('groups terms by cluster, clusters in a stable order', () => {
    const { clusters, clusterIds } = groupClusters(FIXTURE.nodes);
    expect(clusterIds).toEqual(['awareness', 'fundamentals', 'networking']);
    expect(clusters.get('networking')!.map((n) => n.id)).toEqual([
      'cs/network',
      'cs/protocol',
      'cs/firewall',
    ]);
  });
});

describe('shapeIsland', () => {
  it('spreads crowded terms to a click target and a label apart, centred', () => {
    const { offsets, r } = shapeIsland(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [20, 20],
    );
    const { factor, labelClearance } = EXPLORER.spacing;
    const gap = Math.hypot(offsets[0].x - offsets[1].x, offsets[0].y - offsets[1].y);
    expect(gap).toBeGreaterThanOrEqual((factor * 40) / 4 + labelClearance - 1e-6);
    expect(offsets[0].x + offsets[1].x).toBeCloseTo(0);
    expect(r).toBeCloseTo(Math.hypot(offsets[0].x, offsets[0].y) + 10 + 16);
  });
  it('leaves spread-out terms where they are; the lab tune tightens and pads', () => {
    const raw = [
      { x: -100, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(shapeIsland(raw, [10, 10])).toEqual({
      offsets: [
        { x: -100, y: 0 },
        { x: 100, y: 0 },
      ],
      r: 100 + 5 + 16,
    });
    const tuned = shapeIsland(raw, [10, 10], { spacing: 1, tight: 0.5, gap: 70 });
    expect(tuned.offsets[1]).toEqual({ x: 50, y: 0 });
    expect(tuned.r).toBe(50 + 5 + 16 + 35);
  });
});

describe('islandDomain', () => {
  it('is the home most terms vote for, ties alphabetical', () => {
    const [cia, threat, , , , , network, protocol, firewall] = FIXTURE.nodes;
    expect(islandDomain([network, protocol, firewall])).toBe('cs');
    expect(islandDomain([cia, threat, firewall])).toBe('security');
    expect(islandDomain([cia, firewall])).toBe('cs');
    // With cs switched off, the shared firewall's home is security.
    expect(islandDomain([cia, firewall], new Set(['security']))).toBe('security');
  });
});

describe('islandMap (characterization: a fixed seed lays the fixture out the same)', () => {
  const g = buildIslands(headless(), FIXTURE.nodes);
  const map = islandMap(g, graph, everyone, true);

  it('places every term, offset from its island centre', () => {
    expect(Object.keys(map.positions).sort()).toEqual([...everyone].sort());
    for (const [c, mine] of map.members)
      for (const n of mine) {
        const o = g.offset.get(n.id)!;
        const d = Math.hypot(o.x, o.y);
        expect(d).toBeLessThanOrEqual(g.islandR.get(c)!);
      }
  });
  it('packs islands apart and gives each its domain', () => {
    expect(map.islands.map((i) => [i.id, i.domain])).toEqual([
      ['awareness', 'security'],
      ['fundamentals', 'security'],
      ['networking', 'cs'],
    ]);
    const [a, b, c] = map.islands.map((i) => ({ ...map.centre[i.id], r: i.r }));
    for (const [p, q] of [
      [a, b],
      [a, c],
      [b, c],
    ])
      expect(Math.hypot(p.x - q.x, p.y - q.y)).toBeGreaterThan(p.r + q.r);
    expect(Object.keys(map.regions).sort()).toEqual(['cs', 'security']);
  });
  it('is deterministic and pinned', () => {
    const again = islandMap(buildIslands(headless(), FIXTURE.nodes), graph, everyone, true);
    expect(round(again.positions)).toEqual(round(map.positions));
    expect(round(map.positions)).toEqual(PINNED);
  });
  it('turns a quarter for a tall screen; hidden terms drop out', () => {
    const tall = islandMap(g, graph, everyone, false);
    const w = (ps: typeof map.positions) => {
      const xs = Object.values(ps).map((p) => p.x);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(w(tall.positions)).toBeLessThan(w(map.positions));
    const some = new Set(['cs/network', 'cs/protocol', 'security/cia']);
    const part = islandMap(g, graph, some, true);
    expect(Object.keys(part.positions).sort()).toEqual([...some].sort());
    expect(part.islands.map((i) => i.id)).toEqual(['fundamentals', 'networking']);
  });
});

/** The fixture's island map at `LAYOUT_SEED`, rounded (landscape). */
const PINNED = {
  'cs/firewall': [-277, -5],
  'cs/network': [-277, -68],
  'cs/protocol': [-215, -68],
  'security/cia': [13, -79],
  'security/mfa': [260, -79],
  'security/phishing': [260, -17],
  'security/risk': [76, -74],
  'security/threat': [112, -22],
  'security/vulnerability': [48, -17],
};
