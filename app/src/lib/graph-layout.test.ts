import { describe, expect, it } from 'vitest';
import {
  backbone,
  bandGradient,
  bundleControls,
  clusterBundles,
  depthLanes,
  domainBands,
  effectiveHome,
  effectivePaint,
  facingAngle,
  galaxyLayout,
  levelAngle,
  pageRank,
  relativeControls,
  rotateAbout,
  termVisible,
  timeLanes,
  yearX,
} from './graph-layout';
import { clusterColour, domainColour } from './graph-style';

const on = (...d: string[]) => new Set(d);

describe('termVisible (A85)', () => {
  it('shows a term while at least one of its domains is enabled', () => {
    expect(termVisible({ domain: ['cs', 'security'] }, on('security'))).toBe(true);
    expect(termVisible({ domain: ['cs', 'security'] }, on('cs'))).toBe(true);
    expect(termVisible({ domain: ['cs'] }, on('security', 'ai'))).toBe(false);
    expect(termVisible({ domain: ['cs', 'security'] }, on())).toBe(false);
  });
});

describe('effectiveHome / effectivePaint', () => {
  const firewall = { domain: ['cs', 'security'], cluster: 'networking' };
  it('keeps the cluster domain while it is enabled', () => {
    expect(effectiveHome(firewall)).toBe('cs');
    expect(effectiveHome(firewall, on('cs', 'security'))).toBe('cs');
    expect(effectivePaint(firewall, on('cs', 'security'))).toEqual({
      fill: clusterColour('networking', 'cs'),
      ring: domainColour('security'),
    });
  });
  it('re-homes a shared term to an enabled domain, with no ring for a disabled one', () => {
    expect(effectiveHome(firewall, on('security'))).toBe('security');
    expect(effectivePaint(firewall, on('security'))).toEqual({
      fill: domainColour('security'),
      ring: null,
    });
    expect(effectivePaint({ domain: ['ai', 'security'], cluster: 'ai-risk' }, on('ai')).ring).toBe(
      null,
    );
  });
});

describe('domainBands / bandGradient (A85)', () => {
  const firewall = { domain: ['cs', 'security'], cluster: 'networking' };
  it('gives a shared term one band per enabled domain, home first', () => {
    expect(domainBands(firewall)).toEqual([domainColour('cs'), domainColour('security')]);
    expect(domainBands(firewall, on('security', 'cs'))).toEqual([
      domainColour('cs'),
      domainColour('security'),
    ]);
    expect(domainBands(firewall, on('security'))).toEqual([]);
    expect(domainBands({ domain: ['ai'], cluster: 'llm' })).toEqual([]);
  });
  it('re-homes the first band when the home domain is off', () => {
    const t = { domain: ['cs', 'security', 'ai'], cluster: 'networking' };
    expect(domainBands(t, on('security', 'ai'))).toEqual([
      domainColour('security'),
      domainColour('ai'),
    ]);
  });
  it('makes hard-edged bands: halves for two, thirds for three', () => {
    expect(bandGradient(['#a', '#b'])).toEqual({
      colours: '#a #a #b #b',
      stops: '0% 50% 50% 100%',
    });
    expect(bandGradient(['#a', '#b', '#c']).stops).toBe('0% 33.333% 33.333% 66.667% 66.667% 100%');
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
});

describe('pageRank', () => {
  it('ranks what many terms point at highest, normalised to 1', () => {
    const r = pageRank(
      ['a', 'b', 'c', 'hub'],
      [
        { source: 'a', target: 'hub' },
        { source: 'b', target: 'hub' },
        { source: 'c', target: 'hub' },
      ],
    );
    expect(r.get('hub')).toBe(1);
    expect(r.get('a')!).toBeLessThan(1);
  });
  it('counts symmetric relationships both ways', () => {
    const r = pageRank(['a', 'b'], [{ source: 'a', target: 'b', directed: false }]);
    expect(r.get('a')).toBeCloseTo(r.get('b')!);
  });
});

describe('clusterBundles', () => {
  it('counts relationships per cluster pair, regardless of direction', () => {
    const cl: Record<string, string> = { a: 'p', b: 'p', c: 'q', d: 'q', e: 'r' };
    const b = clusterBundles(
      [
        { source: 'a', target: 'c' },
        { source: 'd', target: 'b' },
        { source: 'a', target: 'b' },
        { source: 'a', target: 'e' },
      ],
      (id) => cl[id],
      2,
    );
    expect(b).toEqual([{ a: 'p', b: 'q', count: 2 }]);
  });
});

describe('bundle control points', () => {
  it('turns absolute points back into edge-relative weights and distances', () => {
    const r = relativeControls({ x: 0, y: 0 }, { x: 10, y: 0 }, [
      { x: 5, y: 3 },
      { x: 2.5, y: -1 },
    ]);
    expect(r.weights).toEqual([0.5, 0.25]);
    expect(Math.abs(r.distances[0])).toBeCloseTo(3);
    expect(Math.sign(r.distances[0])).toBe(-Math.sign(r.distances[1]));
  });
  it('bends an edge towards its islands’ centres by beta', () => {
    const s = { x: 0, y: 0 };
    const t = { x: 30, y: 0 };
    const straight = bundleControls(s, t, { x: 10, y: 0 }, { x: 20, y: 0 }, 0.8);
    expect(straight.distances.every((d) => Math.abs(d) < 1e-9)).toBe(true);
    const bent = bundleControls(s, t, { x: 10, y: 20 }, { x: 20, y: 20 }, 0.5);
    expect(Math.abs(bent.distances[0])).toBeCloseTo(10);
    expect(bent.weights[0]).toBeCloseTo(1 / 3);
  });
});

describe('facingAngle / rotateAbout', () => {
  it('finds the rotation that turns points towards their targets', () => {
    const a = facingAngle([{ p: { x: 1, y: 0 }, t: { x: 0, y: 1 } }]);
    expect(a).toBeCloseTo(Math.PI / 2);
    const p = rotateAbout({ x: 2, y: 1 }, { x: 1, y: 1 }, a);
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(2);
  });
  it('levels a tall cloud so its long axis is horizontal', () => {
    const tall = [
      { x: 0, y: -100 },
      { x: 5, y: 0 },
      { x: 0, y: 100 },
    ];
    const a = levelAngle(tall);
    const turned = tall.map((p) => rotateAbout(p, { x: 0, y: 0 }, a));
    const w = Math.max(...turned.map((p) => p.x)) - Math.min(...turned.map((p) => p.x));
    const h = Math.max(...turned.map((p) => p.y)) - Math.min(...turned.map((p) => p.y));
    expect(w).toBeGreaterThan(h);
  });
  it('is 0 with nothing to face', () => {
    expect(facingAngle([])).toBe(0);
  });
});

const term = (id: string, domain: string, cluster: string, depth = 0, era?: number) => ({
  id,
  domain: [domain],
  cluster,
  depth,
  era,
});

describe('depthLanes', () => {
  const nodes = [
    term('s0', 'security', 'fundamentals', 0),
    term('s1', 'security', 'fundamentals', 1),
    term('c0', 'cs', 'networking', 0),
    term('c1', 'cs', 'networking', 1),
    term('c2', 'cs', 'networking', 1),
  ];
  const { positions, lanes, ticks } = depthLanes(nodes, [{ source: 'c2', target: 'c0' }]);
  it('puts foundations at the bottom, one lane per domain, rows shared across lanes', () => {
    expect(positions.s1.y).toBeLessThan(positions.s0.y);
    expect(positions.s0.y).toBe(positions.c0.y);
    expect(positions.s1.y).toBe(positions.c1.y);
    expect(lanes.map((l) => l.domain)).toEqual(['security', 'cs']);
    expect(Math.max(positions.s0.x, positions.s1.x)).toBeLessThan(
      Math.min(positions.c0.x, positions.c1.x, positions.c2.x),
    );
    expect(ticks.map((t) => t.label)).toEqual(['0', '1']);
  });
  it('wraps long rows so a lane stays compact', () => {
    const many = Array.from({ length: 60 }, (_, i) => term(`t${i}`, 'ai', 'llm', 0));
    const p = depthLanes(many, []).positions;
    const ys = new Set(Object.values(p).map((q) => q.y));
    expect(ys.size).toBeGreaterThan(1);
    const xs = Object.values(p).map((q) => q.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(60 * 48);
  });
  it('is deterministic', () => {
    expect(depthLanes(nodes, [])).toEqual(depthLanes([...nodes].reverse(), []));
  });
});

describe('timeLanes', () => {
  const nodes = [
    term('a', 'security', 'fundamentals', 0, 1995),
    term('b', 'security', 'fundamentals', 0, 1995),
    term('c', 'cs', 'networking', 0, 2010),
    term('u', 'cs', 'networking', 0),
  ];
  const t = timeLanes(nodes);
  it('hides undated terms instead of piling them into a grid', () => {
    expect(t.hidden).toEqual(['u']);
    expect(t.positions.u).toBeUndefined();
  });
  it('orders by year and stacks terms of one year', () => {
    expect(t.positions.a.x).toBe(t.positions.b.x);
    expect(t.positions.a.y).not.toBe(t.positions.b.y);
    expect(t.positions.c.x).toBeGreaterThan(t.positions.a.x);
    expect(t.lanes.map((l) => l.domain)).toEqual(['security', 'cs']);
  });
  it('compresses the sparse early years', () => {
    expect(yearX(1970, 1950) - yearX(1960, 1950)).toBeLessThan(
      yearX(2000, 1950) - yearX(1990, 1950),
    );
  });
});

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
