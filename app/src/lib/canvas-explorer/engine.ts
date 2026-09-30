/**
 * The canvas lab's (A91) engine: everything the draw loop reads, built once per graph as
 * flat typed arrays and mutated in place (projection, drag springs, filters).
 */
import type { Graph } from '../graph-model';
import { isDirected } from '../graph-style';
import type { EdgeType } from '../../schema';
import { HitGrid } from './hit-grid';
import { labBackbone } from './edges';
import { labLayout, radii } from './layout';
import { phaseOf } from './motion';

type Links = Graph['links'];

export type Engine = ReturnType<typeof nodeArrays> &
  ReturnType<typeof frameArrays> &
  ReturnType<typeof dragArrays> &
  ReturnType<typeof edgeArrays> & {
    bound: number;
    span: { w: number; h: number };
    grid: HitGrid;
    famAlpha: Map<string, number>;
  };

/** World position, size, rank, colours and the domain filter, per term. */
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

/** Per-frame projection: screen position, depth, drawn radius, fog and draw order. */
function frameArrays(n: number) {
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

/** Elastic drag offsets (screen px) and their velocities. */
function dragArrays(n: number) {
  return {
    ox: new Float32Array(n),
    oy: new Float32Array(n),
    vx: new Float32Array(n),
    vy: new Float32Array(n),
    springing: new Set<number>(),
  };
}

/** Edge ends, family, direction, backbone membership and pulse phase, plus adjacency. */
function edgeArrays(links: Links, index: Map<string, number>, back: Set<number>, n: number) {
  return {
    es: new Int32Array(links.map((l) => index.get(l.source)!)),
    et: new Int32Array(links.map((l) => index.get(l.target)!)),
    efam: links.map((l) => l.family),
    edir: new Uint8Array(links.map((l) => (isDirected(l.type as EdgeType) ? 1 : 0))),
    eback: new Uint8Array(links.map((_, i) => (back.has(i) ? 1 : 0))),
    ephase: new Float32Array(links.map((l) => phaseOf(`${l.source}>${l.target}:${l.type}`))),
    adj: Array.from({ length: n }, () => [] as number[]),
  };
}

export function buildEngine(graph: Graph): Engine {
  const { nodes } = graph;
  const index = new Map(nodes.map((nd, i) => [nd.id, i]));
  const links = graph.links.filter((l) => index.has(l.source) && index.has(l.target));
  const e: Engine = {
    ...nodeArrays(nodes),
    ...frameArrays(nodes.length),
    ...dragArrays(nodes.length),
    ...edgeArrays(links, index, labBackbone(nodes, links), nodes.length),
    bound: 1,
    span: { w: 1, h: 1 },
    grid: new HitGrid(40),
    famAlpha: new Map(),
  };
  placeNodes(e, graph);
  linkAdjacency(e);
  return e;
}

/** Each term's edge indices. */
function linkAdjacency(e: Engine) {
  e.es.forEach((_, k) => {
    e.adj[e.es[k]].push(k);
    e.adj[e.et[k]].push(k);
  });
}

/** Lay the terms out and record their world extent (for fitting the view). */
function placeNodes(e: Engine, graph: Graph) {
  const rad = radii(graph.nodes, graph.links);
  const pos = labLayout(graph.nodes, graph.links, (id) => rad.get(id)!.r);
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  graph.nodes.forEach((nd, i) => {
    const p = pos.get(nd.id)!;
    [e.wx[i], e.wy[i], e.wz[i]] = [p.x, p.y, p.z];
    [e.r[i], e.rank[i]] = [rad.get(nd.id)!.r, rad.get(nd.id)!.rank];
    box.minX = Math.min(box.minX, p.x - e.r[i]);
    box.maxX = Math.max(box.maxX, p.x + e.r[i]);
    box.minY = Math.min(box.minY, p.y - e.r[i]);
    box.maxY = Math.max(box.maxY, p.y + e.r[i]);
    e.bound = Math.max(e.bound, Math.hypot(p.x, p.y, p.z));
  });
  e.span = { w: box.maxX - box.minX, h: box.maxY - box.minY };
}
