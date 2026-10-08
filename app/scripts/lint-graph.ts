import { EDGE_TYPES, type EdgeType } from '../src/schema';
import { refOf, termOf, type LintContext, type RawEdge } from './lint-context';

export type Neighbours = Map<string, Set<string>>;

type AuthoredEdge = { from: string; type: EdgeType; ref: string };

interface EdgeIndex {
  neighbours: Neighbours;
  symmetric: Set<string>;
}

function authoredEdges(ctx: LintContext, id: string): AuthoredEdge[] {
  const edges = Object.entries(termOf(ctx, id).edges ?? {}) as [EdgeType, RawEdge[] | undefined][];
  return edges.flatMap(([type, list]) =>
    (list ?? []).map((e) => ({ from: id, type, ref: refOf(e) })),
  );
}

function neighbourSet(neighbours: Neighbours, id: string): Set<string> {
  const existing = neighbours.get(id);
  if (existing) return existing;
  const created = new Set<string>();
  neighbours.set(id, created);
  return created;
}

function checkSymmetric(ctx: LintContext, index: EdgeIndex, key: string) {
  if (index.symmetric.has(key)) ctx.warnings.push(`W7 symmetric edge authored twice: ${key}`);
  index.symmetric.add(key);
}

function checkEdge(ctx: LintContext, index: EdgeIndex, { from, type, ref }: AuthoredEdge) {
  const target = ctx.resolve(ref, from);
  if (!target) {
    ctx.errors.push(`E2 dangling edge ${from} -${type}-> ${ref}`);
    return;
  }
  neighbourSet(index.neighbours, from).add(target);
  neighbourSet(index.neighbours, target).add(from);
  if (!ref.includes('/') && (ctx.byName.get(ref)?.length ?? 0) > 1) {
    ctx.errors.push(`E3 ambiguous edge ${from} -${type}-> ${ref} (write the namespaced form)`);
  }
  if (EDGE_TYPES[type].symmetric) {
    checkSymmetric(ctx, index, `${type}|${[from, target].sort().join('|')}`);
  }
}

function reportNeighbourhoods(ctx: LintContext, neighbours: Neighbours) {
  for (const [id, n] of neighbours) {
    if (n.size === 0) ctx.warnings.push(`W1 orphan (no edges in or out): ${id}`);
    else if (n.size < 3) ctx.warnings.push(`W4 thin neighbourhood (${n.size} neighbours): ${id}`);
  }
}

export function checkEdges(ctx: LintContext): Neighbours {
  const index: EdgeIndex = {
    neighbours: new Map([...ctx.terms.keys()].map((id) => [id, new Set()])),
    symmetric: new Set(),
  };
  for (const id of ctx.terms.keys()) {
    for (const edge of authoredEdges(ctx, id)) checkEdge(ctx, index, edge);
  }
  reportNeighbourhoods(ctx, index.neighbours);
  return index.neighbours;
}

type Colour = Map<string, 'grey' | 'black'>;

function requiresOf(ctx: LintContext, id: string): string[] {
  return (termOf(ctx, id).edges?.requires ?? [])
    .map((e) => ctx.resolve(refOf(e), id))
    .filter((x): x is string => Boolean(x));
}

function hasCycle(ctx: LintContext, colour: Colour, id: string): boolean {
  colour.set(id, 'grey');
  for (const next of requiresOf(ctx, id)) {
    if (colour.get(next) === 'grey') return true;
    if (!colour.has(next) && hasCycle(ctx, colour, next)) return true;
  }
  colour.set(id, 'black');
  return false;
}

export function checkRequiresCycles(ctx: LintContext) {
  const colour: Colour = new Map();
  for (const id of ctx.terms.keys()) {
    if (!colour.has(id) && hasCycle(ctx, colour, id))
      ctx.errors.push(`E4 requires cycle through ${id}`);
  }
}
