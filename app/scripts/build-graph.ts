/**
 * Build the derived graph artefact from authored Term files.
 * Computes inverse edges, Depth (ADR-0001), degree, visual weight (ADR-0006/D13)
 * and collisions, then writes src/generated/graph.json.
 */
import fg from 'fast-glob';
import { parse } from 'yaml';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { TermFrontmatter, EDGE_TYPES, type EdgeType } from '../src/schema';

const files = fg.sync('src/content/terms/**/*.yaml');
type Term = ReturnType<typeof TermFrontmatter.parse>;
const terms = new Map<string, Term>();

for (const f of files) {
  const id = f.replace(/^src\/content\/terms\//, '').replace(/\.yaml$/, '');
  const raw = parse(readFileSync(f, 'utf8')) ?? {};
  terms.set(id, TermFrontmatter.parse({ id: id.split('/').pop(), ...raw }));
}

const byName = new Map<string, string[]>();
for (const id of terms.keys()) {
  const name = id.split('/').pop()!;
  byName.set(name, [...(byName.get(name) ?? []), id]);
}
const resolve = (ref: string): string | null => {
  if (terms.has(ref)) return ref;
  const ids = byName.get(ref.split('/').pop()!) ?? [];
  if (ids.length === 0) return null;
  return ids.find((i) => i === ref || i.startsWith(ref.split('/')[0] + '/')) ?? ids[0];
};

type Out = {
  type: string;
  to: string;
  generated: boolean;
  why?: unknown;
  confidence: string;
  strength: string;
  weight: number;
};
const out = new Map<string, Out[]>();
const degree = new Map<string, number>();
for (const id of terms.keys()) out.set(id, []);
const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);

for (const [id, t] of terms) {
  for (const [type, list] of Object.entries(t.edges ?? {})) {
    for (const e of list ?? []) {
      const toRef = typeof e === 'string' ? e : e.to;
      const to = resolve(toRef);
      if (!to) continue;
      const rich = typeof e === 'string' ? { confidence: 'high', strength: 'normal' } : e;
      out.get(id)!.push({
        type,
        to,
        generated: false,
        why: rich.why,
        confidence: rich.confidence ?? 'high',
        strength: rich.strength ?? 'normal',
        weight: 0,
      });
      bump(id);
      bump(to);
      const meta = EDGE_TYPES[type as EdgeType];
      const inv = meta.symmetric ? type : meta.inverse;
      out.get(to)!.push({
        type: inv,
        to: id,
        generated: true,
        confidence: 'high',
        strength: 'normal',
        weight: 0,
      });
    }
  }
}

// Depth from the `requires` DAG.
const depthMemo = new Map<string, number>();
const requiresOf = (id: string) =>
  out
    .get(id)!
    .filter((e) => e.type === 'requires' && !e.generated)
    .map((e) => e.to);
const depth = (id: string, stack = new Set<string>()): number => {
  if (depthMemo.has(id)) return depthMemo.get(id)!;
  if (stack.has(id)) return 0;
  stack.add(id);
  const reqs = requiresOf(id);
  const d = reqs.length === 0 ? 0 : 1 + Math.max(...reqs.map((r) => depth(r, stack)));
  stack.delete(id);
  depthMemo.set(id, d);
  return d;
};

// Derived visual weight.
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
const strengthMul: Record<string, number> = {
  primary: 1.6,
  normal: 1,
  minor: 0.6,
};
const confMul: Record<string, number> = { high: 1, medium: 0.8, low: 0.6 };
for (const [id, es] of out) {
  for (const e of es) {
    const base = familyBase[e.type] ?? 1.2;
    const deg = 1 + Math.log2(1 + (degree.get(id) ?? 1));
    e.weight = Number(
      (
        base *
        (strengthMul[e.strength] ?? 1) *
        (confMul[e.confidence] ?? 1) *
        (deg / 3 + 0.7)
      ).toFixed(2),
    );
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
console.log(`graph.json: ${nodes.length} nodes, ${links.length} authored links`);
