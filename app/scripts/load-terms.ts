/** Load and validate every authored Term file. Shared by lint, build-graph and reports. */
import fg from 'fast-glob';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { TermFrontmatter } from '../src/schema';

export type Term = TermFrontmatter;

export function loadTerms() {
  const terms = new Map<string, Term>();
  const errors: string[] = [];
  for (const file of fg.sync('src/content/terms/**/*.yaml')) {
    const id = file.replace(/^src\/content\/terms\//, '').replace(/\.yaml$/, '');
    const raw = parse(readFileSync(file, 'utf8')) ?? {};
    const res = TermFrontmatter.safeParse({ id: id.split('/').pop(), ...raw });
    if (!res.success) {
      const issues = res.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ');
      errors.push(`E10 ${id}: ${issues}`);
      continue;
    }
    if (terms.has(id)) errors.push(`E7 duplicate id: ${id}`);
    terms.set(id, res.data);
  }
  return { terms, errors };
}

/** Resolve a bare or namespaced edge target to a loaded id, preferring the source's domain. */
export function makeResolver(terms: Map<string, Term>) {
  const byName = new Map<string, string[]>();
  for (const id of terms.keys()) {
    const name = id.split('/').pop()!;
    byName.set(name, [...(byName.get(name) ?? []), id]);
  }
  const resolve = (ref: string, fromId?: string): string | null => {
    if (terms.has(ref)) return ref;
    // A namespaced ref must match exactly — never fall back across domains (ADR-0003).
    if (ref.includes('/')) return null;
    const ids = byName.get(ref) ?? [];
    if (ids.length <= 1) return ids[0] ?? null;
    const folder = fromId?.split('/')[0];
    return ids.find((i) => i.startsWith(`${folder}/`)) ?? ids[0];
  };
  return { resolve, byName };
}
