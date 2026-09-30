import { describe, expect, it } from 'vitest';
import {
  labelPlacement,
  ringOrder,
  termGraphElements,
  termGraphStyle,
  type GEdge,
  type GNode,
} from './term-graph';

const node = (id: string, cluster = 'c', focus = false): GNode => ({
  id,
  label: id,
  focus,
  domain: ['security'],
  cluster,
});
const edge = (source: string, target: string, family: GEdge['family']): GEdge => ({
  source,
  target,
  type: 'requires',
  family,
  label: family,
});

describe('ringOrder', () => {
  const focus = node('f', 'c', true);
  it('orders neighbours by family, then cluster, then name, without the focal term', () => {
    const nodes = [focus, node('b', 'y'), node('a', 'y'), node('z', 'x')];
    const edges = [
      edge('f', 'b', 'contrast'),
      edge('a', 'f', 'contrast'),
      edge('f', 'z', 'structure'),
    ];
    const families = ringOrder(nodes, edges, focus).map((n) => n.id);
    // 'structure' precedes 'contrast' in the family order; within a family, cluster then name.
    expect(families).toEqual(['z', 'a', 'b']);
  });
});

describe('termGraphElements', () => {
  it('puts the focal term first and labels each edge, one-way edges flowing', () => {
    const nodes = [node('n'), node('f', 'c', true)];
    const els = termGraphElements(nodes, [edge('f', 'n', 'structure')], 'dark');
    expect(els.map((e) => e.data.id)).toEqual(['f', 'n', 'e0']);
    expect(els[0].data).toMatchObject({ focus: 1, size: 26, font: 12 });
    expect(els[2].data).toMatchObject({ label: 'structure' });
  });
});

describe('termGraphStyle', () => {
  it('ends with the focal, edge, flow and lit rules for the theme', () => {
    const style = termGraphStyle('light') as { selector: string }[];
    expect(style.slice(-4).map((s) => s.selector)).toEqual([
      'node[focus = 1]',
      'edge',
      'edge.flow',
      'edge.lit',
    ]);
  });
});

describe('labelPlacement', () => {
  it('points a label away from the centre', () => {
    expect(labelPlacement(-10, 0)).toMatchObject({ 'text-halign': 'left', 'text-margin-x': -4 });
    expect(labelPlacement(10, 1)).toMatchObject({
      'text-halign': 'right',
      'text-valign': 'center',
    });
  });
  it('stacks a label above or below a node straight over or under the centre', () => {
    expect(labelPlacement(0, -10)).toEqual({
      'text-halign': 'center',
      'text-valign': 'top',
      'text-margin-x': 0,
      'text-margin-y': -3,
    });
    expect(labelPlacement(0, 10)).toMatchObject({ 'text-valign': 'bottom', 'text-margin-y': 3 });
  });
  it('centres a label on the centre itself', () => {
    expect(labelPlacement(0, 0)).toMatchObject({
      'text-halign': 'center',
      'text-valign': 'center',
    });
  });
});
