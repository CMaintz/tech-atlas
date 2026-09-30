/** Hand-written questions (A90) as quiz questions, looked up by the terms they test. */
import type { ClientQuestion } from './question-rules';
import { shuffle } from './quiz-random';
import type { Question, Rng } from './quiz-types';

/** The bank keyed by tested term. */
export type BankIndex = Map<string, ClientQuestion[]>;

export function indexBank(bank: ClientQuestion[]): BankIndex {
  const byTerm: BankIndex = new Map();
  for (const q of bank) for (const t of q.terms) byTerm.set(t, [...(byTerm.get(t) ?? []), q]);
  return byTerm;
}

/** Hand-written questions that test `id`. `onPage`: not those `id` itself answers (A79). */
export const bankFor = (bank: BankIndex, id: string, onPage = false): ClientQuestion[] =>
  (bank.get(id) ?? []).filter((q) => !onPage || !q.answeredBy.includes(id));

/**
 * A bank question as a quiz question. Options are shuffled (true/false keeps its
 * order); a wrong answer links to the term the answer names, else to a tested
 * term other than the one being practised.
 */
export function fromBank(rng: Rng, q: ClientQuestion, practised = q.terms[0]): Question {
  const options = q.options.map((label, i) => ({ id: String(i), label }));
  return {
    termId: q.terms[0],
    termIds: q.terms,
    bankId: q.id,
    kind: q.kind,
    prompt: q.stem,
    options: q.kind === 'true-false' ? options : shuffle(options, rng),
    answer: String(q.answer),
    explanation: q.explanation,
    link: q.answeredBy[0] ?? q.terms.find((t) => t !== practised) ?? q.terms[0],
  };
}
