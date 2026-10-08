import { existsSync, readFileSync } from 'node:fs';
import { checkClosedVocab } from './closed-vocab';
import { VECTORS_PATH, semanticInputs } from './semantic-inputs';
import { makeLinker } from '../src/lib/autolink';
import { compareVectors, type VectorFile } from '../src/lib/semantic';
import {
  circularDefinitions,
  missingPrerequisites,
  redundantChildren,
} from '../src/lib/lint-rules';
import { termOf, type IdentifiedTerm, type LintContext } from './lint-context';
import type { Neighbours } from './lint-graph';

type Linker = ReturnType<typeof makeLinker>;

const EMBED_HINT = '\u2014 run `npm run embed`';

const definitionOf = (t: IdentifiedTerm) => [
  t.summary.en,
  ...Object.values(t.body).map((f) => f.en),
];

function checkUntouchedMentions(ctx: LintContext, linker: Linker, neighbours: Neighbours) {
  const mentionedBy = new Map<string, string[]>();
  for (const t of ctx.list) {
    for (const m of linker.mentions(definitionOf(t), t.id)) {
      mentionedBy.set(m, [...(mentionedBy.get(m) ?? []), t.id]);
    }
  }
  for (const [id, by] of mentionedBy) {
    if (by.length >= 5 && !by.some((b) => neighbours.get(id)?.has(b))) {
      ctx.warnings.push(
        `W6 untouched mentions: ${id} is named by ${by.length} terms but linked to none`,
      );
    }
  }
}

function checkHierarchy(ctx: LintContext) {
  for (const { id, parent } of redundantChildren(ctx.list, ctx.resolve)) {
    ctx.warnings.push(
      `W2 redundant child: ${id} has no edge its kind-of parent ${parent} lacks, and its summary names the parent`,
    );
  }
  for (const id of missingPrerequisites(ctx.list, ctx.resolve)) {
    ctx.warnings.push(`W3 no prerequisites: ${id} requires nothing and nothing requires it`);
  }
}

function checkCircularDefinitions(ctx: LintContext, linker: Linker) {
  const definitionNames = new Map(
    ctx.list.map((t) => [t.id, linker.mentions(definitionOf(t), t.id)]),
  );
  const loops = circularDefinitions(
    ctx.list.map((t) => t.id),
    (id) => definitionNames.get(id) ?? [],
    (id) => linker.mentions([termOf(ctx, id).body.plain.en], id).length === 0,
  );
  for (const loop of loops) {
    ctx.errors.push(
      `E5 circular definition: ${loop.join(', ')} name each other and none has a plain facet free of term names`,
    );
  }
}

export function checkDefinitions(ctx: LintContext, neighbours: Neighbours) {
  const linker = makeLinker(ctx.list, 'en');
  checkUntouchedMentions(ctx, linker, neighbours);
  checkHierarchy(ctx);
  checkCircularDefinitions(ctx, linker);
}

export function checkVocabulary(ctx: LintContext) {
  for (const r of checkClosedVocab(ctx.terms)) {
    const line = `${r.id} (${r.lang}): ${r.unknown.join(', ')}`;
    if (r.lang === 'en') ctx.errors.push(`E1 unknown words ${line}`);
    else ctx.warnings.push(`E1 advisory ${line}`);
  }
}

export function checkSemanticVectors(ctx: LintContext) {
  if (!existsSync(VECTORS_PATH)) {
    ctx.errors.push(`E11 missing ${VECTORS_PATH} ${EMBED_HINT}`);
    return;
  }
  const file = JSON.parse(readFileSync(VECTORS_PATH, 'utf8')) as VectorFile;
  const { errors: stale, changed } = compareVectors(file, semanticInputs(ctx.terms));
  for (const e of stale) ctx.errors.push(`E11 semantic vectors out of date (${e}) ${EMBED_HINT}`);
  if (changed.length) {
    ctx.warnings.push(
      `W8 semantic vectors embed older text for: ${changed.join(', ')} ${EMBED_HINT}`,
    );
  }
}
