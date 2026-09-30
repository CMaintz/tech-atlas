/** The minimal graph shapes the layout maths works on. */
import type { Paintable } from '../graph-style';

/** A term as the layouts see it: its id, domains and cluster. */
export type LayoutNode = Paintable & { id: string };
/** A relationship as the layouts see it: just its ends. */
export type Link = { source: string; target: string };
/** A relationship with its visual weight and relationship family. */
export type WeightedLink = Link & { weight: number; family: string };
