/**
 * Content lint — the quality gate (design/SPEC.md §5, design/02_SCHEMA.md §6).
 * Structural checks are enforced now; Closed Vocabulary (E1) is stubbed pending
 * the per-language wordlists (see README). Exits non-zero on any error.
 */
import fg from 'fast-glob';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { TermFrontmatter } from '../src/schema';

const files = fg.sync('src/content/terms/**/*.yaml');
const errors: string[] = [];
const warnings: string[] = [];
type Term = ReturnType<typeof TermFrontmatter.parse>;
const terms = new Map<string, Term>();

for (const f of files) {
  const id = f.replace(/^src\/content\/terms\//, '').replace(/\.yaml$/, '');
  const shortId = id.split('/').pop();
  const raw = parse(readFileSync(f, 'utf8')) ?? {};
  const res = TermFrontmatter.safeParse({ id: shortId, ...raw });
  if (!res.success) {
    errors.push(
      `E10 ${id}: ${res.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`,
    );
    continue;
  }
  if (terms.has(id)) errors.push(`E7 duplicate id: ${id}`);
  terms.set(id, res.data);
}

const names = new Map<string, string[]>();
for (const id of terms.keys()) {
  const n = id.split('/').pop()!;
  names.set(n, [...(names.get(n) ?? []), id]);
}
const resolve = (ref: string): string | null => {
  if (terms.has(ref)) return ref;
  const ids = names.get(ref.split('/').pop()!) ?? [];
  if (ids.length === 0) return null;
  return ids.find((i) => i === ref || i.startsWith(ref.split('/')[0] + '/')) ?? ids[0];
};

for (const [id, t] of terms) {
  let authored = 0;
  for (const [type, list] of Object.entries(t.edges ?? {})) {
    for (const e of list ?? []) {
      authored++;
      const to = typeof e === 'string' ? e : e.to;
      const target = resolve(to);
      if (!target) errors.push(`E2 dangling edge ${id} -${type}-> ${to}`);
      else if (!to.includes('/') && (names.get(to.split('/').pop()!)?.length ?? 0) > 1)
        errors.push(`E3 ambiguous edge ${id} -${type}-> ${to} (namespace it)`);
    }
  }
  if (authored === 0) warnings.push(`W1 orphan (no authored edges): ${id}`);
}

// E4 requires-cycle
const WHITE = 0,
  GREY = 1,
  BLACK = 2;
const color = new Map<string, number>();
const reqOf = (id: string): string[] =>
  ((terms.get(id)?.edges?.requires ?? []) as unknown[])
    .map((e) => resolve(typeof e === 'string' ? e : (e as { to: string }).to))
    .filter((x): x is string => Boolean(x));
const dfs = (id: string): boolean => {
  color.set(id, GREY);
  for (const n of reqOf(id)) {
    const c = color.get(n) ?? WHITE;
    if (c === GREY) return true;
    if (c === WHITE && dfs(n)) return true;
  }
  color.set(id, BLACK);
  return false;
};
for (const id of terms.keys())
  if ((color.get(id) ?? WHITE) === WHITE && dfs(id)) errors.push(`E4 requires cycle at ${id}`);

const drafts = [...terms.values()].filter((t) => t.draft).length;
console.log('\nAtlas content lint');
console.log(
  `  terms: ${terms.size}   drafts: ${drafts} (${terms.size ? Math.round((drafts / terms.size) * 100) : 0}%)`,
);
console.log(`  errors: ${errors.length}   warnings: ${warnings.length}`);
console.log('  NOTE: E1 Closed Vocabulary is stubbed (needs per-language wordlists — see README).');
for (const w of warnings) console.log('  ! ' + w);
for (const e of errors) console.log('  x ' + e);
if (errors.length) process.exit(1);
