import { describe, expect, it } from 'vitest';
import { createMotionGate } from '../explorer-focus';
import { MAP_INK } from '../graph-style';
import { createLens, refocus } from './lens';
import { onlyToggled } from './apply';
import { overview, withView } from './testing/fixture';
import type { Link3, State3, View3D } from './types';

// a — b — c, and d on its own.
const neighbours = new Map([
  ['a', new Set(['a', 'b'])],
  ['b', new Set(['a', 'b', 'c'])],
  ['c', new Set(['b', 'c'])],
  ['d', new Set(['d'])],
]);
const ab = { source: 'a', target: 'b', family: 'dependency', bb: true } as Link3;
const bc = { source: 'b', target: 'c', family: 'structure', bb: false } as Link3;

const view = (patch: Partial<View3D>) =>
  withView({ nodes: new Set(['a', 'b', 'c', 'd']), families: new Set(['dependency']), ...patch });

function lensOn(v: View3D | null, hover: string | null = null) {
  const s: State3 = {
    theme: 'dark',
    view: v,
    fx: { hood: null, preview: null },
    hoverId: hover,
    underLink: null,
  };
  const gate = createMotionGate();
  refocus(s, gate);
  return { s, lens: createLens(neighbours, s) };
}

describe('createLens', () => {
  it('lights nothing and recedes nothing in the overview', () => {
    const { lens } = lensOn(view({}));
    expect([lens.focusOf(ab), lens.faded('d')]).toEqual([false, false]);
    expect([lens.drawn(ab), lens.drawn(bc)]).toEqual([true, false]);
  });
  it('lights a hovered neighbourhood and recedes the rest', () => {
    const { lens } = lensOn(view({}), 'a');
    expect([lens.focusOf(ab), lens.focusOf(bc)]).toEqual([true, false]);
    expect(['a', 'b', 'c'].map(lens.faded)).toEqual([false, false, true]);
    expect(lens.dimmed(bc)).toBe(true);
  });
  it('shows every relationship of a selected term, whatever the families', () => {
    const { lens } = lensOn(view({ selected: 'c' }));
    expect([lens.endsShown(bc), lens.linkShown(bc), lens.linkShown(ab)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(['a', 'b', 'c'].map(lens.faded)).toEqual([true, false, false]);
  });
  it('brings a term hovered over a selection forward on its own', () => {
    const { lens } = lensOn(view({ selected: 'c' }), 'd');
    expect([lens.faded('d'), lens.faded('a')]).toEqual([false, true]);
  });
  it('recedes everything off a route', () => {
    const { lens } = lensOn(view({ highlight: new Set(['a', 'b']) }));
    expect([lens.focusOf(ab), lens.focusOf(bc), lens.faded('c')]).toEqual([true, false, true]);
  });
  it('hides links to hidden terms', () => {
    const { lens } = lensOn(view({ nodes: new Set(['a']) }));
    expect(lens.endsShown(ab)).toBe(false);
  });
  it('colours the selection, receded terms and the rest', () => {
    const { lens } = lensOn(view({ selected: 'c', colour: () => '#123456' }));
    const colour = (id: string) => lens.nodeColour({ id } as never);
    expect(['c', 'a', 'b'].map(colour)).toEqual([
      MAP_INK.dark.selected,
      MAP_INK.dark.faded3d,
      '#123456',
    ]);
  });
  it('lights nothing before a view is shown', () => {
    const { lens } = lensOn(null);
    expect([lens.focusOf(ab), lens.faded('a'), lens.drawn(ab)]).toEqual([false, false, false]);
  });
});

describe('onlyToggled', () => {
  it('holds when only the families or "show all" changed', () => {
    expect(onlyToggled(overview, withView({ showAll: true }), false)).toBe(true);
    expect(onlyToggled(overview, withView({ families: new Set() }), false)).toBe(true);
  });
  it('fails on a first view, while hovering, or when terms, selection or route changed', () => {
    expect(onlyToggled(null, overview, false)).toBe(false);
    expect(onlyToggled(overview, withView({ showAll: true }), true)).toBe(false);
    expect(onlyToggled(overview, withView({ nodes: new Set() }), false)).toBe(false);
    expect(onlyToggled(overview, withView({ selected: 'cs/ip' }), false)).toBe(false);
    expect(onlyToggled(overview, withView({ highlight: new Set(['x']) }), false)).toBe(false);
  });
});
