import { describe, expect, it } from 'vitest';
import { galaxyLayout } from '../graph-layout';
import { EXPLORER } from '../explorer-config';
import { galaxyAnchors } from './galaxy';
import { term } from './test-fixtures';

describe('galaxyLayout', () => {
  const nodes = [
    ...Array.from({ length: 12 }, (_, i) => term(`s${i}`, 'security', `sc${i % 2}`, i % 3)),
    ...Array.from({ length: 12 }, (_, i) => term(`a${i}`, 'ai', `ac${i % 2}`, i % 3)),
    { id: 'bridge', domain: ['security', 'ai'], cluster: 'sc0', depth: 1 },
  ];
  const links = [
    { source: 's0', target: 's1' },
    { source: 'a0', target: 'a1' },
    { source: 'bridge', target: 'a0' },
  ];
  const pos = galaxyLayout(nodes, links);
  const centre = (p: string) => {
    const ps = [...pos.entries()].filter(([id]) => id.startsWith(p) && id !== 'bridge');
    return {
      x: ps.reduce((s, [, q]) => s + q.x, 0) / ps.length,
      z: ps.reduce((s, [, q]) => s + q.z, 0) / ps.length,
    };
  };
  it('separates domains into galaxies', () => {
    const s = centre('s');
    const a = centre('a');
    expect(Math.hypot(s.x - a.x, s.z - a.z)).toBeGreaterThan(600);
  });
  it('puts a shared term between its galaxies', () => {
    const s = centre('s');
    const a = centre('a');
    const b = pos.get('bridge')!;
    const toS = Math.hypot(b.x - s.x, b.z - s.z);
    const toA = Math.hypot(b.x - a.x, b.z - a.z);
    expect(Math.max(toS, toA)).toBeLessThan(Math.hypot(s.x - a.x, s.z - a.z));
    expect(Math.min(toS, toA)).toBeGreaterThan(100);
  });
  it('is deterministic and volumetric (not a floor)', () => {
    expect(galaxyLayout(nodes, links)).toEqual(pos);
    const floor = [...pos.values()].filter((p) => Math.abs(p.y - pos.get('s0')!.y) < 1).length;
    expect(floor).toBeLessThan(4);
  });
});

describe('galaxyAnchors', () => {
  it('spaces domain galaxies evenly round the ring, in domain order', () => {
    const r = EXPLORER.three.ringRadius;
    const anchors = galaxyAnchors([term('p', 'platform', 'cloud'), term('s', 'security', 'x')]);
    expect([...anchors.keys()]).toEqual(['security', 'platform']);
    expect(anchors.get('security')!.x).toBeCloseTo(r);
    expect(anchors.get('platform')!.x).toBeCloseTo(-r);
    expect(anchors.get('platform')!.z).toBeCloseTo(0);
  });
});
