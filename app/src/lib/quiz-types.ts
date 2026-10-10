import type { ClientQuestion } from './question-rules';

export type Lang = 'en' | 'da';
export type QuestionKind =
  'definition' | 'meaning' | 'relation' | 'odd-one-out' | 'true-false' | ClientQuestion['kind'];
export type Question = {
  termId: string;
  termIds?: string[];
  bankId?: string;
  explanation?: string;
  kind: QuestionKind;
  prompt: string;
  options: { id: string; label: string }[];
  answer: string;
  link: string;
};
export type Rng = () => number;
export type Dir = 'out' | 'in';
