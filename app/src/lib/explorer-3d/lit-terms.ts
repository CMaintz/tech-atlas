import type { Model } from './model';
import type { Node3, State3 } from './types';

type Lit = { state: State3; model: Model };

const byRank = (model: Model, ids: Iterable<string>) =>
  [...ids].sort((a, b) => (model.rank.get(b) ?? 0) - (model.rank.get(a) ?? 0));

const hoodOf = (model: Model, lead: string) => [
  lead,
  ...byRank(model, model.neighbours.get(lead) ?? []),
];

function focusTerms({ state, model }: Lit): string[] {
  const v = state.view;
  if (!v) return [];
  if (state.cluster) return [...state.cluster.central];
  if (state.fx.hood) return hoodOf(model, state.fx.hood);
  if (v.highlight.size) return [...(v.selected ? [v.selected] : []), ...byRank(model, v.highlight)];
  if (v.selected && v.hoodLit) return [v.selected, ...byRank(model, v.nodes)];
  return v.selected ? hoodOf(model, v.selected) : [];
}

export function litTerms(lit: Lit): Node3[] {
  const { state, model } = lit;
  const preview = state.fx.preview && !state.cluster ? [state.fx.preview] : [];
  const ids = new Set([...preview, ...focusTerms(lit)]);
  return [...ids].flatMap((id) => {
    const node = model.byId.get(id);
    return node && state.view?.nodes.has(id) ? [node] : [];
  });
}
