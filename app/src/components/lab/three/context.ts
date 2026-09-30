/**
 * The visual lab's (A96) view of a built 3D map: the slice of 3d-force-graph it drives,
 * the lab handles explorer-3d exposes, and what it captures once at setup (today's
 * accessors and fog) so every toggle can return to them.
 */
import type { Map3D } from '../../../lib/explorer-3d';
import { EXPLORER } from '../../../lib/explorer-config';
import type { EdgeType } from '../../../schema';
import type { FAMILY_COLOURS } from '../../../lib/graph-style';

export type LinkLike = {
  source: NodeLike | string;
  target: NodeLike | string;
  type: EdgeType;
  family: keyof typeof FAMILY_COLOURS;
  weight: number;
};
export type NodeLike = {
  id: string;
  cluster: string;
  domain: string[];
  x: number;
  y: number;
  z: number;
  __threeObj?: Obj;
};
export type Obj = {
  scale: { setScalar(v: number): void; set(x: number, y: number, z: number): void };
};
export type Acc<T> = (l: LinkLike) => T;

/** The slice of 3d-force-graph the lab drives (accessors are re-evaluated on set). */
export type Fg = {
  linkVisibility(): Acc<boolean>;
  linkVisibility(f: Acc<boolean>): Fg;
  linkColor(): Acc<string>;
  linkColor(f: Acc<string>): Fg;
  nodeColor(): (n: NodeLike) => string;
  nodeColor(f: (n: NodeLike) => string): Fg;
  linkDirectionalArrowLength(): Acc<number>;
  linkDirectionalArrowLength(f: Acc<number>): Fg;
  linkWidth(w: number | Acc<number>): Fg;
  linkOpacity(o: number): Fg;
  linkCurvature(c: number): Fg;
  linkDirectionalParticles(f: Acc<number> | number): Fg;
  linkDirectionalParticleSpeed(v: number): Fg;
  linkDirectionalParticleWidth(v: number): Fg;
  linkDirectionalParticleColor(f: Acc<string>): Fg;
  graphData(): { nodes: NodeLike[]; links: LinkLike[] };
  postProcessingComposer(): { addPass(p: unknown): void; removePass(p: unknown): void };
  width(): number;
  height(): number;
  backgroundColor(): string;
  d3ReheatSimulation(): Fg;
};

export type Three = Map3D['lab']['THREE'];
export type Sprite = InstanceType<Three['Sprite']>;

/** The map, its lab handles and graph, and today's link and node accessors. */
export type Lab3 = ReturnType<typeof labContext>;

export function labContext(m: Map3D) {
  const L = m.lab;
  const fg = L.fg as unknown as Fg;
  const { nodes, links } = fg.graphData();
  return {
    m,
    L,
    THREE: L.THREE,
    fg,
    nodes,
    links,
    cfg: EXPLORER.three,
    byId: new Map(nodes.map((n) => [n.id, n])),
    /** Today's accessors, captured before the lab changes any. */
    prod: todays(fg),
    drawn: L.drawn as unknown as Acc<boolean>,
    focusOf: L.focusOf as unknown as Acc<boolean>,
  };
}

const todays = (fg: Fg) => ({
  vis: fg.linkVisibility(),
  colour: fg.linkColor(),
  arrow: fg.linkDirectionalArrowLength(),
  node: fg.nodeColor(),
});

/** A link end's id (3d-force-graph swaps ids for node objects once it has run). */
export const endOf = (x: LinkLike['source']) => (typeof x === 'string' ? x : x.id);

/** A link end's node. */
export const nodeOf = (ctx: Lab3, x: LinkLike['source']) =>
  typeof x === 'string' ? ctx.byId.get(x)! : x;
