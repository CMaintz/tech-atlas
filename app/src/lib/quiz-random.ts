/** Random draws for the quiz, from a caller-supplied source so tests can seed it. */
import type { Question, QuestionKind, Rng } from './quiz-types';

/** A shuffled copy (Fisher–Yates). */
export const shuffle = <T>(xs: T[], rng: Rng) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = <T>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)];

/** Round-robin over kinds so a short session mixes question types. */
export function varied(qs: Question[], n: number, rng: Rng): Question[] {
  const byKind = new Map<QuestionKind, Question[]>();
  for (const q of shuffle(qs, rng)) byKind.set(q.kind, [...(byKind.get(q.kind) ?? []), q]);
  const queues = shuffle([...byKind.values()], rng);
  const out: Question[] = [];
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && out.length < n) out.push(q.shift()!);
  }
  return out;
}
