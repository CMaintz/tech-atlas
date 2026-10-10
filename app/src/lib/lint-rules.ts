import type { EdgeType } from '../schema';
import { namesOf } from './autolink';
import { stronglyConnected } from './strongly-connected';
import { containsWord } from './whole-word';

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
export type Resolve = (ref: string, fromId: string) => string | null;

const refOf = (e: RawEdge) => (typeof e === 'string' ? e : e.to);

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
      if (redundantUnder(t, parent, resolve)) out.push({ id: t.id, parent: parent.id });
    }
  }
  return out;
}

function redundantUnder(t: RuleTerm, parent: RuleTerm, resolve: Resolve): boolean {
  const parentEdges = edgeKeys(parent, resolve);
  const own = [...edgeKeys(t, resolve)].filter((k) => k !== `kind-of|${parent.id}`);
  if (!own.every((k) => parentEdges.has(k))) return false;
  return (['en', 'da'] as const).some((lang) =>
    namesOf(parent.term[lang]).some((n) => containsWord(t.summary[lang], n)),
  );
}

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

export function circularDefinitions(
  ids: string[],
  names: (id: string) => string[],
  grounded: (id: string) => boolean,
): string[][] {
  const nodes = ids.filter((id) => !grounded(id));
  const inGraph = new Set(nodes);
  const next = (id: string) => names(id).filter((n) => n !== id && inGraph.has(n));
  return stronglyConnected(nodes, next)
    .filter((component) => component.length > 1)
    .map((component) => component.sort())
    .sort((a, b) => a[0].localeCompare(b[0]));
}

export function depthHistogram(depths: number[]): number[] {
  const out: number[] = [];
  for (const d of depths) {
    while (out.length <= d) out.push(0);
    out[d]++;
  }
  return out;
}

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

export const FORBIDDEN_DASHES = /[–—―]/g;

export function forbiddenDashes(text: string): { line: number; char: string; excerpt: string }[] {
  const out: { line: number; char: string; excerpt: string }[] = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(FORBIDDEN_DASHES)) {
      const at = m.index ?? 0;
      out.push({
        line: i + 1,
        char: `U+${m[0].charCodeAt(0).toString(16).toUpperCase()}`,
        excerpt: line
          .slice(Math.max(0, at - 30), at + 30)
          .replace(FORBIDDEN_DASHES, '?')
          .trim(),
      });
    }
  });
  return out;
}
