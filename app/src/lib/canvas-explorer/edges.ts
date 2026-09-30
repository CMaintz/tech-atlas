/**
 * Which edges the canvas lab (A91) draws and how: the default backbone, each edge's alpha
 * this frame, and the batches (one canvas path per family × alpha step × lit) that the
 * edge and pulse painters stroke. Pure: reads the engine's arrays only.
 */
import { backbone } from '../graph-layout';
import { LAB } from './config';
import type { LayoutNode } from './layout';

type LayoutLink = { source: string; target: string; weight: number; family: string; type: string };

/** The engine arrays an edge's look depends on. */
export type EdgeState = {
  es: Int32Array;
  et: Int32Array;
  efam: string[];
  eback: Uint8Array;
  edir: Uint8Array;
  visible: Uint8Array;
  fog: Float32Array;
  famAlpha: Map<string, number>;
};

/** Edge indices by batch key, and every edge's alpha (0 when not drawn). */
export type EdgeBatches = { batches: Map<string, number[]>; alpha: Float32Array };

/**
 * The default edge set (A91): every `requires` link plus the Explorer's backbone (each
 * term's strongest in-cluster links; graph.json folds an edge's strength into `weight`,
 * so "primary" edges are the heavy ones the backbone keeps). Indices into `links`.
 */
export function labBackbone(nodes: LayoutNode[], links: LayoutLink[], perNode = 2): Set<number> {
  const chosen = backbone(nodes, links, perNode);
  links.forEach((l, i) => {
    if (l.type === 'requires') chosen.add(i);
  });
  return chosen;
}

const addTo = (m: Map<string, number[]>, key: string, k: number) => {
  const list = m.get(key);
  if (list) list.push(k);
  else m.set(key, [k]);
};

/**
 * Edge k's alpha, or undefined when it is not drawn: both ends visible, its family not
 * faded out, and lit, or "all" on, or on the backbone; dimmed beside a selection, fogged.
 */
export function edgeAlpha(
  e: EdgeState,
  k: number,
  hot: boolean,
  showAll: boolean,
  selected: boolean,
): number | undefined {
  const a = e.es[k];
  const b = e.et[k];
  if (!e.visible[a] || !e.visible[b]) return undefined;
  const fa = e.famAlpha.get(e.efam[k]) ?? 1;
  if (fa <= 0.01) return undefined;
  if (!hot && !showAll && !e.eback[k]) return undefined;
  const base = hot ? 0.95 : showAll ? 0.2 : 0.38;
  const dim = selected && !hot ? LAB.dimAlpha : 1;
  return base * dim * fa * Math.min(e.fog[a], e.fog[b]);
}

/** Edges batched by `family|alpha step (of 12)|lit`, so each batch is one stroke. */
export function edgeBatches(
  e: EdgeState,
  litEdge: Uint8Array,
  showAll: boolean,
  selected: boolean,
): EdgeBatches {
  const batches = new Map<string, number[]>();
  const alpha = new Float32Array(e.es.length);
  for (let k = 0; k < e.es.length; k++) {
    const hot = litEdge[k] === 1;
    const al = edgeAlpha(e, k, hot, showAll, selected);
    if (al === undefined) continue;
    alpha[k] = al;
    addTo(batches, `${e.efam[k]}|${Math.round(al * 12)}|${hot ? 1 : 0}`, k);
  }
  return { batches, alpha };
}

/** One-way drawn edges batched by `family|state`: 1 lit, d dimmed, 0 resting. */
export function pulseBatches(
  e: EdgeState,
  drawn: EdgeBatches,
  litEdge: Uint8Array,
  selected: boolean,
): Map<string, number[]> {
  const dots = new Map<string, number[]>();
  for (const list of drawn.batches.values())
    for (const k of list) {
      if (!e.edir[k] || drawn.alpha[k] < 0.05) continue;
      addTo(dots, e.efam[k] + (litEdge[k] ? '|1' : selected ? '|d' : '|0'), k);
    }
  return dots;
}

/**
 * Selection: the term, its neighbours over enabled families and the edges between them
 * are lit (written into `lit` / `litEdge`). Returns the selected index, or -1 when
 * nothing (visible) is selected.
 */
export function lightSelection(
  e: EdgeState & { adj: number[][] },
  selected: number,
  families: ReadonlySet<string>,
  lit: Uint8Array,
  litEdge: Uint8Array,
): number {
  const sel = selected >= 0 && e.visible[selected] ? selected : -1;
  lit.fill(0);
  litEdge.fill(0);
  if (sel >= 0) lightNeighbours(e, sel, families, lit, litEdge);
  return sel;
}

function lightNeighbours(
  e: EdgeState & { adj: number[][] },
  sel: number,
  families: ReadonlySet<string>,
  lit: Uint8Array,
  litEdge: Uint8Array,
) {
  lit[sel] = 1;
  for (const k of e.adj[sel]) {
    if (!families.has(e.efam[k])) continue;
    const o = e.es[k] === sel ? e.et[k] : e.es[k];
    if (!e.visible[o]) continue;
    lit[o] = 1;
    litEdge[k] = 1;
  }
}
