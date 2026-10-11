import { namesOf } from './autolink';
import { bareName } from './collisions';
import { containsWord } from './whole-word';

type Localized = { en: string; da: string };
const LANGS = ['en', 'da'] as const;

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
  file?: string;
};

export type NamedTerm = {
  id: string;
  term: Localized;
  aka?: { en: string[]; da: string[] };
  cluster?: string;
};

type KnownContent = { terms: Map<string, NamedTerm>; clusters: Set<string | undefined> };

export type ClientQuestion = {
  id: string;
  terms: string[];
  kind: BankQuestion['kind'];
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: number;
  answeredBy: string[];
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ');

export function namesOfTerm(t: NamedTerm): string[] {
  const labels = [t.term.en, t.term.da, ...(t.aka?.en ?? []), ...(t.aka?.da ?? [])];
  const slug = bareName(t.id).replace(/-/g, ' ');
  return [...new Set([...labels.flatMap(namesOf), slug].map(norm).filter(Boolean))];
}

export function answeredBy(q: BankQuestion, terms: Map<string, NamedTerm>): string[] {
  const right = q.options[q.answer];
  if (!right) return [];
  const labels = LANGS.flatMap((l) => namesOf(right[l])).map(norm);
  return q.terms.filter((id) => {
    const t = terms.get(id);
    return !!t && namesOfTerm(t).some((n) => labels.includes(n));
  });
}

export function checkQuestions(
  questions: BankQuestion[],
  terms: Map<string, NamedTerm>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Map<string, string>();
  const known: KnownContent = {
    terms,
    clusters: new Set([...terms.values()].map((t) => t.cluster).filter(Boolean)),
  };
  for (const q of questions) {
    const at = `${q.file ?? '?'}#${q.id}`;
    errors.push(...duplicateIdErrors(seen, q.id, at), ...questionErrors(q, at, terms));
    warnings.push(...questionWarnings(q, at, known));
  }
  return { errors, warnings };
}

function duplicateIdErrors(seen: Map<string, string>, id: string, at: string): string[] {
  const prev = seen.get(id);
  seen.set(id, at);
  return prev ? [`Q2 duplicate question id ${id} (${prev} and ${at})`] : [];
}

function questionErrors(q: BankQuestion, at: string, terms: Map<string, NamedTerm>): string[] {
  return [
    ...testedTermErrors(q, at, terms),
    ...answerIndexErrors(q, at),
    ...LANGS.flatMap((lang) => languageErrors(q, at, lang)),
    ...LANGS.flatMap((lang) => explanationErrors(q, at, lang)),
    ...trueFalseErrors(q, at),
  ];
}

function testedTermErrors(q: BankQuestion, at: string, terms: Map<string, NamedTerm>): string[] {
  const errors = q.terms
    .filter((id) => !terms.has(id))
    .map((id) => `Q3 ${at}: unknown term ${id} (write \`domain/id\`)`);
  if (new Set(q.terms).size !== q.terms.length) errors.push(`Q3 ${at}: a term is listed twice`);
  return errors;
}

function answerIndexErrors(q: BankQuestion, at: string): string[] {
  if (Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length) return [];
  return [`Q4 ${at}: answer ${q.answer} is not an option index`];
}

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

const stemNames = (stem: string, right: string) =>
  namesOf(right).some((n) => norm(n).length >= 3 && containsWord(stem, n.trim()));

function explanationErrors(q: BankQuestion, at: string, lang: 'en' | 'da'): string[] {
  if (q.explanation[lang].trim().length >= 80) return [];
  return [`Q8 ${at}: the ${lang} explanation is too short to explain the wrong options`];
}

function trueFalseErrors(q: BankQuestion, at: string): string[] {
  if (q.kind !== 'true-false') return [];
  const [t, f] = q.options;
  if (t?.en === 'True' && t?.da === 'Sandt' && f?.en === 'False' && f?.da === 'Falsk') return [];
  return [`Q9 ${at}: true-false options must be True/Sandt then False/Falsk`];
}

function questionWarnings(
  q: BankQuestion,
  at: string,
  { terms, clusters }: KnownContent,
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
