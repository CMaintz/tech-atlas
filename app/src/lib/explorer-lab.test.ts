import { describe, expect, it } from 'vitest';
import {
  DEFAULT_2D,
  DEFAULT_3D,
  averageFps,
  changed,
  frameStats,
  fromQuery,
  rules2D,
} from './explorer-lab';

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
