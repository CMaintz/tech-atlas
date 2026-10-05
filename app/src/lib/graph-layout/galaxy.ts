/**
 * The 3D galaxy layout: domains as galaxies on a ring, clusters as star systems
 * round them, terms settled by a seeded force simulation (galaxy-forces.ts).
 */
import { EXPLORER } from '../explorer-config';
import { homeDomain, seededRandom } from '../graph-style';
import { domainRank } from '../graph-style/palette';
import { simulate, type Point3, type Spring } from './galaxy-forces';
import { byDomain } from './lanes';
import type { LayoutNode, Link } from './types';

type DepthNode = LayoutNode & { depth: number };
type Seat = { x: number; z: number };

/** Each domain's galaxy centre, evenly spaced round a horizontal ring in domain order. */
export function galaxyAnchors(nodes: LayoutNode[]): Map<string, Seat> {
  const r = EXPLORER.three.ringRadius;
  const domains = [...new Set(nodes.map((n) => homeDomain(n)))].sort(byDomain);
  return new Map(
    domains.map((d, i) => {
      const a = (2 * Math.PI * i) / domains.length;
      return [d, { x: r * Math.cos(a), z: r * Math.sin(a) }];
    }),
  );
}

/** The clusters homed in each domain, in first-seen order. */
function clustersByDomain(nodes: LayoutNode[]): Map<string, string[]> {
  const clusters = new Map<string, string[]>();
  for (const n of nodes) {
    const d = homeDomain(n);
    if (!clusters.has(d)) clusters.set(d, []);
    if (!clusters.get(d)!.includes(n.cluster)) clusters.get(d)!.push(n.cluster);
  }
  return clusters;
}

/** Each cluster's seat: round its galaxy's centre (or on it, for a lone cluster). */
function clusterSeats(nodes: LayoutNode[], anchor: Map<string, Seat>): Map<string, Seat> {
  const seats = new Map<string, Seat>();
  for (const [d, cs] of clustersByDomain(nodes)) {
    const c = anchor.get(d)!;
    const r = cs.length > 1 ? EXPLORER.three.clusterRadius : 0;
    cs.sort().forEach((cl, i) => {
      const a = (2 * Math.PI * i) / cs.length + domainRank(d);
      seats.set(cl, { x: c.x + r * Math.cos(a), z: c.z + r * Math.sin(a) });
    });
  }
  return seats;
}

/** A spring per relationship between known terms: short and stiff inside a cluster. */
function springsOf(nodes: LayoutNode[], links: Link[]): Spring[] {
  const cfg = EXPLORER.three;
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  return links
    .map((l) => [index.get(l.source), index.get(l.target)] as const)
    .filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined)
    .map(([a, b]) => {
      const same = nodes[a].cluster === nodes[b].cluster;
      return {
        a,
        b,
        len: same ? cfg.linkInCluster : cfg.linkAcross,
        k: same ? cfg.springIn : cfg.springAcross,
      };
    });
}

/** Height each term is drawn to: its depth about the mean, with a seeded spread. */
function depthTargets(nodes: DepthNode[], rand: () => number): number[] {
  const cfg = EXPLORER.three;
  const meanDepth = nodes.reduce((s, n) => s + n.depth, 0) / Math.max(1, nodes.length);
  // Depth is a bias with a spread, so a row of equal-depth terms is a band, not a floor.
  return nodes.map(
    (n) => (n.depth - meanDepth + (rand() - 0.5) * cfg.depthJitter) * cfg.depthSpacing,
  );
}

/** A seeded start near the term's cluster seat, at about its target height. */
const startAt = (seat: Seat, y: number, rand: () => number): Point3 => ({
  x: seat.x + (rand() - 0.5) * 80,
  y: y + (rand() - 0.5) * 60,
  z: seat.z + (rand() - 0.5) * 80,
});

/**
 * Where every term sits in 3D, computed once from the whole graph: each domain is
 * a galaxy on a horizontal ring, each cluster a star system round its galaxy's centre,
 * terms spread by repulsion and drawn together by their relationships; a term in two
 * domains stays in its own cluster's galaxy. Height is a *soft* pull towards Depth (foundations low), never a plane.
 * Deterministic (seeded), O(n²) per step — fine for a few thousand terms.
 */
export function galaxyLayout(
  nodes: DepthNode[],
  links: Link[],
  seed = 20260925,
): Map<string, Point3> {
  const rand = seededRandom(seed);
  const anchor = galaxyAnchors(nodes);
  const seats = clusterSeats(nodes, anchor);
  const targetY = depthTargets(nodes, rand);
  const P = nodes.map((n, i) => startAt(seats.get(n.cluster)!, targetY[i], rand));
  const V = nodes.map(() => ({ x: 0, y: 0, z: 0 }));
  // A term's horizontal home: its own cluster's galaxy, like any other term.
  const home = nodes.map((n) => anchor.get(homeDomain(n))!);
  simulate({ nodes, P, V, springs: springsOf(nodes, links), home, targetY });
  return new Map(nodes.map((nd, i) => [nd.id, P[i]]));
}
