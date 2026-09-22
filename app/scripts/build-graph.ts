/**
 * Build the derived graph artefact from authored Term files.
 * Computes inverse edges, Depth (ADR-0001), degree, visual weight (ADR-0006/D13)
 * and collisions, then writes src/generated/graph.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { EDGE_TYPES, type EdgeType } from '../src/schema';
import { loadTerms, makeResolver } from './load-terms';

const { terms, errors } = loadTerms();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const { resolve, byName } = makeResolver(terms);

type Out = {
  type: string;
  to: string;
  generated: boolean;
  confidence: string;
  strength: string;
  weight: number;
};
type RawEdge = string | { to: string; confidence?: string; strength?: string };

const out = new Map<string, Out[]>([...terms.keys()].map((id) => [id, []]));
const degree = new Map<string, number>();
const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);

for (const [id, t] of terms) {
  for (const [type, list] of Object.entries(t.edges ?? {}) as [EdgeType, RawEdge[]][]) {
    for (const e of list ?? []) {
      const to = resolve(typeof e === 'string' ? e : e.to, id);
      if (!to) continue;
      const confidence = typeof e === 'string' ? 'high' : (e.confidence ?? 'high');
      const strength = typeof e === 'string' ? 'normal' : (e.strength ?? 'normal');
      out.get(id)!.push({ type, to, generated: false, confidence, strength, weight: 0 });
      const meta = EDGE_TYPES[type];
      out.get(to)!.push({
        type: meta.symmetric ? type : meta.inverse,
        to: id,
        generated: true,
        confidence,
        strength,
        weight: 0,
      });
      bump(id);
      bump(to);
    }
  }
}

// Depth: longest path through `requires` (ADR-0001).
const depthMemo = new Map<string, number>();
const depth = (id: string, stack = new Set<string>()): number => {
  if (depthMemo.has(id)) return depthMemo.get(id)!;
  if (stack.has(id)) return 0;
  stack.add(id);
  const reqs = out
    .get(id)!
    .filter((e) => e.type === 'requires' && !e.generated)
    .map((e) => e.to);
  const d = reqs.length === 0 ? 0 : 1 + Math.max(...reqs.map((r) => depth(r, stack)));
  stack.delete(id);
  depthMemo.set(id, d);
  return d;
};

// Derived visual weight (never authored — D13).
const familyBase: Record<string, number> = {
  requires: 3,
  unlocks: 3,
  mandates: 2.5,
  'mandated-by': 2.5,
  mitigates: 2,
  'mitigated-by': 2,
  exploits: 2,
  'exploited-by': 2,
  causes: 1.6,
  'caused-by': 1.6,
};
const strengthMul: Record<string, number> = { primary: 1.6, normal: 1, minor: 0.6 };
const confMul: Record<string, number> = { high: 1, medium: 0.8, low: 0.6 };
for (const [id, es] of out) {
  for (const e of es) {
    const deg = 1 + Math.log2(1 + (degree.get(id) ?? 1));
    const w =
      (familyBase[e.type] ?? 1.2) *
      (strengthMul[e.strength] ?? 1) *
      (confMul[e.confidence] ?? 1) *
      (deg / 3 + 0.7);
    e.weight = Number(w.toFixed(2));
  }
}

const nodes = [...terms.entries()].map(([id, t]) => ({
  id,
  term: t.term,
  domain: t.domain,
  cluster: t.cluster,
  depth: depth(id),
  degree: degree.get(id) ?? 0,
  collides: (byName.get(id.split('/').pop()!) ?? []).length > 1,
}));
const links = [...out.entries()].flatMap(([id, es]) =>
  es
    .filter((e) => !e.generated)
    .map((e) => ({ source: id, target: e.to, type: e.type, weight: e.weight })),
);

mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/graph.json', JSON.stringify({ nodes, links }, null, 2));
const maxDepth = Math.max(0, ...nodes.map((n) => n.depth));
console.log(`graph.json: ${nodes.length} nodes, ${links.length} links, max depth ${maxDepth}`);
