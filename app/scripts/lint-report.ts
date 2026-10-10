import { loadQuestions } from './load-questions';
import { checkQuestions, type BankQuestion } from '../src/lib/question-rules';
import { collisionsOf } from '../src/lib/collisions';
import { buildGraph, type ModelTerm } from '../src/lib/graph-model';
import { depthHistogram, draftRatioByDomain } from '../src/lib/lint-rules';
import type { LintContext } from './lint-context';
import type { HowToCoverage } from './lint-terms';

const SEP = ' · ';

export function checkQuestionBank(ctx: LintContext): BankQuestion[] {
  const bank = loadQuestions();
  ctx.errors.push(...bank.errors);
  const named = new Map(
    ctx.list.map((t) => [t.id, { id: t.id, term: t.term, aka: t.aka, cluster: t.cluster }]),
  );
  const result = checkQuestions(bank.questions, named);
  ctx.errors.push(...result.errors);
  ctx.warnings.push(...result.warnings);
  return bank.questions;
}

const countBy = <T>(items: Iterable<T>, keyOf: (item: T) => string) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return counts;
};

const joinCounts = (counts: Iterable<[string, number]>) =>
  [...counts].map(([k, n]) => `${k} ${n}`).join(SEP);

function draftLines(ctx: LintContext): string[] {
  const drafts = ctx.list.filter((t) => t.draft).length;
  const pct = ctx.terms.size ? Math.round((drafts / ctx.terms.size) * 100) : 0;
  const byDomain = draftRatioByDomain(ctx.list).map((r) => `${r.domain} ${r.drafts}/${r.total}`);
  return [
    `  terms: ${ctx.terms.size}   drafts (W5): ${drafts} (${pct}%)`,
    `  drafts by domain: ${byDomain.join(SEP)}`,
  ];
}

function questionLine(questions: BankQuestion[]): string {
  const byFile = [...countBy(questions, (q) => q.file ?? '')].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `  questions: ${questions.length} (${joinCounts(byFile)})`;
}

function howToLine(h: HowToCoverage): string {
  return `  howTo coverage: ${h.withHowTo} terms with a howTo; ${h.actionable} actionable, ${h.actionableWithout} still without one (W11)`;
}

function depthLine(ctx: LintContext): string {
  const depths = buildGraph(ctx.list as ModelTerm[]).nodes.map((n) => n.depth);
  return `  depth histogram: ${depthHistogram(depths)
    .map((n, d) => `${d}: ${n}`)
    .join(SEP)}`;
}

function collisionLine(ctx: LintContext): string {
  const collisions = [...collisionsOf(ctx.terms.keys()).entries()];
  const text = collisions.map(([name, ids]) => `${name} (${ids.join(', ')})`).join(SEP);
  return `  collisions (Disambiguation pages): ${text || 'none'}`;
}

export function printReport(ctx: LintContext, howTo: HowToCoverage, questions: BankQuestion[]) {
  const byCluster = countBy(ctx.terms.values(), (t) => t.cluster);
  const underTen = [...byCluster.entries()].filter(([, n]) => n < 10).map(([c]) => c);
  const lines = [
    '\nAtlas content lint',
    ...draftLines(ctx),
    `  coverage: ${joinCounts(byCluster)}`,
    questionLine(questions),
    howToLine(howTo),
    `  clusters under ten: ${underTen.join(', ') || 'none'}`,
    depthLine(ctx),
    collisionLine(ctx),
    `  errors: ${ctx.errors.length}   warnings: ${ctx.warnings.length}`,
    ...ctx.warnings.map((w) => `  ! ${w}`),
    ...ctx.errors.map((e) => `  x ${e}`),
  ];
  for (const line of lines) console.log(line);
}
