/** Which edges form the overview's backbone. */
import { EXPLORER } from '../explorer-config';
import { linkVisible } from './visibility';
import type { LayoutNode, WeightedLink } from './types';

type BackboneLink = WeightedLink & { type?: string; primary?: boolean };
/** Link indices per term id. */
type Incidence = Map<string, number[]>;

/** Relationship families that carry a map's structure (kind-of, part-of, requires …). */
const STRUCTURAL = new Set(['structure', 'dependency']);

const push = (m: Incidence, k: string, i: number) => {
  if (!m.has(k)) m.set(k, []);
  m.get(k)!.push(i);
};

/**
 * Each term's links (`any`), and those of them to a term sharing one of its domains
 * (`near`), as indices into `links`.
 */
export function incidence(
  nodes: LayoutNode[],
  links: BackboneLink[],
): { near: Incidence; any: Incidence } {
  const domainsOf = new Map(nodes.map((n) => [n.id, n.domain]));
  const near: Incidence = new Map();
  const any: Incidence = new Map();
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

/**
 * The overview's edges: every `requires` edge and every edge authored
 * `strength: primary` is always drawn; each term also keeps its `perNode` strongest
 * relationships to terms sharing one of its domains, in any cluster (structure and
 * prerequisites count 1.5×) — so a hub whose links all leave its cluster still shows
 * them. A term left with none keeps its single strongest relationship, so no connected
 * term floats alone. Returns the indices of the chosen links.
 */
export function backbone(
  nodes: LayoutNode[],
  links: BackboneLink[],
  perNode: number = EXPLORER.edges.backbonePerNode,
): Set<number> {
  const score = (l: WeightedLink) => l.weight * (STRUCTURAL.has(l.family) ? 1.5 : 1);
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

/**
 * The relationship families the overview draws by default (owner-approved): kind-of,
 * part-of, implements (structure), requires (dependency), mitigates, exploits, causes
 * (security), mandates (regulation) and supersedes (lineage). Contrasts, alternatives
 * and "used with" are off: they appear when a term is selected (a selected term always
 * shows all its relationships) or when the reader ticks them.
 */
export const OVERVIEW_FAMILIES: ReadonlySet<string> = new Set([
  'structure',
  'dependency',
  'security',
  'regulation',
  'lineage',
]);

/**
 * The backbone over only the relationship families switched on (by default the
 * overview's, `OVERVIEW_FAMILIES`), as indices into the full `links`: a family that is
 * off no longer takes a term's strongest-link slots, so the families left on fill them.
 * Given the `visible` terms, it is computed over them alone: a term whose strongest links
 * went to hidden terms keeps its strongest visible one, so no connected term is stranded.
 */
export function backboneOf(
  nodes: LayoutNode[],
  links: BackboneLink[],
  families: ReadonlySet<string> = OVERVIEW_FAMILIES,
  visible?: ReadonlySet<string>,
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
