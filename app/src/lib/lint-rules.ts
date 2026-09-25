/**
 * Graph-level content rules (design/02_SCHEMA.md §6, SPEC §5) and the build reports.
 * Pure — no file system, no Astro — so lint.ts orchestrates and vitest covers them.
 */
import type { EdgeType } from '../schema';
import { namesOf } from './autolink';

type Localized = { en: string; da: string };
type RawEdge = string | { to: string };
export type RuleTerm = {
  id: string;
  term: Localized;
  summary: Localized;
  body: Record<string, Localized>;
  edges?: Partial<Record<EdgeType, RawEdge[]>>;
  domain?: string[];
  draft?: boolean;
};
/** Resolves a bare or namespaced edge target, as seen from a source term. */
export type Resolve = (ref: string, fromId: string) => string | null;

const refOf = (e: RawEdge) => (typeof e === 'string' ? e : e.to);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Resolved authored edges of a term as `type|target` keys. */
function edgeKeys(t: RuleTerm, resolve: Resolve): Set<string> {
  const keys = new Set<string>();
  for (const [type, list] of Object.entries(t.edges ?? {}) as [EdgeType, RawEdge[]][]) {
    for (const e of list ?? []) {
      const target = resolve(refOf(e), t.id);
      if (target) keys.add(`${type}|${target}`);
    }
  }
  return keys;
}

/** Whether `text` contains `name` as a whole word (case-insensitive). */
const containsName = (text: string, name: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, 'iu').test(text);

/**
 * W2 redundant child (ADR-0002 tests 2 + 3): the term's authored Edges — other than
 * its `kind-of` link to that parent — are a subset of its `kind-of` parent's authored
 * Edges, *and* its summary contains the parent's display name (in either language).
 */
export function redundantChildren(
  terms: RuleTerm[],
  resolve: Resolve,
): { id: string; parent: string }[] {
  const byId = new Map(terms.map((t) => [t.id, t]));
  const out: { id: string; parent: string }[] = [];
  for (const t of terms) {
    for (const p of t.edges?.['kind-of'] ?? []) {
      const parentId = resolve(refOf(p), t.id);
      const parent = parentId ? byId.get(parentId) : undefined;
      if (!parent || parent.id === t.id) continue;
      const parentEdges = edgeKeys(parent, resolve);
      const own = [...edgeKeys(t, resolve)].filter((k) => k !== `kind-of|${parent.id}`);
      if (!own.every((k) => parentEdges.has(k))) continue;
      const named = (['en', 'da'] as const).some((lang) =>
        namesOf(parent.term[lang]).some((n) => containsName(t.summary[lang], n)),
      );
      if (named) out.push({ id: t.id, parent: parent.id });
    }
  }
  return out;
}

/**
 * W3 no prerequisites: a non-foundational term with an empty `requires`. A term is
 * foundational when another term `requires` it — it is something others build on.
 */
export function missingPrerequisites(terms: RuleTerm[], resolve: Resolve): string[] {
  const foundational = new Set<string>();
  for (const t of terms) {
    for (const e of t.edges?.requires ?? []) {
      const target = resolve(refOf(e), t.id);
      if (target) foundational.add(target);
    }
  }
  return terms
    .filter((t) => !(t.edges?.requires ?? []).length && !foundational.has(t.id))
    .map((t) => t.id);
}

/**
 * E5 circular definition: a set of terms whose definitions (summary + body) name
 * each other in a loop with no plain-English grounding anywhere in it. A term is
 * grounded when its "In plain English" facet names no other term. Returns every
 * loop — a strongly connected set of two or more ungrounded terms — ids sorted.
 *
 * `names(id)` gives the terms named in a term's definition; `grounded(id)` whether
 * its plain facet is free of term names.
 */
export function circularDefinitions(
  ids: string[],
  names: (id: string) => string[],
  grounded: (id: string) => boolean,
): string[][] {
  const nodes = ids.filter((id) => !grounded(id));
  const inGraph = new Set(nodes);
  const next = (id: string) => names(id).filter((n) => n !== id && inGraph.has(n));
  // Tarjan's strongly connected components, iterative to stay safe on deep chains.
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const loops: string[][] = [];
  let counter = 0;
  for (const root of nodes) {
    if (index.has(root)) continue;
    const work: { id: string; edges: string[]; i: number }[] = [];
    const open = (id: string) => {
      index.set(id, counter);
      low.set(id, counter);
      counter++;
      stack.push(id);
      onStack.add(id);
      work.push({ id, edges: next(id), i: 0 });
    };
    open(root);
    while (work.length) {
      const frame = work[work.length - 1];
      if (frame.i < frame.edges.length) {
        const w = frame.edges[frame.i++];
        if (!index.has(w)) open(w);
        else if (onStack.has(w)) low.set(frame.id, Math.min(low.get(frame.id)!, index.get(w)!));
        continue;
      }
      work.pop();
      const parent = work[work.length - 1];
      if (parent) low.set(parent.id, Math.min(low.get(parent.id)!, low.get(frame.id)!));
      if (low.get(frame.id) === index.get(frame.id)) {
        const component: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== frame.id);
        if (component.length > 1) loops.push(component.sort());
      }
    }
  }
  return loops.sort((a, b) => a[0].localeCompare(b[0]));
}

/** Depth histogram report: how many terms sit at each `requires` depth, 0 upwards. */
export function depthHistogram(depths: number[]): number[] {
  const out: number[] = [];
  for (const d of depths) {
    while (out.length <= d) out.push(0);
    out[d]++;
  }
  return out;
}

/** Draft-ratio report per domain tag: drafts and total, domains sorted. */
export function draftRatioByDomain(
  terms: Pick<RuleTerm, 'domain' | 'draft'>[],
): { domain: string; drafts: number; total: number }[] {
  const acc = new Map<string, { drafts: number; total: number }>();
  for (const t of terms) {
    for (const d of t.domain ?? []) {
      const row = acc.get(d) ?? { drafts: 0, total: 0 };
      row.total++;
      if (t.draft) row.drafts++;
      acc.set(d, row);
    }
  }
  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, r]) => ({ domain, ...r }));
}

/** Dashes readers must never see (A94): en dash U+2013, em dash U+2014, bar U+2015. */
export const FORBIDDEN_DASHES = /[–—―]/g;

/**
 * E12 forbidden dashes (A94): every en/em dash (or horizontal bar) in a text, with its
 * 1-based line, code point and a short excerpt. Write a hyphen-minus "-" instead.
 */
export function forbiddenDashes(text: string): { line: number; char: string; excerpt: string }[] {
  const out: { line: number; char: string; excerpt: string }[] = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(FORBIDDEN_DASHES)) {
      const at = m.index ?? 0;
      out.push({
        line: i + 1,
        char: `U+${m[0].codePointAt(0)!.toString(16).toUpperCase()}`,
        excerpt: line
          .slice(Math.max(0, at - 30), at + 30)
          .replace(FORBIDDEN_DASHES, '?')
          .trim(),
      });
    }
  });
  return out;
}
