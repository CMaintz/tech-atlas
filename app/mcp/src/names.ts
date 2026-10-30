import { namesOf } from '../../src/lib/autolink';
import { bareName } from '../../src/lib/collisions';
import { LANGS, type BundleTerm, type Lang } from './bundle';

export type NameHit = { id: string; lang: Lang; whole: boolean };

export const normName = (s: string) => s.trim().toLocaleLowerCase().replace(/\s+/g, ' ');

function add(index: Map<string, NameHit[]>, name: string, hit: NameHit): void {
  const key = normName(name);
  if (!key) return;
  const hits = index.get(key) ?? [];
  if (!hits.some((h) => h.id === hit.id && h.lang === hit.lang)) hits.push(hit);
  index.set(key, hits);
}

type Owner = Omit<NameHit, 'whole'>;

function addLabel(index: Map<string, NameHit[]>, label: string, owner: Owner): void {
  add(index, label, { ...owner, whole: true });
  const parts = namesOf(label);
  if (parts.length > 1) for (const part of parts) add(index, part, { ...owner, whole: false });
}

export function nameIndex(terms: readonly BundleTerm[]): Map<string, NameHit[]> {
  const index = new Map<string, NameHit[]>();
  for (const t of terms)
    for (const lang of LANGS)
      for (const label of [t.term[lang], ...t.aka[lang]])
        addLabel(index, label, { id: t.id, lang });
  return index;
}

export function bareIndex(terms: readonly BundleTerm[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const { id } of terms) index.set(bareName(id), [...(index.get(bareName(id)) ?? []), id]);
  return index;
}
