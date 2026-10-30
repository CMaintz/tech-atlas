import { EXPLORER } from '../explorer-config';
import { linkVisible } from './visibility';
import type { LayoutNode, WeightedLink } from './types';

type BackboneLink = WeightedLink & { type?: string; primary?: boolean };
type LinkIndicesByTerm = Map<string, number[]>;

const STRUCTURAL_FAMILIES = new Set(['structure', 'dependency']);

const push = (m: LinkIndicesByTerm, k: string, i: number) => {
  const list = m.get(k);
  if (list) list.push(i);
  else m.set(k, [i]);
};

export function incidence(
  nodes: LayoutNode[],
  links: BackboneLink[],
): { near: LinkIndicesByTerm; any: LinkIndicesByTerm } {
  const domainsOf = new Map(nodes.map((n) => [n.id, n.domain]));
  const near: LinkIndicesByTerm = new Map();
  const any: LinkIndicesByTerm = new Map();
  links.forEach((l, i) => {
    const b = domainsOf.get(l.target) ?? [];
    const shared = (domainsOf.get(l.source) ?? []).some((d) => b.includes(d));
    for (const end of [l.source, l.target]) {
      push(any, end, i);
      if (shared) push(near, end, i);
    }
  });
  return { near, any };
}

export function backbone(
  nodes: LayoutNode[],
  links: BackboneLink[],
  perNode: number = EXPLORER.edges.backbonePerNode,
): Set<number> {
  const score = (l: WeightedLink) => l.weight * (STRUCTURAL_FAMILIES.has(l.family) ? 1.5 : 1);
  const byScore = (a: number, b: number) => score(links[b]) - score(links[a]) || a - b;
  const chosen = new Set(links.flatMap((l, i) => (l.type === 'requires' || l.primary ? [i] : [])));
  const { near, any } = incidence(nodes, links);
  for (const n of nodes)
    for (const i of [...(near.get(n.id) ?? [])].sort(byScore).slice(0, perNode)) chosen.add(i);
  for (const n of nodes) {
    const mine = any.get(n.id) ?? [];
    if (mine.length && !mine.some((i) => chosen.has(i))) chosen.add([...mine].sort(byScore)[0]);
  }
  return chosen;
}

export const OVERVIEW_FAMILIES: ReadonlySet<string> = new Set([
  'structure',
  'dependency',
  'security',
  'regulation',
  'lineage',
]);

/** The relationship families switched on and, when filtered, the ids of the terms shown. */
type Shown = { families?: ReadonlySet<string>; nodes?: ReadonlySet<string> };

export function backboneOf(
  nodes: LayoutNode[],
  links: BackboneLink[],
  { families = OVERVIEW_FAMILIES, nodes: visible }: Shown = {},
): Set<number> {
  const on = links.flatMap((l, i) =>
    families.has(l.family) && (!visible || linkVisible(l, visible)) ? [i] : [],
  );
  const chosen = backbone(
    visible ? nodes.filter((n) => visible.has(n.id)) : nodes,
    on.map((i) => links[i]),
  );
  return new Set([...chosen].map((j) => on[j]));
}
