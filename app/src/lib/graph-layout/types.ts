/** The minimal graph shapes the layout maths works on. */
import type { Paintable } from '../graph-style';

/** A term as the layouts see it: its id, domains and cluster. */
export type LayoutNode = Paintable & { id: string };
/** A relationship as the layouts see it: just its ends. */
export type Link = { source: string; target: string };
/** A relationship with its visual weight and relationship family. */
export type WeightedLink = Link & { weight: number; family: string };

/** Each link between two known nodes, as the pair of its ends' indices in `nodes`. */
export function linkEnds(nodes: readonly { id: string }[], links: readonly Link[]) {
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  return links
    .map((l) => [index.get(l.source), index.get(l.target)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined);
}
