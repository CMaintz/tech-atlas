/**
 * The hand-written question bank (A90): content rules and the client payload.
 * Pure — no file system, no Astro, no zod — so lint.ts, the questions.json
 * endpoint and vitest share one implementation.
 */
import { namesOf } from './autolink';

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
  /** Tested terms the correct option names outright — never asked on their own page (A79). */
  answeredBy: string[];
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ');
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const containsWord = (text: string, word: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escape(word)}(?![\\p{L}\\p{N}])`, 'iu').test(text);

/** Every name a term goes by, normalised: names, their parenthesised short forms, aliases, slug. */
export function namesOfTerm(t: NamedTerm): string[] {
  const labels = [t.term.en, t.term.da, ...(t.aka?.en ?? []), ...(t.aka?.da ?? [])];
  const slug = t.id.split('/').pop()!.replace(/-/g, ' ');
  return [...new Set([...labels.flatMap(namesOf), slug].map(norm).filter(Boolean))];
}

/**
 * The tested terms whose name IS the correct option (in either language): the
 * question is "answered by" them, so it must never be asked on their page (A79).
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

/** Q3 every tested term exists; tested once. */
function termErrors(q: BankQuestion, at: string, terms: Map<string, NamedTerm>): string[] {
  const errors = q.terms
    .filter((id) => !terms.has(id))
    .map((id) => `Q3 ${at}: unknown term ${id} (write \`domain/id\`)`);
  if (new Set(q.terms).size !== q.terms.length) errors.push(`Q3 ${at}: a term is listed twice`);
  return errors;
}

/** Q4 answer indexes an option (the schema checks too; kept for plain-object callers). */
const answerErrors = (q: BankQuestion, at: string): string[] =>
  !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length
    ? [`Q4 ${at}: answer ${q.answer} is not an option index`]
    : [];

/** Q7 the stem must not give the answer away by naming it. */
function stemNamesAnswer(q: BankQuestion, lang: (typeof LANGS)[number]): string | undefined {
  const right = q.options[q.answer]?.[lang];
  if (!right || q.kind === 'true-false') return undefined;
  const named = namesOf(right).some(
    (n) => norm(n).length >= 3 && containsWord(q.stem[lang], n.trim()),
  );
  return named ? right : undefined;
}

/** Q5 nothing blank, Q6 options distinct and Q7 (above) — in one language. */
function textErrors(q: BankQuestion, at: string, lang: (typeof LANGS)[number]): string[] {
  const errors: string[] = [];
  const texts = [q.stem[lang], q.explanation[lang], ...q.options.map((o) => o[lang])];
  if (texts.some((s) => !s?.trim())) errors.push(`Q5 ${at}: blank ${lang} text`);
  const opts = q.options.map((o) => norm(o[lang]));
  if (new Set(opts).size !== opts.length)
    errors.push(`Q6 ${at}: two ${lang} options read the same`);
  const right = stemNamesAnswer(q, lang);
  if (right) errors.push(`Q7 ${at}: the ${lang} stem names the correct option "${right}"`);
  return errors;
}

/** Q8 the explanation must say more than "correct": both why right and why the others are wrong. */
const explanationErrors = (q: BankQuestion, at: string): string[] =>
  LANGS.filter((lang) => q.explanation[lang].trim().length < 80).map(
    (lang) => `Q8 ${at}: the ${lang} explanation is too short to explain the wrong options`,
  );

/** Q9 true/false options are exactly True, False. */
function trueFalseErrors(q: BankQuestion, at: string): string[] {
  if (q.kind !== 'true-false') return [];
  const [t, f] = q.options;
  const ok = t?.en === 'True' && t?.da === 'Sandt' && f?.en === 'False' && f?.da === 'Falsk';
  return ok ? [] : [`Q9 ${at}: true-false options must be True/Sandt then False/Falsk`];
}

/** Every error rule (Q3–Q9) for one question, in rule order. */
const questionErrors = (q: BankQuestion, at: string, terms: Map<string, NamedTerm>) => [
  ...termErrors(q, at, terms),
  ...answerErrors(q, at),
  ...LANGS.flatMap((lang) => textErrors(q, at, lang)),
  ...explanationErrors(q, at),
  ...trueFalseErrors(q, at),
];

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

/** Q2 duplicate id across the bank — the id keys the learner's repetition record. */
function duplicateIds() {
  const seen = new Map<string, string>();
  return (q: BankQuestion, at: string): string[] => {
    const prev = seen.get(q.id);
    seen.set(q.id, at);
    return prev ? [`Q2 duplicate question id ${q.id} (${prev} and ${at})`] : [];
  };
}

/**
 * Content rules for the bank. Errors (Q2–Q9) fail the build; warnings are reported.
 * The schema already checks shapes (option count, answer in range, both languages).
 */
export function checkQuestions(
  questions: BankQuestion[],
  terms: Map<string, NamedTerm>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const duplicate = duplicateIds();
  const clusters = new Set([...terms.values()].map((t) => t.cluster).filter(Boolean));
  for (const q of questions) {
    const at = `${q.file ?? '?'}#${q.id}`;
    errors.push(...duplicate(q, at), ...questionErrors(q, at, terms));
    warnings.push(...questionWarnings(q, at, terms, clusters));
  }
  return { errors, warnings };
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
