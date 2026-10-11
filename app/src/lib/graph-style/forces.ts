import { getOrThrow } from '../map-get';
import { homeDomain, type Paintable } from './palette';

export function idealEdgeLength(a: Paintable, b: Paintable): number {
  if (a.cluster === b.cluster) return 70;
  if (homeDomain(a) === homeDomain(b)) return 210;
  return 300;
}

type ForceNode = { cluster: string; x?: number; z?: number; vx?: number; vz?: number };
type Sum = { x: number; z: number; n: number };

function clusterPositionSums(nodes: ForceNode[]): Map<string, Sum> {
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

export function clusterForce(strength = 0.08) {
  let nodes: ForceNode[] = [];
  const force = (alpha: number) => {
    const sum = clusterPositionSums(nodes);
    const k = strength * alpha;
    for (const n of nodes) {
      const s = getOrThrow(sum, n.cluster, 'cluster sum');
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
