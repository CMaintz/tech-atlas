/**
 * The hand-written question bank: content rules and the client payload.
 * Pure — no file system, no Astro, no zod — so lint.ts, the questions.json
 * endpoint and vitest share one implementation.
 */
import { namesOf } from './autolink';
import { containsWord } from './whole-word';

type Localized = { en: string; da: string };
const LANGS = ['en', 'da'] as const;

/** A question as authored (validated by `Question` in schema.ts), plus the file it came from. */
export type BankQuestion = {
  id: string;
  terms: string[];
  kind: 'scenario' | 'concept' | 'compare' | 'order' | 'true-false';
  stem: Localized;
  options: Localized[];
  answer: number;
  explanation: Localized;
  difficulty: number;
  sources?: unknown[];
  draft?: boolean;
  /** `<domain>/<cluster>` — the file path under src/content/questions/, without `.yaml`. */
  file?: string;
};

/** What the rules need to know about a term: its names in both languages. */
export type NamedTerm = {
  id: string;
  term: Localized;
  aka?: { en: string[]; da: string[] };
  cluster?: string;
};

/** What the browser gets: no sources, and which tested terms the answer names. */
export type ClientQuestion = {
  id: string;
  terms: string[];
  kind: BankQuestion['kind'];
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: number;
  /** Tested terms the correct option names outright — never asked on their own page. */
  answeredBy: string[];
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ');

/** Every name a term goes by, normalised: names, their parenthesised short forms, aliases, slug. */
export function namesOfTerm(t: NamedTerm): string[] {
  const labels = [t.term.en, t.term.da, ...(t.aka?.en ?? []), ...(t.aka?.da ?? [])];
  const slug = t.id.split('/').pop()!.replace(/-/g, ' ');
  return [...new Set([...labels.flatMap(namesOf), slug].map(norm).filter(Boolean))];
}

/**
 * The tested terms whose name IS the correct option (in either language): the
 * question is "answered by" them, so it must never be asked on their page.
 */
export function answeredBy(q: BankQuestion, terms: Map<string, NamedTerm>): string[] {
  const right = q.options[q.answer];
  if (!right) return [];
  const labels = LANGS.flatMap((l) => namesOf(right[l])).map(norm);
  return q.terms.filter((id) => {
    const t = terms.get(id);
    return !!t && namesOfTerm(t).some((n) => labels.includes(n));
  });
}

/**
 * Content rules for the bank. Errors (Q2–Q8) fail the build; warnings are reported.
 * The schema already checks shapes (option count, answer in range, both languages).
 */
export function checkQuestions(
  questions: BankQuestion[],
  terms: Map<string, NamedTerm>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  const clusters = new Set([...terms.values()].map((t) => t.cluster).filter(Boolean));
  for (const q of questions) {
    const at = `${q.file ?? '?'}#${q.id}`;
    errors.push(...duplicateIdErrors(seen, q.id, at), ...questionErrors(q, at, terms));
    warnings.push(...questionWarnings(q, at, terms, clusters));
  }
  return { errors, warnings };
}

/** Q2 duplicate id across the bank — the id keys the learner's repetition record. */
function duplicateIdErrors(seen: Map<string, string>, id: string, at: string): string[] {
  const prev = seen.get(id);
  seen.set(id, at);
  return prev ? [`Q2 duplicate question id ${id} (${prev} and ${at})`] : [];
}

/** Q3–Q9 for one question, in rule order. */
function questionErrors(q: BankQuestion, at: string, terms: Map<string, NamedTerm>): string[] {
  return [
    ...testedTermErrors(q, at, terms),
    ...answerIndexErrors(q, at),
    ...LANGS.flatMap((lang) => languageErrors(q, at, lang)),
    ...LANGS.flatMap((lang) => explanationErrors(q, at, lang)),
    ...trueFalseErrors(q, at),
  ];
}

/** Q3 every tested term exists; tested once. */
function testedTermErrors(q: BankQuestion, at: string, terms: Map<string, NamedTerm>): string[] {
  const errors = q.terms
    .filter((id) => !terms.has(id))
    .map((id) => `Q3 ${at}: unknown term ${id} (write \`domain/id\`)`);
  if (new Set(q.terms).size !== q.terms.length) errors.push(`Q3 ${at}: a term is listed twice`);
  return errors;
}

/** Q4 answer indexes an option (the schema checks too; kept for plain-object callers). */
function answerIndexErrors(q: BankQuestion, at: string): string[] {
  if (Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length) return [];
  return [`Q4 ${at}: answer ${q.answer} is not an option index`];
}

/** Q5 nothing blank, Q6 options distinct, Q7 the stem doesn't name the answer — per language. */
function languageErrors(q: BankQuestion, at: string, lang: 'en' | 'da'): string[] {
  const errors: string[] = [];
  const texts = [q.stem[lang], q.explanation[lang], ...q.options.map((o) => o[lang])];
  if (texts.some((s) => !s?.trim())) errors.push(`Q5 ${at}: blank ${lang} text`);
  const opts = q.options.map((o) => norm(o[lang]));
  if (new Set(opts).size !== opts.length)
    errors.push(`Q6 ${at}: two ${lang} options read the same`);
  const right = q.options[q.answer]?.[lang];
  if (right && q.kind !== 'true-false' && stemNames(q.stem[lang], right))
    errors.push(`Q7 ${at}: the ${lang} stem names the correct option "${right}"`);
  return errors;
}

/** Whether the stem gives the answer away by naming it. */
const stemNames = (stem: string, right: string) =>
  namesOf(right).some((n) => norm(n).length >= 3 && containsWord(stem, n.trim()));

/** Q8 the explanation must say more than "correct": both why right and why the others are wrong. */
function explanationErrors(q: BankQuestion, at: string, lang: 'en' | 'da'): string[] {
  if (q.explanation[lang].trim().length >= 80) return [];
  return [`Q8 ${at}: the ${lang} explanation is too short to explain the wrong options`];
}

/** Q9 true/false options are exactly True, False. */
function trueFalseErrors(q: BankQuestion, at: string): string[] {
  if (q.kind !== 'true-false') return [];
  const [t, f] = q.options;
  if (t?.en === 'True' && t?.da === 'Sandt' && f?.en === 'False' && f?.da === 'Falsk') return [];
  return [`Q9 ${at}: true-false options must be True/Sandt then False/Falsk`];
}

/**
 * W9 file lives under a real cluster; W10 a question only its own answer term tests
 * is never shown on any term page (still used in study sessions).
 */
function questionWarnings(
  q: BankQuestion,
  at: string,
  terms: Map<string, NamedTerm>,
  clusters: Set<string | undefined>,
): string[] {
  const warnings: string[] = [];
  const cluster = q.file?.split('/').pop();
  if (cluster && clusters.size && !clusters.has(cluster))
    warnings.push(`W9 ${at}: "${cluster}" is not a cluster`);
  const by = answeredBy(q, terms);
  if (q.terms.every((id) => by.includes(id)))
    warnings.push(`W10 ${at}: answered by every term it tests, so no term page shows it`);
  return warnings;
}

/** The browser payload for one language: sources dropped, `answeredBy` derived. */
export function clientQuestions(
  questions: BankQuestion[],
  terms: Map<string, NamedTerm>,
  lang: 'en' | 'da',
): ClientQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    terms: q.terms,
    kind: q.kind,
    stem: q.stem[lang],
    options: q.options.map((o) => o[lang]),
    answer: q.answer,
    explanation: q.explanation[lang],
    difficulty: q.difficulty,
    answeredBy: answeredBy(q, terms),
  }));
}
