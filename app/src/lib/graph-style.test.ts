import { describe, expect, it } from 'vitest';
import { EDGE_TYPES, type EdgeType } from '../schema';
import { CLUSTER_LABELS } from './site';
import {
  CLUSTER_DOMAIN,
  CLUSTER_HUE_SPREAD,
  DOMAIN_HUES,
  FAMILY_COLOURS,
  clusterColour,
  clusterForce,
  clusterSeedPositions,
  curveOffsets,
  domainColour,
  domainHue,
  edgePaint,
  flowOffset,
  hslToHex,
  hueDistance,
  idealEdgeLength,
  isCrossDomain,
  isDirected,
  legendDomains,
  nodePaint,
  seededRandom,
  withSeededRandom,
} from './graph-style';
import { FAMILY } from './graph-model';

/** Hue (degrees) of a `#rrggbb` colour. */
const hueOf = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

describe('hslToHex', () => {
  it('converts primaries and greys', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
    expect(hslToHex(0, 0, 50)).toBe('#808080');
  });
  it('wraps hues outside 0–360', () => {
    expect(hslToHex(-120, 100, 50)).toBe(hslToHex(240, 100, 50));
    expect(hslToHex(480, 100, 50)).toBe(hslToHex(120, 100, 50));
  });
});

describe('domain colours', () => {
  it('keeps the listed domains well apart on the colour wheel', () => {
    const hues = Object.values(DOMAIN_HUES);
    for (let i = 0; i < hues.length; i++)
      for (let j = i + 1; j < hues.length; j++)
        expect(hueDistance(hues[i], hues[j])).toBeGreaterThanOrEqual(60);
  });
  it('gives a new domain a stable hue clear of every listed one', () => {
    for (const d of ['law', 'hardware', 'finance', 'robotics']) {
      const h = domainHue(d);
      expect(domainHue(d)).toBe(h);
      for (const t of Object.values(DOMAIN_HUES)) expect(hueDistance(h, t)).toBeGreaterThan(30);
    }
    expect(domainColour('law')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('cluster colours', () => {
  it('maps every labelled cluster to a domain', () => {
    expect(Object.keys(CLUSTER_DOMAIN).sort()).toEqual(Object.keys(CLUSTER_LABELS).sort());
    for (const d of Object.values(CLUSTER_DOMAIN)) expect(DOMAIN_HUES).toHaveProperty(d);
  });
  it('shades each cluster within its domain hue band', () => {
    for (const [cluster, domain] of Object.entries(CLUSTER_DOMAIN)) {
      const drift = hueDistance(hueOf(clusterColour(cluster)), DOMAIN_HUES[domain]);
      expect(drift).toBeLessThanOrEqual(CLUSTER_HUE_SPREAD + 2);
    }
  });
  it('gives clusters of one domain distinct colours', () => {
    for (const domain of Object.keys(DOMAIN_HUES)) {
      const colours = Object.entries(CLUSTER_DOMAIN)
        .filter(([, d]) => d === domain)
        .map(([c]) => clusterColour(c));
      expect(new Set(colours).size).toBe(colours.length);
    }
  });
  it('falls back to the domain colour for an unlisted cluster', () => {
    expect(clusterColour('brand-new', 'cs')).toBe(domainColour('cs'));
    expect(clusterColour('brand-new')).toBe('#a3a3a3');
  });
});

describe('nodePaint', () => {
  it('fills by cluster and has no ring for a single-domain term', () => {
    expect(nodePaint({ domain: ['security'], cluster: 'controls' })).toEqual({
      fill: clusterColour('controls'),
      ring: null,
    });
  });
  it("rings a multi-domain term in the other domain's colour", () => {
    const p = nodePaint({ domain: ['security', 'cs'], cluster: 'identity' });
    expect(p.fill).toBe(clusterColour('identity'));
    expect(p.ring).toBe(domainColour('security'));
  });
});

describe('legendDomains', () => {
  it('lists present domains in a stable order with their clusters', () => {
    const legend = legendDomains([
      { domain: ['platform'], cluster: 'cloud' },
      { domain: ['security'], cluster: 'controls' },
      { domain: ['security'], cluster: 'fundamentals' },
      { domain: ['ai', 'security'], cluster: 'llm' },
    ]);
    expect(legend.map((l) => l.domain)).toEqual(['security', 'ai', 'platform']);
    expect(legend[0].clusters.map((c) => c.cluster)).toEqual(['fundamentals', 'controls']);
  });
});

describe('edges', () => {
  it('matches the schema: symmetric types have no direction', () => {
    for (const [type, meta] of Object.entries(EDGE_TYPES))
      expect(isDirected(type as EdgeType)).toBe(!meta.symmetric);
  });
  it('colours every relationship family', () => {
    for (const f of Object.values(FAMILY)) expect(FAMILY_COLOURS[f]).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('detects edges that bridge domains', () => {
    expect(isCrossDomain(['security'], ['cs'])).toBe(true);
    expect(isCrossDomain(['security', 'cs'], ['cs'])).toBe(false);
  });
  it('paints a cross-domain edge with a domain → family → domain gradient', () => {
    const a = { domain: ['security'], cluster: 'controls' };
    const b = { domain: ['cs'], cluster: 'cryptography' };
    const p = edgePaint({ type: 'requires', family: 'dependency' }, a, b);
    expect(p).toEqual({
      colour: FAMILY_COLOURS.dependency,
      directed: true,
      crossDomain: true,
      gradient: [domainColour('security'), FAMILY_COLOURS.dependency, domainColour('cs')],
    });
    const same = edgePaint({ type: 'used-with', family: 'association' }, a, a);
    expect(same.directed).toBe(false);
    expect(same.gradient).toBeNull();
  });
});

describe('curveOffsets', () => {
  it('bends a lone edge a little', () => {
    expect(curveOffsets([{ source: 'a', target: 'b' }])).toEqual([16]);
  });
  it('fans parallel edges out on alternating sides, whichever way they point', () => {
    const [ab, ba, ab2] = curveOffsets([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
      { source: 'a', target: 'b' },
    ]);
    // In the pair's canonical a→b frame: +16, −16, +34 — three distinct lanes.
    expect([ab, -ba, ab2]).toEqual([16, -16, 34]);
  });
});

describe('idealEdgeLength', () => {
  it('is shortest within a cluster and longest across domains', () => {
    const a = { domain: ['security'], cluster: 'controls' };
    const b = { domain: ['security'], cluster: 'compliance' };
    const c = { domain: ['cs'], cluster: 'networking' };
    expect(idealEdgeLength(a, a)).toBeLessThan(idealEdgeLength(a, b));
    expect(idealEdgeLength(a, b)).toBeLessThan(idealEdgeLength(a, c));
  });
});

describe('seeded randomness', () => {
  it('repeats for the same seed and stays in [0, 1)', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('swaps Math.random only for the duration of the call, even on throw', () => {
    const original = Math.random;
    const first = withSeededRandom(1, () => [Math.random(), Math.random()]);
    expect(withSeededRandom(1, () => [Math.random(), Math.random()])).toEqual(first);
    expect(() =>
      withSeededRandom(1, () => {
        throw new Error('x');
      }),
    ).toThrow('x');
    expect(Math.random).toBe(original);
  });
});

describe('clusterForce', () => {
  it('pulls nodes towards their cluster centre in x and z only', () => {
    const nodes = [
      { cluster: 'a', x: 0, z: 0, vx: 0, vz: 0 },
      { cluster: 'a', x: 10, z: 20, vx: 0, vz: 0 },
      { cluster: 'b', x: 100, z: 100, vx: 0, vz: 0 },
    ];
    const f = clusterForce(0.1);
    f.initialize(nodes);
    f(1);
    expect(nodes[0].vx).toBeCloseTo(0.5);
    expect(nodes[0].vz).toBeCloseTo(1);
    expect(nodes[1].vx).toBeCloseTo(-0.5);
    // A lone node has nothing to gather towards.
    expect(nodes[2].vx).toBe(0);
  });
});

describe('flowOffset', () => {
  it('moves the dash pattern backwards over time and wraps each period', () => {
    expect(flowOffset(0)).toBeCloseTo(0);
    expect(flowOffset(500)).toBeLessThan(0);
    expect(flowOffset(500)).toBeGreaterThan(-12);
  });
});

describe('clusterSeedPositions', () => {
  const make = (prefix: string, ids: string[], domain: string, cluster: string) =>
    ids.map((id) => ({ id: `${prefix}/${id}`, domain: [domain], cluster }));
  const nodes = [
    ...make('s', ['a', 'b', 'c', 'd'], 'security', 'controls'),
    ...make('s', ['e', 'f', 'g'], 'security', 'compliance'),
    ...make('c', ['h', 'i', 'j'], 'cs', 'networking'),
  ];
  type P = { x: number; y: number };
  const centre = (ids: string[], pos: Record<string, P>) => ({
    x: ids.reduce((s, id) => s + pos[id].x, 0) / ids.length,
    y: ids.reduce((s, id) => s + pos[id].y, 0) / ids.length,
  });
  const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);

  it('places every node, deterministically and regardless of input order', () => {
    const a = clusterSeedPositions(nodes);
    expect(Object.keys(a).sort()).toEqual(nodes.map((n) => n.id).sort());
    expect(clusterSeedPositions([...nodes].reverse())).toEqual(a);
  });
  it('keeps clusters tight and domains further apart than clusters', () => {
    const pos = clusterSeedPositions(nodes);
    const members = ['s/a', 's/b', 's/c', 's/d'];
    const controls = centre(members, pos);
    const compliance = centre(['s/e', 's/f', 's/g'], pos);
    const networking = centre(['c/h', 'c/i', 'c/j'], pos);
    const spread = Math.max(...members.map((id) => dist(pos[id], controls)));
    expect(spread).toBeLessThan(dist(controls, compliance));
    expect(dist(controls, compliance)).toBeLessThan(dist(controls, networking));
  });
});
