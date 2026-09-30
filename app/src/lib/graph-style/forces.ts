/** Force-layout tuning shared by the maps: edge lengths (2D) and the cluster pull (3D). */
import { homeDomain, type Paintable } from './palette';

/**
 * Ideal edge length for the force layout: short inside a cluster, longer across
 * clusters, longest across domains — so clusters pull into tight systems and domains
 * settle into loose regions.
 */
export function idealEdgeLength(a: Paintable, b: Paintable): number {
  if (a.cluster === b.cluster) return 70;
  if (homeDomain(a) === homeDomain(b)) return 210;
  return 300;
}

type ForceNode = { cluster: string; x?: number; z?: number; vx?: number; vz?: number };
type Sum = { x: number; z: number; n: number };

/** Sum of each cluster's horizontal positions, and its size. */
function clusterSums(nodes: ForceNode[]): Map<string, Sum> {
  const sum = new Map<string, Sum>();
  for (const n of nodes) {
    const s = sum.get(n.cluster) ?? { x: 0, z: 0, n: 0 };
    s.x += n.x ?? 0;
    s.z += n.z ?? 0;
    s.n += 1;
    sum.set(n.cluster, s);
  }
  return sum;
}

/**
 * A d3-style force pulling each node towards its cluster's centre in the horizontal
 * plane (x, z). Height (y) is left alone: in 3D it means Depth (ADR-0001).
 */
export function clusterForce(strength = 0.08) {
  let nodes: ForceNode[] = [];
  const force = (alpha: number) => {
    const sum = clusterSums(nodes);
    const k = strength * alpha;
    for (const n of nodes) {
      const s = sum.get(n.cluster)!;
      if (s.n < 2) continue;
      n.vx = (n.vx ?? 0) + (s.x / s.n - (n.x ?? 0)) * k;
      n.vz = (n.vz ?? 0) + (s.z / s.n - (n.z ?? 0)) * k;
    }
  };
  force.initialize = (ns: ForceNode[]) => {
    nodes = ns;
  };
  return force;
}
