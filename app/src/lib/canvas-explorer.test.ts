import { describe, expect, it } from 'vitest';
import {
  HitGrid,
  LAB,
  domainOrder,
  labBackbone,
  labLayout,
  minClearance,
  phaseOf,
  project,
  pulseAt,
  radii,
  searchTerms,
  spaceOut,
  springAtRest,
  springStep,
} from './canvas-explorer';

const node = (id: string, cluster: string, domain: string[], depth: number) => ({
  id,
  cluster,
  domain,
  depth,
  term: { en: id, da: id },
});

// 60 terms over two domains, several clusters, a few shared terms.
const nodes = Array.from({ length: 60 }, (_, i) =>
  node(
    `t${i}`,
    i < 30 ? `cs-c${i % 3}` : `sec-c${i % 2}`,
    i < 30 ? (i % 10 === 0 ? ['cs', 'security'] : ['cs']) : ['security'],
    i % 5,
  ),
);
const links = nodes.slice(1).map((n, i) => ({
  source: n.id,
  target: nodes[i].id,
  weight: 1 + (i % 3),
  family: i % 4 === 0 ? 'dependency' : 'association',
  type: i % 4 === 0 ? 'requires' : 'used-with',
}));

describe('labLayout', () => {
  const r = radii(nodes, links);
  const rad = (id: string) => r.get(id)!.r;
  const pos = labLayout(nodes, links, rad);

  it('places every term, deterministically', () => {
    expect(pos.size).toBe(nodes.length);
    expect(labLayout(nodes, links, rad)).toEqual(pos);
  });

  it('leaves no two nodes overlapping in the front view', () => {
    const P = nodes.map((n) => pos.get(n.id)!);
    expect(
      minClearance(
        P,
        nodes.map((n) => rad(n.id)),
      ),
    ).toBeGreaterThanOrEqual(LAB.gap - 0.01);
  });

  it('keeps deeper terms higher on average (y up is negative)', () => {
    const meanY = (d: number) => {
      const ys = nodes.filter((n) => n.depth === d).map((n) => pos.get(n.id)!.y);
      return ys.reduce((s, y) => s + y, 0) / ys.length;
    };
    expect(meanY(4)).toBeLessThan(meanY(0));
  });

  it('seats a shared term with its primary domain (by cluster)', () => {
    const csX = nodes.filter((n) => n.cluster.startsWith('cs')).map((n) => pos.get(n.id)!.x);
    const secX = nodes.filter((n) => n.cluster.startsWith('sec')).map((n) => pos.get(n.id)!.x);
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(Math.abs(mean(csX) - mean(secX))).toBeGreaterThan(100);
    // t0 is cs + security, in a cs cluster: it sits among the cs terms.
    const x0 = pos.get('t0')!.x;
    expect(Math.abs(x0 - mean(csX))).toBeLessThan(Math.abs(x0 - mean(secX)));
  });
});

describe('spaceOut', () => {
  it('separates coincident and overlapping discs', () => {
    const P = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 3, y: 1 },
      { x: 50, y: 50 },
    ];
    const r = [10, 10, 5, 4];
    spaceOut(P, r, 2);
    expect(minClearance(P, r)).toBeGreaterThanOrEqual(2 - 1e-6);
  });

  it('does nothing when already spaced', () => {
    const P = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    expect(spaceOut(P, [5, 5], 2)).toBe(1);
    expect(P[1]).toEqual({ x: 100, y: 0 });
  });
});

describe('project', () => {
  it('is the identity in the flat front view', () => {
    const p = project({ x: 12, y: -7, z: 300 }, { yaw: 0, pitch: 0 }, Infinity);
    expect(p).toEqual({ x: 12, y: -7, z: 300, s: 1 });
  });

  it('turns a quarter yaw so +x goes away from the viewer', () => {
    const p = project({ x: 100, y: 0, z: 0 }, { yaw: Math.PI / 2, pitch: 0 }, Infinity);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(100);
  });

  it('shrinks far points and enlarges near ones', () => {
    const far = project({ x: 100, y: 0, z: 500 }, { yaw: 0, pitch: 0 }, 1000);
    const near = project({ x: 100, y: 0, z: -500 }, { yaw: 0, pitch: 0 }, 1000);
    expect(far.s).toBeLessThan(1);
    expect(near.s).toBeGreaterThan(1);
    expect(Math.abs(far.x)).toBeLessThan(Math.abs(near.x));
  });
});

describe('springStep', () => {
  it('returns a pulled node to rest, overshooting at most a little', () => {
    let [o, v] = [100, 0];
    let min = 0;
    for (let i = 0; i < 240; i++) {
      [o, v] = springStep(o, v, 1 / 60);
      min = Math.min(min, o);
    }
    expect(springAtRest(o, v)).toBe(true);
    expect(min).toBeLessThan(0); // elastic: it swings past …
    expect(min).toBeGreaterThan(-30); // … but damped
  });
});

describe('HitGrid', () => {
  it('finds the frontmost disc under the pointer and misses empty space', () => {
    const xs = new Float32Array([10, 12, 200]);
    const ys = new Float32Array([10, 10, 200]);
    const rs = new Float32Array([8, 8, 8]);
    const order = new Int32Array([0, 1, 2]);
    const g = new HitGrid(40);
    g.build(xs, ys, rs, () => true);
    expect(g.nearest(11, 10, xs, ys, rs, order)).toBe(1);
    expect(g.nearest(100, 100, xs, ys, rs, order)).toBe(-1);
    g.build(xs, ys, rs, (i) => i !== 1);
    expect(g.nearest(11, 10, xs, ys, rs, order)).toBe(0);
  });
});

describe('labBackbone', () => {
  it('keeps every requires link', () => {
    const chosen = labBackbone(nodes, links, 1);
    links.forEach((l, i) => {
      if (l.type === 'requires') expect(chosen.has(i)).toBe(true);
    });
    expect(chosen.size).toBeLessThanOrEqual(links.length);
  });
});

describe('pulses', () => {
  it('moves forward in time and wraps', () => {
    const a = pulseAt(0, 200, 0.25);
    const b = pulseAt(500, 200, 0.25);
    expect(a).toBeCloseTo(0.25);
    expect(b).toBeGreaterThan(a);
    expect(pulseAt(1e7, 200, 0)).toBeLessThan(1);
  });
  it('phases are stable and in [0, 1)', () => {
    expect(phaseOf('a→b')).toBe(phaseOf('a→b'));
    expect(phaseOf('a→b')).toBeGreaterThanOrEqual(0);
    expect(phaseOf('a→b')).toBeLessThan(1);
  });
});

describe('domainOrder / searchTerms', () => {
  it('orders domains canonically', () => {
    expect(domainOrder(['zzz', 'security', 'cs'])).toEqual([
      ...domainOrder(['security', 'cs']),
      'zzz',
    ]);
  });
  it('ranks exact and prefix matches first', () => {
    const ns = [node('x/api-key', 'c', ['cs'], 0), node('x/api', 'c', ['cs'], 0)];
    ns[0].term.en = 'API key';
    ns[1].term.en = 'API';
    expect(searchTerms(ns, 'api', 'en').map((n) => n.id)).toEqual(['x/api', 'x/api-key']);
    expect(searchTerms(ns, '  ', 'en')).toEqual([]);
  });
});
