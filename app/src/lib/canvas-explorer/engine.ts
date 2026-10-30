import type { Graph } from '../graph-model';
import { isDirected } from '../graph-style';
import type { EdgeType } from '../../schema';
import { HitGrid } from './hit-grid';
import { labBackbone } from './edges';
import { labLayout, radii } from './layout';
import { phaseOf } from './motion';
import { getOrThrow } from '../map-get';

type Links = Graph['links'];
type LinkEnds = { links: Links; es: Int32Array; et: Int32Array };

export type Engine = ReturnType<typeof nodeArrays> &
  ReturnType<typeof projectionArrays> &
  ReturnType<typeof dragArrays> &
  ReturnType<typeof edgeArrays> & {
    bound: number;
    span: { w: number; h: number };
    grid: HitGrid;
    famAlpha: Map<string, number>;
  };

function nodeArrays(nodes: Graph['nodes']) {
  const n = nodes.length;
  return {
    n,
    ids: nodes.map((x) => x.id),
    names: [] as string[],
    wx: new Float32Array(n),
    wy: new Float32Array(n),
    wz: new Float32Array(n),
    r: new Float32Array(n),
    rank: new Float32Array(n),
    fill: [] as string[],
    bands: [] as string[][],
    visible: new Uint8Array(n).fill(1),
  };
}

function projectionArrays(n: number) {
  return {
    sx: new Float32Array(n),
    sy: new Float32Array(n),
    sz: new Float32Array(n),
    dr: new Float32Array(n),
    fog: new Float32Array(n).fill(1),
    order: new Int32Array(n),
    drawOrder: Array.from({ length: n }, (_, i) => i),
  };
}

function dragArrays(n: number) {
  return {
    ox: new Float32Array(n),
    oy: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    springing: new Set<number>(),
  };
}

function resolveEnds(links: Links, index: Map<string, number>): LinkEnds {
  const kept: Links = [];
  const es: number[] = [];
  const et: number[] = [];
  for (const l of links) {
    const s = index.get(l.source);
    const t = index.get(l.target);
    if (s === undefined || t === undefined) continue;
    kept.push(l);
    es.push(s);
    et.push(t);
  }
  return { links: kept, es: Int32Array.from(es), et: Int32Array.from(et) };
}

function edgeArrays({ links, es, et }: LinkEnds, back: Set<number>, n: number) {
  return {
    es,
    et,
    efam: links.map((l) => l.family),
    edir: new Uint8Array(links.map((l) => (isDirected(l.type as EdgeType) ? 1 : 0))),
    eback: new Uint8Array(links.map((_, i) => (back.has(i) ? 1 : 0))),
    ephase: new Float32Array(links.map((l) => phaseOf(`${l.source}>${l.target}:${l.type}`))),
    adj: Array.from({ length: n }, () => [] as number[]),
  };
}

export function buildEngine(graph: Graph): Engine {
  const { nodes } = graph;
  const ends = resolveEnds(graph.links, new Map(nodes.map((nd, i) => [nd.id, i])));
  const projection = projectionArrays(nodes.length);
  const e: Engine = {
    ...nodeArrays(nodes),
    ...projection,
    ...dragArrays(nodes.length),
    ...edgeArrays(ends, labBackbone(nodes, ends.links), nodes.length),
    bound: 1,
    span: { w: 1, h: 1 },
    grid: hitGridOver(projection),
    famAlpha: new Map(),
  };
  placeNodes(e, graph);
  linkAdjacency(e);
  return e;
}

function hitGridOver({ sx, sy, dr, order }: ReturnType<typeof projectionArrays>) {
  return new HitGrid({ xs: sx, ys: sy, rs: dr, order }, 40);
}

function linkAdjacency(e: Engine) {
  e.es.forEach((_, k) => {
    e.adj[e.es[k]].push(k);
    e.adj[e.et[k]].push(k);
  });
}

function placeNodes(e: Engine, graph: Graph) {
  const rad = radii(graph.nodes, graph.links);
  const pos = labLayout(graph.nodes, graph.links, (id) => getOrThrow(rad, id, 'radius').r);
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  graph.nodes.forEach((nd, i) => {
    const p = getOrThrow(pos, nd.id, 'position');
    const size = getOrThrow(rad, nd.id, 'radius');
    [e.wx[i], e.wy[i], e.wz[i]] = [p.x, p.y, p.z];
    [e.r[i], e.rank[i]] = [size.r, size.rank];
    box.minX = Math.min(box.minX, p.x - e.r[i]);
    box.maxX = Math.max(box.maxX, p.x + e.r[i]);
    box.minY = Math.min(box.minY, p.y - e.r[i]);
    box.maxY = Math.max(box.maxY, p.y + e.r[i]);
    e.bound = Math.max(e.bound, Math.hypot(p.x, p.y, p.z));
  });
  e.span = { w: box.maxX - box.minX, h: box.maxY - box.minY };
}
