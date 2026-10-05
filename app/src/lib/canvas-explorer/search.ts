/** Find a term by name, alias or id (the canvas lab's and the Explorer's search box). */
type Searchable = { id: string; term: Record<string, string>; aka?: Record<string, string[]> };

/** 0 exact, 1 prefix, 2 inside, -1 no match (`q` already lower-cased and trimmed). */
export function matchTier(s: string, q: string): number {
  const at = s.toLowerCase().indexOf(q);
  return at < 0 ? -1 : s.length === q.length ? 0 : at === 0 ? 1 : 2;
}

/**
 * A term's score for `q` (lower is better), or undefined for no match: a name at tier t
 * scores 2t, an alias just below it 2t + 1, an id-only match 6.
 */
export function searchScore(n: Searchable, q: string, lang: string): number | undefined {
  const name = matchTier(n.term[lang] ?? '', q);
  const tiers = (n.aka?.[lang] ?? []).map((a) => matchTier(a, q)).filter((t) => t >= 0);
  const alias = Math.min(...tiers, Infinity);
  const best = Math.min(name >= 0 ? name * 2 : Infinity, alias * 2 + 1);
  if (best !== Infinity) return best;
  return n.id.toLowerCase().includes(q) ? 6 : undefined;
}

/** Terms whose name (or id) contains the query, best (prefix) matches first. */
export function searchTerms<T extends Searchable>(
  nodes: T[],
  query: string,
  lang: string,
  limit = 8,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, T][] = [];
  for (const n of nodes) {
    const score = searchScore(n, q, lang);
    if (score !== undefined) scored.push([score, n]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].term[lang].localeCompare(b[1].term[lang]))
    .slice(0, limit)
    .map(([, n]) => n);
}
