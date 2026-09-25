/**
 * Content lint — the quality gate (design/SPEC.md §5, design/02_SCHEMA.md §6).
 * Errors fail the build; warnings are reported. Closed Vocabulary (E1) is blocking
 * for English and advisory for Danish (ADR-0009).
 */
import { existsSync, readFileSync } from 'node:fs';
import fg from 'fast-glob';
import { EDGE_TYPES, LAYERS, type EdgeType } from '../src/schema';
import { checkClosedVocab } from './closed-vocab';
import { loadTerms, makeResolver } from './load-terms';
import { loadQuestions } from './load-questions';
import { checkQuestions } from '../src/lib/question-rules';
import { makeLinker } from '../src/lib/autolink';
import { VECTORS_PATH, semanticInputs } from './semantic-inputs';
import { compareVectors, type VectorFile } from '../src/lib/semantic';
import { collisionsOf } from '../src/lib/collisions';
import { buildGraph, type ModelTerm } from '../src/lib/graph-model';
import {
  circularDefinitions,
  depthHistogram,
  draftRatioByDomain,
  forbiddenDashes,
  missingPrerequisites,
  redundantChildren,
} from '../src/lib/lint-rules';

const { terms, errors } = loadTerms();
const warnings: string[] = [];
const { resolve, byName } = makeResolver(terms);
type RawEdge = string | { to: string };
const refOf = (e: RawEdge) => (typeof e === 'string' ? e : e.to);
const edgesOf = (id: string) =>
  Object.entries(terms.get(id)!.edges ?? {}) as [EdgeType, RawEdge[] | undefined][];

// E2 dangling · E3 ambiguous · duplicate symmetric edges; neighbourhood size for W1/W4
const symmetric = new Set<string>();
const neighbours = new Map<string, Set<string>>([...terms.keys()].map((id) => [id, new Set()]));
for (const id of terms.keys()) {
  for (const [type, list] of edgesOf(id)) {
    for (const e of list ?? []) {
      const ref = refOf(e);
      const target = resolve(ref, id);
      if (!target) {
        errors.push(`E2 dangling edge ${id} -${type}-> ${ref}`);
        continue;
      }
      neighbours.get(id)!.add(target);
      neighbours.get(target)!.add(id);
      if (!ref.includes('/') && (byName.get(ref)?.length ?? 0) > 1) {
        errors.push(`E3 ambiguous edge ${id} -${type}-> ${ref} (write the namespaced form)`);
      }
      if (EDGE_TYPES[type].symmetric) {
        const key = `${type}|${[id, target].sort().join('|')}`;
        if (symmetric.has(key)) warnings.push(`W7 symmetric edge authored twice: ${key}`);
        symmetric.add(key);
      }
    }
  }
}
for (const [id, n] of neighbours) {
  if (n.size === 0) warnings.push(`W1 orphan (no edges in or out): ${id}`);
  else if (n.size < 3) warnings.push(`W4 thin neighbourhood (${n.size} neighbours): ${id}`);
}

// E4 requires-cycle
const color = new Map<string, 'grey' | 'black'>();
const requiresOf = (id: string) =>
  (terms.get(id)!.edges?.requires ?? [])
    .map((e) => resolve(refOf(e as RawEdge), id))
    .filter((x): x is string => Boolean(x));
const hasCycle = (id: string): boolean => {
  color.set(id, 'grey');
  for (const next of requiresOf(id)) {
    if (color.get(next) === 'grey') return true;
    if (!color.has(next) && hasCycle(next)) return true;
  }
  color.set(id, 'black');
  return false;
};
for (const id of terms.keys()) {
  if (!color.has(id) && hasCycle(id)) errors.push(`E4 requires cycle through ${id}`);
}

// E6 tautological summary · E8 layer out of domain · E7 alias collisions
const names = new Map<string, string>(); // lowercased display name / id slug -> owning id
for (const [id, t] of terms) {
  for (const lang of ['en', 'da'] as const) {
    const name = t.term[lang].toLowerCase();
    const opening = t.summary[lang].toLowerCase().replace(/^(a|an|the|en|et|den|det|de)\s+/, '');
    if (opening.startsWith(name) && /^[\s,.:;—-]/.test(opening.slice(name.length) || ' ')) {
      errors.push(`E6 tautological summary (${lang}): ${id} starts by restating "${t.term[lang]}"`);
    }
  }
  if (t.layer && !t.domain.some((d) => (LAYERS[d] as readonly string[]).includes(t.layer!))) {
    errors.push(`E8 layer "${t.layer}" does not belong to any of ${id}'s domains`);
  }
  for (const n of new Set([t.term.en, t.term.da].map((x) => x.toLowerCase()))) names.set(n, id);
  names.set(id.split('/').pop()!.replace(/-/g, ' '), id);
}
const aliasOwner = new Map<string, string>();
for (const [id, t] of terms) {
  for (const alias of new Set([...t.aka.en, ...t.aka.da].map((x) => x.toLowerCase()))) {
    const owner = names.get(alias) ?? names.get(alias.replace(/-/g, ' '));
    if (owner && owner !== id) errors.push(`E7 alias "${alias}" on ${id} is the name of ${owner}`);
    const other = aliasOwner.get(alias);
    if (other && other !== id)
      errors.push(`E7 alias "${alias}" is claimed by both ${other} and ${id}`);
    aliasOwner.set(alias, id);
  }
}

// E9 missing article file
for (const [id, t] of terms) {
  for (const path of Object.values(t.article ?? {})) {
    if (path && !existsSync(path)) errors.push(`E9 ${id}: article file not found: ${path}`);
  }
}

// E12 forbidden dashes (A94): en/em dashes anywhere in a term, article or question file.
// Raw file text, so every field (names, aka, summary, facets, deep dive, sources) counts.
for (const path of fg.sync('src/content/**/*.{yaml,md}').sort()) {
  for (const f of forbiddenDashes(readFileSync(path, 'utf8'))) {
    errors.push(`E12 ${path}:${f.line}: ${f.char} dash, write "-" instead: "${f.excerpt}"`);
  }
}

// W6 untouched Mentions: named in the prose of 5+ terms but linked by edges to none of them.
const linker = makeLinker(
  [...terms.entries()].map(([id, t]) => ({ ...t, id })),
  'en',
);
const mentionedBy = new Map<string, string[]>();
for (const [id, t] of terms) {
  const texts = [t.summary.en, ...Object.values(t.body).map((f) => f.en)];
  for (const m of linker.mentions(texts, id))
    mentionedBy.set(m, [...(mentionedBy.get(m) ?? []), id]);
}
for (const [id, by] of mentionedBy) {
  if (by.length >= 5 && !by.some((b) => neighbours.get(id)!.has(b))) {
    warnings.push(`W6 untouched mentions: ${id} is named by ${by.length} terms but linked to none`);
  }
}

// W2 redundant child · W3 no prerequisites · E5 circular definition (design/02_SCHEMA.md §6)
const list = [...terms.entries()].map(([id, t]) => ({ ...t, id }));
for (const { id, parent } of redundantChildren(list, resolve)) {
  warnings.push(
    `W2 redundant child: ${id} has no edge its kind-of parent ${parent} lacks, and its summary names the parent`,
  );
}
for (const id of missingPrerequisites(list, resolve)) {
  warnings.push(`W3 no prerequisites: ${id} requires nothing and nothing requires it`);
}
// The definition = summary + the four facets (English, the blocking language — A58).
const definitionNames = new Map(
  list.map((t) => [
    t.id,
    linker.mentions([t.summary.en, ...Object.values(t.body).map((f) => f.en)], t.id),
  ]),
);
const loops = circularDefinitions(
  list.map((t) => t.id),
  (id) => definitionNames.get(id) ?? [],
  (id) => linker.mentions([terms.get(id)!.body.plain.en], id).length === 0,
);
for (const loop of loops) {
  errors.push(
    `E5 circular definition: ${loop.join(', ')} name each other and none has a plain facet free of term names`,
  );
}

// E1 Closed Vocabulary (English blocking, Danish advisory)
const vocab = checkClosedVocab(terms);
for (const r of vocab) {
  const line = `${r.id} (${r.lang}): ${r.unknown.join(', ')}`;
  if (r.lang === 'en') errors.push(`E1 unknown words ${line}`);
  else warnings.push(`E1 advisory ${line}`);
}

// E11 / W8 semantic vectors out of sync with the content they embed (A52, A76)
if (!existsSync(VECTORS_PATH)) {
  errors.push(`E11 missing ${VECTORS_PATH} — run \`npm run embed\``);
} else {
  const file = JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as VectorFile;
  const { errors: stale, changed } = compareVectors(file, semanticInputs(terms));
  for (const e of stale)
    errors.push(`E11 semantic vectors out of date (${e}) — run \`npm run embed\``);
  if (changed.length) {
    warnings.push(
      `W8 semantic vectors embed older text for: ${changed.join(', ')} — run \`npm run embed\``,
    );
  }
}

// Q1–Q9 / W9–W10 the hand-written question bank (A90)
const bank = loadQuestions();
errors.push(...bank.errors);
const questionCheck = checkQuestions(
  bank.questions,
  new Map(
    [...terms.entries()].map(([id, t]) => [
      id,
      { id, term: t.term, aka: t.aka, cluster: t.cluster },
    ]),
  ),
);
errors.push(...questionCheck.errors);
warnings.push(...questionCheck.warnings);
const questionsByFile = new Map<string, number>();
for (const q of bank.questions)
  questionsByFile.set(q.file!, (questionsByFile.get(q.file!) ?? 0) + 1);

// Reports
const drafts = [...terms.values()].filter((t) => t.draft).length;
const pct = terms.size ? Math.round((drafts / terms.size) * 100) : 0;
const byCluster = new Map<string, number>();
for (const t of terms.values()) byCluster.set(t.cluster, (byCluster.get(t.cluster) ?? 0) + 1);

const underTen = [...byCluster.entries()].filter(([, n]) => n < 10).map(([c]) => c);
const depths = buildGraph(list as ModelTerm[]).nodes.map((n) => n.depth);
const collisions = collisionsOf(terms.keys());

console.log('\nAtlas content lint');
console.log(`  terms: ${terms.size}   drafts (W5): ${drafts} (${pct}%)`);
console.log(
  `  drafts by domain: ${draftRatioByDomain(list)
    .map((r) => `${r.domain} ${r.drafts}/${r.total}`)
    .join(' · ')}`,
);
console.log(`  coverage: ${[...byCluster.entries()].map(([c, n]) => `${c} ${n}`).join(' · ')}`);
console.log(
  `  questions: ${bank.questions.length} (${[...questionsByFile.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([f, n]) => `${f} ${n}`)
    .join(' · ')})`,
);
console.log(`  clusters under ten: ${underTen.join(', ') || 'none'}`);
console.log(
  `  depth histogram: ${depthHistogram(depths)
    .map((n, d) => `${d}: ${n}`)
    .join(' · ')}`,
);
console.log(
  `  collisions (Disambiguation pages): ${
    [...collisions.entries()].map(([name, ids]) => `${name} (${ids.join(', ')})`).join(' · ') ||
    'none'
  }`,
);
console.log(`  errors: ${errors.length}   warnings: ${warnings.length}`);
for (const w of warnings) console.log(`  ! ${w}`);
for (const e of errors) console.log(`  x ${e}`);
if (errors.length) process.exit(1);
