/** The shapes the quiz modules share. */
import type { ClientQuestion } from './question-rules';

export type Lang = 'en' | 'da';
export type QuestionKind =
  'definition' | 'meaning' | 'relation' | 'odd-one-out' | 'true-false' | ClientQuestion['kind'];
export type Question = {
  /** The term whose spaced-repetition record this answer updates. */
  termId: string;
  /** Every term the answer updates, when a hand-written question tests several. */
  termIds?: string[];
  /** Id of a hand-written question: it keeps its own repetition record. */
  bankId?: string;
  /** Why the answer is right and the others are not (hand-written questions). */
  explanation?: string;
  kind: QuestionKind;
  prompt: string;
  options: { id: string; label: string }[];
  /** Id of the correct option (a term id, or 'true' / 'false'). */
  answer: string;
  /** The term to read when the answer was wrong. */
  link: string;
};
/** The random source: `Math.random`, or a seeded one in tests. */
export type Rng = () => number;
/** An edge seen from one of its ends: 'out' from its source, 'in' from its target. */
export type Dir = 'out' | 'in';
