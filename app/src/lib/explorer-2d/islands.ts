/**
 * The island map (A74, A86): each cluster laid out once as its own island (fcose, a fixed
 * seed), spaced so no two terms crowd each other, then islands packed into domain
 * regions and the whole map turned so its long axis lies along the screen's.
 */
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import type { GraphLink, GraphNode } from '../graph-model';
import { collectNodes } from './collect';
import { EXPLORER } from '../explorer-config';
import {
  LAYOUT_SEED,
  packIslands,
  withSeededRandom,
  type Island,
  type IslandLink,
  type Point,
} from '../graph-style';
import {
  effectiveHome,
  levelAngle,
  rotateAbout,
  separate,
  visibleBundleCounts,
} from '../graph-layout';

cytoscape.use(fcose);

/** How the lab (A96) re-spaces islands: minimum distance ×, island size ×, extra gap px. */
export type IslandTune = { spacing: number; tight: number; gap: number };

export const NO_TUNE: IslandTune = { spacing: 1, tight: 1, gap: 0 };

/** Every island's terms, its raw layout, and the spaced result. */
export type IslandGeometry = {
  clusters: Map<string, GraphNode[]>;
  clusterIds: string[];
  /** Each island's own layout before spacing (kept so the lab can re-space it, A96). */
  raw: Map<string, Point[]>;
  /** Each term's offset from its island's centre. */
  offset: Map<string, Point>;
  islandR: Map<string, number>;
  sizeOf: (id: string) => number;
};

export type IslandMap = {
  positions: Record<string, Point>;
  centre: Record<string, Point>;
  islands: Island[];
  regions: Record<string, Point & { r: number }>;
  members: Map<string, GraphNode[]>;
};

const FCOSE = {
  name: 'fcose',
  quality: 'default',
  randomize: true,
  animate: false,
  fit: false,
  nodeRepulsion: () => EXPLORER.islands.nodeRepulsion,
  idealEdgeLength: () => EXPLORER.islands.idealEdgeLength,
  edgeElasticity: () => 0.45,
  gravity: 0.6,
  numIter: 1500,
  tile: true,
  tilingPaddingVertical: 24,
  tilingPaddingHorizontal: 24,
  packComponents: true,
  nodeSeparation: 60,
} as cytoscape.LayoutOptions;

const mean = (ps: Point[]): Point => ({
  x: ps.reduce((a, p) => a + p.x, 0) / ps.length,
  y: ps.reduce((a, p) => a + p.y, 0) / ps.length,
});

/** Terms by cluster, and the cluster ids in a stable order. */
export function groupClusters(nodes: GraphNode[]) {
  const clusters = new Map<string, GraphNode[]>();
  for (const n of nodes) clusters.set(n.cluster, [...(clusters.get(n.cluster) ?? []), n]);
  return { clusters, clusterIds: [...clusters.keys()].sort() };
}

/** Lay each cluster out on its own with fcose (moves the nodes in `cy`); their positions. */
function layOutIslands(cy: cytoscape.Core, g: Pick<IslandGeometry, 'clusters' | 'clusterIds'>) {
  const raw = new Map<string, Point[]>();
  for (const c of g.clusterIds) {
    const members = collectNodes(
      cy,
      g.clusters.get(c)!.map((n) => cy.getElementById(n.id)),
    );
    if (members.length > 1) members.union(members.edgesWith(members)).layout(FCOSE).run();
    raw.set(
      c,
      members.map((m) => ({ ...m.position() })),
    );
  }
  return raw;
}

/**
 * Space one island's terms (no two closer than a click target and a label apart; the
 * island grows): each term's offset from the island's centre, and the island's radius.
 */
export function shapeIsland(raw: Point[], sizes: number[], tune: IslandTune = NO_TUNE) {
  const ps = raw.map((p) => ({ ...p }));
  const m = mean(ps);
  if (tune.tight !== 1)
    for (const p of ps) {
      p.x = m.x + (p.x - m.x) * tune.tight;
      p.y = m.y + (p.y - m.y) * tune.tight;
    }
  const { factor, labelClearance } = EXPLORER.spacing;
  separate(ps, (i, j) => tune.spacing * ((factor * (sizes[i] + sizes[j])) / 4 + labelClearance));
  const c = mean(ps);
  const offsets = ps.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
  const r = Math.max(0, ...offsets.map((o, k) => Math.hypot(o.x, o.y) + sizes[k] / 2));
  return { offsets, r: r + 16 + tune.gap / 2 };
}

/**
 * Space every island and measure it. The hidden visual lab (A96) re-runs this with a
 * larger minimum distance (`spacing` ×), tighter islands (`tight` ×) and wider gaps.
 */
export function shapeIslands(g: IslandGeometry, tune: IslandTune = NO_TUNE) {
  for (const c of g.clusterIds) {
    const members = g.clusters.get(c)!;
    const shaped = shapeIsland(
      g.raw.get(c)!,
      members.map((n) => g.sizeOf(n.id)),
      tune,
    );
    members.forEach((n, k) => g.offset.set(n.id, shaped.offsets[k]));
    g.islandR.set(c, shaped.r);
  }
}

/** Lay out and space every island, once, from the whole graph (a fixed seed). */
export function buildIslands(cy: cytoscape.Core, nodes: GraphNode[]): IslandGeometry {
  const sizeOf = (id: string) => cy.getElementById(id).data('size') as number;
  const grouped = groupClusters(nodes);
  return withSeededRandom(LAYOUT_SEED, () => {
    const g = {
      ...grouped,
      raw: layOutIslands(cy, grouped),
      offset: new Map(),
      islandR: new Map(),
      sizeOf,
    };
    shapeIslands(g);
    return g;
  });
}

/** Each island's visible terms (islands with none are left out). */
function visibleMembers(g: IslandGeometry, visible: ReadonlySet<string>) {
  const members = new Map<string, GraphNode[]>();
  for (const c of g.clusterIds) {
    const mine = g.clusters.get(c)!.filter((n) => visible.has(n.id));
    if (mine.length) members.set(c, mine);
  }
  return members;
}

/** The domain most of an island's visible terms call home (ties: alphabetical). */
export function islandDomain(mine: GraphNode[], enabled?: ReadonlySet<string>) {
  const votes = new Map<string, number>();
  for (const n of mine) {
    const d = effectiveHome(n, enabled);
    votes.set(d, (votes.get(d) ?? 0) + 1);
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
}

/** An island's circle: its full radius, or a partial island's reach plus a margin. */
function islandCircle(g: IslandGeometry, c: string, mine: GraphNode[], domain: string): Island {
  const reach = (n: GraphNode) => Math.hypot(g.offset.get(n.id)!.x, g.offset.get(n.id)!.y);
  const all = mine.length === g.clusters.get(c)!.length;
  const r = all ? g.islandR.get(c)! : Math.max(...mine.map(reach)) + 26;
  return { id: c, domain, r };
}

/** Cluster-to-cluster link weights between visible terms. */
function islandLinks(
  links: GraphLink[],
  clusterOf: (id: string) => string | undefined,
  visible: ReadonlySet<string>,
): IslandLink[] {
  return [...visibleBundleCounts(links, clusterOf, visible).entries()].map(([k, w]) => {
    const [a, b] = k.split('\u0000');
    return { a, b, w };
  });
}

/** Turn the map so its long axis lies along the screen's (landscape: horizontal). */
function levelMap(m: IslandMap, wide: boolean) {
  const pts = Object.values(m.positions);
  const turn = levelAngle(pts) + (wide ? 0 : Math.PI / 2);
  const mid = {
    x: pts.reduce((s, p) => s + p.x, 0) / Math.max(1, pts.length),
    y: pts.reduce((s, p) => s + p.y, 0) / Math.max(1, pts.length),
  };
  const level = (p: Point) => rotateAbout(p, mid, turn);
  m.regions = Object.fromEntries(
    Object.entries(m.regions).map(([d, r]) => [d, { ...level(r), r: r.r }]),
  );
  for (const id of Object.keys(m.positions)) m.positions[id] = level(m.positions[id]);
  for (const c of Object.keys(m.centre)) m.centre[c] = level(m.centre[c]);
  return m;
}

/** Pack the given islands (only their visible members count) into domain regions. */
export function islandMap(
  g: IslandGeometry,
  graph: { links: GraphLink[]; clusterOf: (id: string) => string | undefined },
  visible: ReadonlySet<string>,
  wide: boolean,
  enabled?: ReadonlySet<string>,
): IslandMap {
  const members = visibleMembers(g, visible);
  const islands = [...members].map(([c, mine]) =>
    islandCircle(g, c, mine, islandDomain(mine, enabled)),
  );
  const packed = packIslands(islands, islandLinks(graph.links, graph.clusterOf, visible));
  const centre = { ...packed.islands };
  const positions = termPositions(g, members, centre);
  return levelMap({ positions, centre, islands, regions: packed.regions, members }, wide);
}

/**
 * A term sits in its own cluster's island like any other, whatever other domains it
 * also belongs to (A86: no seams — hubs that connect everywhere broke them).
 */
function termPositions(
  g: IslandGeometry,
  members: Map<string, GraphNode[]>,
  centre: Record<string, Point>,
) {
  const positions: Record<string, Point> = {};
  for (const [c, mine] of members)
    for (const n of mine) {
      const o = g.offset.get(n.id)!;
      positions[n.id] = { x: centre[c].x + o.x, y: centre[c].y + o.y };
    }
  return positions;
}
