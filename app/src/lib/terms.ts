import type { CollectionEntry } from 'astro:content';
import { EDGE_TYPES, type EdgeType, type Localized } from '../schema';
import type { Lang } from './site';
import { pairSlugFromIds } from './slug';
import { bareName } from './collisions';

export type TermEntry = CollectionEntry<'terms'>;
type RawEdge = string | { to: string; why?: Localized; strength?: string; confidence?: string };

export type Relation = {
  type: string;
  generated: boolean;
  target: TermEntry;
  why?: Localized;
  strength?: string;
};

export function makeResolver(all: TermEntry[]) {
  const byId = new Map(all.map((t) => [t.id, t]));
  const byName = new Map<string, TermEntry[]>();
  for (const t of all) byName.set(bareName(t.id), [...(byName.get(bareName(t.id)) ?? []), t]);
  return (ref: string, from?: TermEntry): TermEntry | undefined => {
    const exact = byId.get(ref);
    if (exact) return exact;
    if (ref.includes('/')) return undefined;
    const candidates = byName.get(ref) ?? [];
    if (candidates.length <= 1) return candidates[0];
    const folder = from?.id.split('/')[0];
    return candidates.find((c) => c.id.startsWith(`${folder}/`)) ?? candidates[0];
  };
}

const edgesOf = (t: TermEntry) =>
  Object.entries(t.data.edges ?? {}) as [EdgeType, RawEdge[] | undefined][];

type Resolver = ReturnType<typeof makeResolver>;

const refOf = (e: RawEdge) => (typeof e === 'string' ? e : e.to);

const metaOf = (e: RawEdge) =>
  typeof e === 'string'
    ? { why: undefined, strength: undefined }
    : { why: e.why, strength: e.strength };

export function relationsOf(term: TermEntry, all: TermEntry[]): Relation[] {
  const resolve = makeResolver(all);
  return [...authoredRelations(term, resolve), ...inverseRelations(term, all, resolve)];
}

function authoredRelations(term: TermEntry, resolve: Resolver): Relation[] {
  const rels: Relation[] = [];
  for (const [type, list] of edgesOf(term)) {
    for (const e of list ?? []) {
      const target = resolve(refOf(e), term);
      if (target) rels.push({ type, generated: false, target, ...metaOf(e) });
    }
  }
  return rels;
}

function inverseRelations(term: TermEntry, all: TermEntry[], resolve: Resolver): Relation[] {
  const rels: Relation[] = [];
  for (const other of all) {
    if (other.id === term.id) continue;
    for (const [type, list] of edgesOf(other)) {
      for (const e of list ?? []) {
        if (resolve(refOf(e), other)?.id === term.id) rels.push(inverseOf(type, e, other));
      }
    }
  }
  return rels;
}

function inverseOf(type: EdgeType, e: RawEdge, other: TermEntry): Relation {
  const { symmetric, inverse } = EDGE_TYPES[type];
  return { type: symmetric ? type : inverse, generated: true, target: other, ...metaOf(e) };
}

export type ContrastPair = { a: TermEntry; b: TermEntry; why?: Localized };

export function contrastPairs(all: TermEntry[]): ContrastPair[] {
  const resolve = makeResolver(all);
  const seen = new Set<string>();
  const pairs: ContrastPair[] = [];
  for (const t of all) {
    for (const e of (t.data.edges?.['contrasts-with'] ?? []) as RawEdge[]) {
      const other = resolve(refOf(e), t);
      if (!other || other.id === t.id) continue;
      const key = [t.id, other.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ a: t, b: other, why: metaOf(e).why });
    }
  }
  return pairs;
}

export const pairSlug = (x: TermEntry, y: TermEntry) => pairSlugFromIds(x.id, y.id);

export const RELATION_ORDER = [
  'kind-of',
  'has-kind',
  'part-of',
  'has-part',
  'requires',
  'unlocks',
  'implements',
  'implemented-by',
  'contrasts-with',
  'alternative-to',
  'mitigates',
  'mitigated-by',
  'exploits',
  'exploited-by',
  'causes',
  'caused-by',
  'mandates',
  'mandated-by',
  'supersedes',
  'superseded-by',
  'used-with',
];

export const EDGE_LABELS: Record<string, Record<Lang, string>> = {
  requires: { en: 'Requires', da: 'Forudsætter' },
  unlocks: { en: 'Unlocks', da: 'Åbner for' },
  'kind-of': { en: 'A kind of', da: 'En slags' },
  'has-kind': { en: 'Kinds', da: 'Typer' },
  'part-of': { en: 'Part of', da: 'Del af' },
  'has-part': { en: 'Consists of', da: 'Består af' },
  implements: { en: 'Implements', da: 'Implementerer' },
  'implemented-by': { en: 'Implemented by', da: 'Implementeres af' },
  'contrasts-with': { en: "Don't confuse with", da: 'Forveksl ikke med' },
  'alternative-to': { en: 'Alternative to', da: 'Alternativ til' },
  supersedes: { en: 'Supersedes', da: 'Afløser' },
  'superseded-by': { en: 'Superseded by', da: 'Afløst af' },
  mitigates: { en: 'Mitigates', da: 'Afbøder' },
  'mitigated-by': { en: 'Mitigated by', da: 'Afbødes af' },
  exploits: { en: 'Exploits', da: 'Udnytter' },
  'exploited-by': { en: 'Exploited by', da: 'Udnyttes af' },
  causes: { en: 'Causes', da: 'Forårsager' },
  'caused-by': { en: 'Caused by', da: 'Forårsages af' },
  'used-with': { en: 'Used with', da: 'Bruges sammen med' },
  mandates: { en: 'Mandates', da: 'Kræver' },
  'mandated-by': { en: 'Mandated by', da: 'Krævet af' },
};
