/**
 * Short URLs (A72): `/[lang]/terms/<name>/` for any name a reader might type —
 * a Term's bare id, its display name or an alias (SPEC §4: aliases "redirect here").
 * Each short name that points at exactly one Term becomes a redirect page; a bare id
 * held by two folders is a Collision and keeps its Disambiguation page (ADR-0003).
 * Pure — shared by the route and its tests.
 */
import { bareName, collisionsOf } from './collisions';

export type RedirectTerm = {
  id: string;
  term: { en: string; da: string };
  aka: { en: string[]; da: string[] };
};

const FOLD: Record<string, string> = { æ: 'ae', ø: 'oe', å: 'aa', ß: 'ss' };

/** URL slug for a name: lower case, Danish letters spelled out, other marks dropped. */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[æøåß]/g, (c) => FOLD[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Every short name → the one Term it names. Bare ids win; a display-name or alias
 * slug that names two Terms is dropped (a reader is better served by search than by
 * a guess); names equal to a folder or a Collision are never redirects.
 */
export function shortNames(terms: RedirectTerm[]): Map<string, string> {
  const ids = terms.map((t) => t.id);
  const collisions = collisionsOf(ids);
  const reserved = new Set([...ids.map((id) => id.split('/')[0]), ...collisions.keys()]);
  const out = new Map<string, string>();
  for (const id of ids) {
    const name = bareName(id);
    if (!reserved.has(name)) out.set(name, id);
  }
  const named = new Map<string, Set<string>>();
  for (const t of terms) {
    for (const n of [t.term.en, t.term.da, ...t.aka.en, ...t.aka.da]) {
      const slug = slugify(n);
      if (!slug) continue;
      named.set(slug, (named.get(slug) ?? new Set()).add(t.id));
    }
  }
  for (const [slug, targets] of [...named.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (out.has(slug) || reserved.has(slug) || targets.size !== 1) continue;
    out.set(slug, [...targets][0]);
  }
  return out;
}
