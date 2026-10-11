import type { Question, QuestionKind, Rng } from './quiz-types';

export const shuffle = <T>(xs: T[], rng: Rng) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const pick = <T>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)];

export function varied(qs: Question[], n: number, rng: Rng): Question[] {
  const byKind = new Map<QuestionKind, Question[]>();
  for (const q of shuffle(qs, rng)) byKind.set(q.kind, [...(byKind.get(q.kind) ?? []), q]);
  const queues = shuffle([...byKind.values()], rng);
  const out: Question[] = [];
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (out.length >= n) break;
      const next = q.shift();
      if (next) out.push(next);
    }
  }
  return out;
}
