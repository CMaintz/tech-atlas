import { describe, expect, it } from 'vitest';
import { litTerms } from './lit-terms';
import { buildModel } from './model';
import { graph, overview, withView } from './testing/fixture';
import type { State3 } from './types';

describe('litTerms', () => {
  const model = buildModel(graph, 'v2');
  const lit = (st: State3) => litTerms({ state: st, model }).map((n) => n.id);
  const state = (patch: Partial<State3>): State3 => ({
    theme: 'dark',
    view: overview,
    fx: { hood: null, preview: null },
    hoverId: null,
    underLink: null,
    underTerm: null,
    cluster: null,
    ...patch,
  });
  it('names nothing at rest', () => {
    expect(lit(state({}))).toEqual([]);
  });
  it('names a hovered term first, then its neighbours', () => {
    const ids = lit(state({ fx: { hood: 'cs/tcp', preview: null } }));
    expect(ids[0]).toBe('cs/tcp');
    expect(new Set(ids)).toEqual(model.neighbours.get('cs/tcp'));
  });
  it("names the selected term and its neighbours, or a hovered cluster's central terms", () => {
    const sel = lit(state({ view: withView({ selected: 'security/mfa' }) }));
    expect(sel[0]).toBe('security/mfa');
    const cluster = { ids: new Set(['cs/kernel', 'cs/process']), central: ['cs/kernel'] };
    expect(lit(state({ cluster }))).toEqual(['cs/kernel']);
  });
  it('names every term of a whole lit neighbourhood, the selected term first', () => {
    const nodes = new Set(['cs/tcp', 'cs/kernel', 'security/mfa']);
    const v = withView({ selected: 'security/mfa', nodes, hoodLit: true });
    const ids = lit(state({ view: v }));
    expect(ids[0]).toBe('security/mfa');
    expect(new Set(ids)).toEqual(nodes);
  });
});
