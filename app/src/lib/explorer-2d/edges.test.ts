import { describe, expect, it } from 'vitest';
import { edgeLook } from './edges';

const edge = { s: 'a', t: 'b', family: 'dependency', bb: false };
const view = (over: Partial<Parameters<typeof edgeLook>[1]> = {}) => ({
  nodes: new Set(['a', 'b', 'c']),
  families: new Set(['dependency']),
  showAll: false,
  selected: null,
  highlight: new Set<string>(),
  ...over,
});
const off = { on: false, all: false, focus: false };

describe('edgeLook', () => {
  it('draws only the backbone at rest', () => {
    expect(edgeLook(edge, view())).toEqual(off);
    expect(edgeLook({ ...edge, bb: true }, view())).toEqual({ on: true, all: false, focus: false });
  });
  it('draws every edge of the families switched on with "show all"', () => {
    expect(edgeLook(edge, view({ showAll: true }))).toEqual({ on: true, all: true, focus: false });
    expect(edgeLook(edge, view({ showAll: true, families: new Set() }))).toEqual(off);
  });
  it("focuses a selected term's edges whatever their family", () => {
    const v = view({ selected: 'b', families: new Set() });
    expect(edgeLook(edge, v)).toEqual({ on: true, all: false, focus: true });
  });
  it("focuses a route's edges between its terms (families on)", () => {
    const v = view({ highlight: new Set(['a', 'b']) });
    expect(edgeLook(edge, v).focus).toBe(true);
    expect(edgeLook(edge, { ...v, families: new Set() }).focus).toBe(false);
  });
  it('hides an edge to a hidden term', () => {
    const v = view({ nodes: new Set(['a']), selected: 'a', showAll: true });
    expect(edgeLook({ ...edge, bb: true }, v)).toEqual(off);
  });
});
