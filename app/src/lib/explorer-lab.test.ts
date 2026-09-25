import { describe, expect, it } from 'vitest';
import {
  DEFAULT_2D,
  DEFAULT_3D,
  averageFps,
  changed,
  frameStats,
  fromQuery,
  rules2D,
  edgeStateRules,
  emphasise,
  importance,
  intensity,
} from './explorer-lab';

describe('visual lab: emphasis by importance', () => {
  it('ranks by type first, then by the edge weight', () => {
    const [req, used, weak] = importance([
      { type: 'requires', weight: 2 },
      { type: 'used-with', weight: 2 },
      { type: 'requires', weight: 0.5 },
    ]);
    expect(req).toBe(1);
    expect(used).toBeCloseTo(0.35);
    expect(weak).toBeCloseTo(0.5);
  });

  it('spread 0 flattens the contrast; higher spreads widen it', () => {
    expect(intensity(0.35, 0)).toBe(1);
    expect(intensity(0.5, 2)).toBeCloseTo(0.25);
    expect(intensity(1, 3)).toBe(1);
  });

  it('fades colours towards the map background', () => {
    expect(emphasise('#ff0000', 1, false)).toBe('#ff0000');
    expect(parseInt(emphasise('#ff0000', 0, false).slice(1, 3), 16)).toBeLessThan(0x80);
    expect(parseInt(emphasise('#ff0000', 0, true).slice(3, 5), 16)).toBeGreaterThan(0x80);
  });

  it('adds the emphasis rules only when on, and keeps the state rules', () => {
    expect(rules2D({ ...DEFAULT_2D, emph: 'combined' }, [3, 9])).toHaveLength(6);
    expect(
      edgeStateRules([{ selector: 'edge.faded' }, { selector: 'node.dim' }, { selector: 'edge' }]),
    ).toEqual([{ selector: 'edge.faded' }]);
  });
});

describe('visual lab: toggles from the address', () => {
  it('reads booleans, clamped numbers and known choices; ignores the rest', () => {
    const s = fromQuery(
      '?curve=bezier&gradient=1&glow=0&strength=9&speed=abc&labels=nope&bench=1',
      DEFAULT_2D,
      { curve: ['haystack', 'bezier', 'unbundled'], labels: ['none', 'hubs', 'current', 'all'] },
    );
    expect(s.curve).toBe('bezier');
    expect(s.gradient).toBe(true);
    expect(s.glow).toBe(false);
    expect(s.strength).toBe(4);
    expect(s.speed).toBe(1);
    expect(s.labels).toBe('current');
  });

  it('lists only the toggles that differ from today', () => {
    expect(changed(DEFAULT_3D, DEFAULT_3D)).toEqual([]);
    expect(changed({ ...DEFAULT_3D, links: 'tubes', bloom: true }, DEFAULT_3D)).toEqual([
      'links=tubes',
      'bloom=true',
    ]);
  });
});

describe('visual lab: frame statistics', () => {
  it('reports fps over the last second, the 1% low and the longest frame', () => {
    const times = Array.from({ length: 121 }, (_, i) => i * (1000 / 60));
    times.push(times[times.length - 1] + 100);
    const st = frameStats(times);
    expect(st.longest).toBe(100);
    expect(st.low).toBeLessThanOrEqual(60);
    expect(st.fps).toBeGreaterThanOrEqual(55);
    expect(averageFps(times.slice(0, 121))).toBe(60);
  });

  it('is zero without frames', () => {
    expect(frameStats([])).toEqual({ fps: 0, low: 0, longest: 0 });
    expect(averageFps([5])).toBe(0);
  });
});

describe('visual lab: 2D rules', () => {
  it("adds nothing for today's look", () => {
    expect(rules2D(DEFAULT_2D, [3, 9])).toEqual([]);
  });

  it('curves, gradients and dashes each add their rule', () => {
    const r = rules2D(
      { ...DEFAULT_2D, curve: 'unbundled', gradient: true, flow: 'dashes' },
      [3, 9],
    );
    expect(r.map((x) => x.selector)).toEqual(['edge.bb', 'edge[labGradient]', 'edge.labflow']);
  });
});
