import { bareName, collisionsOf } from './collisions';

export type RedirectTerm = {
  id: string;
  term: { en: string; da: string };
  aka: { en: string[]; da: string[] };
};

const FOLD: Record<string, string> = { æ: 'ae', ø: 'oe', å: 'aa', ß: 'ss' };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[æøåß]/g, (c) => FOLD[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function shortNames(terms: RedirectTerm[]): Map<string, string> {
  const ids = terms.map((t) => t.id);
  const reserved = new Set([...ids.map((id) => id.split('/')[0]), ...collisionsOf(ids).keys()]);
  const out = new Map<string, string>();
  for (const id of ids) {
    const name = bareName(id);
    if (!reserved.has(name)) out.set(name, id);
  }
  for (const [slug, targets] of [...slugTargets(terms)].sort(([a], [b]) => a.localeCompare(b))) {
    if (out.has(slug) || reserved.has(slug) || targets.size !== 1) continue;
    out.set(slug, [...targets][0]);
  }
  return out;
}

function slugTargets(terms: RedirectTerm[]): Map<string, Set<string>> {
  const named = new Map<string, Set<string>>();
  for (const t of terms) {
    for (const n of [t.term.en, t.term.da, ...t.aka.en, ...t.aka.da]) {
      const slug = slugify(n);
      if (slug) named.set(slug, (named.get(slug) ?? new Set()).add(t.id));
    }
  }
  return named;
}
