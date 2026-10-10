import { describe, expect, it } from 'vitest';
import type cytoscape from 'cytoscape';
import { groupPaths } from './explorer-flow-edges';

type Spec = { classes?: string[]; gone?: boolean; x?: number; placed?: boolean };

/** Just enough of a Cytoscape edge for the dot rules: classes, ends, colours. */
const edge = ({ classes = [], gone = false, x = 0, placed = true }: Spec) => {
  const end = { hasClass: (c: string) => gone && c === 'gone' };
  return {
    hasClass: (c: string) => classes.includes(c),
    source: () => end,
    target: () => end,
    sourceEndpoint: () => (placed ? { x, y: 0 } : undefined),
    targetEndpoint: () => (placed ? { x: 10, y: 0 } : undefined),
    controlPoints: () => undefined,
    data: (k: string) => (k === 'colour' ? 'red' : 'pink'),
  };
};

const groups = (...specs: Spec[]) => {
  const edges = specs.map(edge);
  const collection = { forEach: (fn: (e: unknown) => void) => edges.forEach(fn) };
  const out = groupPaths(collection as unknown as cytoscape.EdgeCollection);
  return Object.fromEntries([...out].map(([key, paths]) => [key, paths.length]));
};

describe('groupPaths', () => {
  it('groups resting edges by tint, and lit or "all" edges by colour', () => {
    expect(
      groups({}, {}, { classes: ['lit'] }, { classes: ['focus'] }, { classes: ['all'] }),
    ).toEqual({ 'pink|0': 2, 'red|1': 2, 'red|0': 1 });
  });
  it('skips hidden edges, edges to a gone term, and edges not yet placed', () => {
    const hidden = ['off', 'dim', 'faded'].map((c) => ({ classes: [c] }));
    expect(groups(...hidden, { gone: true }, { placed: false }, { x: NaN })).toEqual({});
  });
});
