import { describe, expect, it } from 'vitest';
import { DOMAIN_GAP, ISLAND_GAP, packIslands } from '../graph-style';
import { packDiscs, separateDiscs } from './discs';
import { canonicalLinks } from './islands';

describe('packIslands', () => {
  const islands = [
    { id: 'controls', domain: 'security', r: 120 },
    { id: 'compliance', domain: 'security', r: 150 },
    { id: 'fundamentals', domain: 'security', r: 160 },
    { id: 'awareness', domain: 'security', r: 90 },
    { id: 'networking', domain: 'cs', r: 110 },
    { id: 'identity', domain: 'cs', r: 130 },
    { id: 'llm', domain: 'ai', r: 60 },
    { id: 'cloud', domain: 'platform', r: 70 },
    { id: 'lonely', domain: 'law', r: 10 },
  ];
  const links = [
    { a: 'controls', b: 'identity', w: 12 },
    { a: 'controls', b: 'compliance', w: 20 },
    { a: 'llm', b: 'awareness', w: 3 },
  ];
  const packed = packIslands(islands, links);
  const pos = packed.islands;
  const d = (a: string, b: string) => Math.hypot(pos[a].x - pos[b].x, pos[a].y - pos[b].y);

  it('places every island, whatever the input order', () => {
    expect(Object.keys(pos).sort()).toEqual(islands.map((i) => i.id).sort());
    expect(packIslands([...islands].reverse(), [...links].reverse())).toEqual(packed);
  });
  it('keeps each domain inside its own region, and regions apart', () => {
    for (const i of islands) {
      const r = packed.regions[i.domain];
      expect(Math.hypot(pos[i.id].x - r.x, pos[i.id].y - r.y) + i.r).toBeLessThanOrEqual(r.r + 0.5);
    }
    const regions = Object.values(packed.regions);
    for (const a of regions)
      for (const b of regions)
        if (a !== b)
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(
            a.r + b.r + DOMAIN_GAP - 0.5,
          );
  });
  it('keeps every gap: islands never overlap, domains stay further apart', () => {
    for (const a of islands)
      for (const b of islands) {
        if (a.id >= b.id) continue;
        const gap = a.domain === b.domain ? ISLAND_GAP : DOMAIN_GAP;
        expect(d(a.id, b.id)).toBeGreaterThanOrEqual(a.r + b.r + gap - 0.5);
      }
  });
  it('keeps a domain together: its islands are nearer each other than other domains', () => {
    expect(d('controls', 'compliance')).toBeLessThan(d('controls', 'cloud'));
    expect(d('networking', 'identity')).toBeLessThan(d('networking', 'llm'));
  });
});

describe('canonicalLinks', () => {
  it('orients every link a < b, sums duplicates and sorts the pairs', () => {
    expect(
      canonicalLinks([
        { a: 'y', b: 'x', w: 1 },
        { a: 'b', b: 'a', w: 2 },
        { a: 'x', b: 'y', w: 3 },
      ]),
    ).toEqual([
      { a: 'a', b: 'b', w: 2 },
      { a: 'x', b: 'y', w: 4 },
    ]);
  });
});

describe('packDiscs / separateDiscs', () => {
  it('puts a lone disc at the origin', () => {
    expect([...packDiscs([{ id: 'a', r: 5 }], [], 10)]).toEqual([['a', { x: 0, y: 0 }]]);
  });
  it('pushes an overlapping pair exactly to their radii plus the gap, half each', () => {
    const discs = [
      { id: 'a', r: 5 },
      { id: 'b', r: 5 },
    ];
    const pos = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 10, y: 0 }],
    ]);
    separateDiscs(discs, pos, 10);
    expect(pos.get('a')).toEqual({ x: -5, y: 0 });
    expect(pos.get('b')).toEqual({ x: 15, y: 0 });
  });
  it('splits coincident discs along a fixed direction', () => {
    const discs = [
      { id: 'a', r: 1 },
      { id: 'b', r: 1 },
    ];
    const pos = new Map([
      ['a', { x: 0, y: 0 }],
      ['b', { x: 0, y: 0 }],
    ]);
    separateDiscs(discs, pos, 0);
    const [a, b] = [pos.get('a')!, pos.get('b')!];
    // Pair (0, 1) splits along angle 0 + 1 radians.
    expect(Math.atan2(b.y - a.y, b.x - a.x)).toBeCloseTo(1);
    for (let i = 0; i < 20; i++) separateDiscs(discs, pos, 0);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(2);
  });
});
