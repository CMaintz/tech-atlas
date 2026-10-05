import { describe, expect, it } from 'vitest';
import { buildModel, domainGroups, endId, hubsOf, neighbourSets, radiusBy } from './model';
import { graph } from './testing/fixture';
import type { Link3 } from './types';

describe('endId', () => {
  it('reads an endpoint before and after 3d-force-graph swaps in node objects', () => {
    expect(endId('cs/ip')).toBe('cs/ip');
    expect(endId({ id: 'cs/ip', x: 1 })).toBe('cs/ip');
  });
});

describe('buildModel', () => {
  const model = buildModel(graph);
  it('fixes every term where it sits', () => {
    for (const n of model.nodes) expect([n.fx, n.fy, n.fz]).toEqual([n.x, n.y, n.z]);
  });
  it('keeps terms a click target and a label apart', () => {
    const [p, q] = [model.byId.get('cs/tcp')!, model.byId.get('cs/ip')!];
    expect(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z)).toBeGreaterThan(10);
  });
  it('is deterministic', () => {
    const again = buildModel(graph);
    expect(again.nodes.map((n) => [n.x, n.y, n.z])).toEqual(
      model.nodes.map((n) => [n.x, n.y, n.z]),
    );
  });
  it('indexes links and starts with no backbone', () => {
    expect(model.links.map((l) => [l.i, l.bb])).toEqual(graph.links.map((_, i) => [i, false]));
  });
});

describe('radiusBy', () => {
  it('grows a sphere with the square root of its rank', () => {
    const radius = radiusBy(new Map([['big', 0.25]]));
    expect(radius({ id: 'big' } as never)).toBeCloseTo(3.2 * (1.2 + 2.5));
    expect(radius({ id: 'none' } as never)).toBeCloseTo(3.2 * 1.2);
  });
});

describe('neighbourSets', () => {
  it('holds each term and everything one relationship away', () => {
    const links = [{ source: 'a', target: 'b' }] as Link3[];
    const sets = neighbourSets([{ id: 'a' }, { id: 'b' }, { id: 'c' }], links);
    expect([...sets.get('a')!]).toEqual(['a', 'b']);
    expect([...sets.get('c')!]).toEqual(['c']);
  });
});

describe('hubsOf', () => {
  it('takes the most central terms, most central first', () => {
    const rank = new Map([
      ['a', 0.1],
      ['b', 0.5],
      ['c', 0.3],
    ]);
    expect(hubsOf([{ id: 'a' }, { id: 'b' }, { id: 'c' }], rank, 2).map((n) => n.id)).toEqual([
      'b',
      'c',
    ]);
  });
});

describe('domainGroups', () => {
  it('names each galaxy over its centre, above its highest term', () => {
    const at = (id: string, cluster: string, x: number, y: number, z: number) =>
      ({ id, cluster, domain: [], x, y, z }) as never;
    const groups = domainGroups([
      at('s1', 'fundamentals', 0, 5, 0),
      at('n1', 'networking', 10, 0, 10),
      at('s2', 'controls', 10, 9, 20),
    ]);
    expect(groups).toEqual([
      { domain: 'security', ids: ['s1', 's2'], x: 5, z: 10, top: 9 },
      { domain: 'cs', ids: ['n1'], x: 10, z: 10, top: 0 },
    ]);
  });
});
