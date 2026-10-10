import { backbone } from '../graph-layout';
import { LAB } from './config';
import type { LayoutNode } from './layout';

type LayoutLink = { source: string; target: string; weight: number; family: string; type: string };

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

export type EdgeLook = { litEdge: Uint8Array; showAll: boolean; selected: boolean };

export type EdgeBatches = { batches: Map<string, number[]>; alpha: Float32Array };

type SelectionPick = { selected: number; families: ReadonlySet<string> };
type LitMarks = { lit: Uint8Array; litEdge: Uint8Array };

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

export function edgeAlpha(e: EdgeState, k: number, look: EdgeLook): number | undefined {
  const a = e.es[k];
  const b = e.et[k];
  if (!e.visible[a] || !e.visible[b]) return undefined;
  const fa = e.famAlpha.get(e.efam[k]) ?? 1;
  if (fa <= 0.01) return undefined;
  const hot = look.litEdge[k] === 1;
  const base = baseAlpha(hot, look.showAll, e.eback[k] !== 0);
  if (base === undefined) return undefined;
  const dim = look.selected && !hot ? LAB.dimAlpha : 1;
  return base * dim * fa * Math.min(e.fog[a], e.fog[b]);
}

function baseAlpha(hot: boolean, showAll: boolean, onBackbone: boolean): number | undefined {
  if (hot) return 0.95;
  if (showAll) return 0.2;
  return onBackbone ? 0.38 : undefined;
}

export function edgeBatches(e: EdgeState, look: EdgeLook): EdgeBatches {
  const batches = new Map<string, number[]>();
  const alpha = new Float32Array(e.es.length);
  for (let k = 0; k < e.es.length; k++) {
    const al = edgeAlpha(e, k, look);
    if (al === undefined) continue;
    alpha[k] = al;
    addTo(batches, `${e.efam[k]}|${Math.round(al * 12)}|${look.litEdge[k] === 1 ? 1 : 0}`, k);
  }
  return { batches, alpha };
}

export function pulseBatches(
  e: EdgeState,
  drawn: EdgeBatches,
  look: Omit<EdgeLook, 'showAll'>,
): Map<string, number[]> {
  const dots = new Map<string, number[]>();
  for (const list of drawn.batches.values())
    for (const k of list) {
      if (!e.edir[k] || drawn.alpha[k] < 0.05) continue;
      addTo(dots, e.efam[k] + (look.litEdge[k] ? '|1' : look.selected ? '|d' : '|0'), k);
    }
  return dots;
}

export function lightSelection(
  e: EdgeState & { adj: number[][] },
  pick: SelectionPick,
  marks: LitMarks,
): number {
  const sel = pick.selected >= 0 && e.visible[pick.selected] ? pick.selected : -1;
  marks.lit.fill(0);
  marks.litEdge.fill(0);
  if (sel >= 0) lightNeighbours(e, pick, marks);
  return sel;
}

function lightNeighbours(
  e: EdgeState & { adj: number[][] },
  { selected: sel, families }: SelectionPick,
  { lit, litEdge }: LitMarks,
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
