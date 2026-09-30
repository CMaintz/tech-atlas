/**
 * The wording of generated quiz questions (A79), in both languages, and which edge
 * types each kind of question may ask about. Pure data.
 */
import type { EdgeType } from '../schema';
import type { Dir, Lang } from './quiz-types';

type Bi = Record<Lang, (x: string) => string>;

/** Relation questions: one template per edge type and direction. `x` is the question's term. */
export const ASK: Partial<Record<EdgeType, Partial<Record<Dir, Bi>>>> = {
  requires: {
    out: {
      en: (x) => `What should you understand before ${x}?`,
      da: (x) => `Hvad bør du forstå før ${x}?`,
    },
    in: {
      en: (x) => `Which of these builds on ${x}?`,
      da: (x) => `Hvilket af disse bygger videre på ${x}?`,
    },
  },
  'kind-of': {
    out: { en: (x) => `What is ${x} a kind of?`, da: (x) => `Hvad er ${x} en slags?` },
    in: {
      en: (x) => `Which of these is a kind of ${x}?`,
      da: (x) => `Hvilket af disse er en slags ${x}?`,
    },
  },
  'part-of': {
    out: { en: (x) => `What is ${x} part of?`, da: (x) => `Hvad er ${x} en del af?` },
    in: {
      en: (x) => `Which of these is part of ${x}?`,
      da: (x) => `Hvilket af disse er en del af ${x}?`,
    },
  },
  implements: {
    out: {
      en: (x) => `What does ${x} put into practice?`,
      da: (x) => `Hvad er det, ${x} omsætter til praksis?`,
    },
    in: {
      en: (x) => `Which of these puts ${x} into practice?`,
      da: (x) => `Hvilket af disse omsætter ${x} til praksis?`,
    },
  },
  mitigates: {
    out: {
      en: (x) => `What does ${x} help protect against?`,
      da: (x) => `Hvad hjælper ${x} med at beskytte mod?`,
    },
    in: {
      en: (x) => `What helps protect against ${x}?`,
      da: (x) => `Hvad hjælper med at beskytte mod ${x}?`,
    },
  },
  exploits: {
    out: {
      en: (x) => `What does ${x} take advantage of?`,
      da: (x) => `Hvad er det, ${x} udnytter?`,
    },
    in: {
      en: (x) => `What takes advantage of ${x}?`,
      da: (x) => `Hvad er det, der udnytter ${x}?`,
    },
  },
  causes: {
    out: { en: (x) => `What can ${x} lead to?`, da: (x) => `Hvad kan ${x} føre til?` },
    in: { en: (x) => `What can lead to ${x}?`, da: (x) => `Hvad kan føre til ${x}?` },
  },
  mandates: {
    out: {
      en: (x) => `Which of these does ${x} make mandatory?`,
      da: (x) => `Hvilket af disse kræves af ${x}?`,
    },
    in: {
      en: (x) => `Which rule makes ${x} mandatory?`,
      da: (x) => `Hvilken regel gør ${x} obligatorisk?`,
    },
  },
  supersedes: {
    out: { en: (x) => `What did ${x} replace?`, da: (x) => `Hvad blev afløst af ${x}?` },
    in: { en: (x) => `What replaced ${x}?`, da: (x) => `Hvad har afløst ${x}?` },
  },
  'contrasts-with': {
    out: {
      en: (x) => `Which of these is easily confused with ${x}?`,
      da: (x) => `Hvilket af disse forveksles let med ${x}?`,
    },
  },
  'alternative-to': {
    out: {
      en: (x) => `Which of these is an alternative to ${x}?`,
      da: (x) => `Hvilket af disse er et alternativ til ${x}?`,
    },
  },
  'used-with': {
    out: {
      en: (x) => `Which of these is often used together with ${x}?`,
      da: (x) => `Hvilket af disse bruges ofte sammen med ${x}?`,
    },
  },
};
export const SYMMETRIC = new Set<EdgeType>(['contrasts-with', 'alternative-to', 'used-with']);
/** Types whose chains are also right answers (a prerequisite's prerequisite is one too). */
export const TRANSITIVE = new Set<EdgeType>(['requires', 'kind-of', 'part-of', 'supersedes']);

/**
 * True/false statements, only for edge types whose reverse is certainly false in
 * the map (a `requires` cycle is a lint error; nothing is a kind of its own kind),
 * so the false version is never true by accident.
 */
export const STATE: Partial<Record<EdgeType, Record<Lang, (a: string, b: string) => string>>> = {
  requires: {
    en: (a, b) => `You need to understand ${b} before ${a}.`,
    da: (a, b) => `Man skal forstå ${b} før ${a}.`,
  },
  'kind-of': { en: (a, b) => `${a} is a kind of ${b}.`, da: (a, b) => `${a} er en slags ${b}.` },
  'part-of': { en: (a, b) => `${a} is part of ${b}.`, da: (a, b) => `${a} er en del af ${b}.` },
  implements: {
    en: (a, b) => `${a} puts ${b} into practice.`,
    da: (a, b) => `${a} omsætter ${b} til praksis.`,
  },
  supersedes: { en: (a, b) => `${a} replaced ${b}.`, da: (a, b) => `${a} afløste ${b}.` },
};

export const T = {
  definition: {
    en: (s: string) => `Which term matches this definition? “${s}”`,
    da: (s: string) => `Hvilket begreb passer til denne definition? “${s}”`,
  },
  meaning: {
    en: (x: string) => `What does ${x} mean?`,
    da: (x: string) => `Hvad betyder ${x}?`,
  },
  odd: {
    en: (x: string) => `Which of these is NOT related to ${x}?`,
    da: (x: string) => `Hvilket af disse hænger IKKE sammen med ${x}?`,
  },
  trueFalse: {
    en: (s: string) => `True or false? ${s}`,
    da: (s: string) => `Sandt eller falsk? ${s}`,
  },
  true: { en: 'True', da: 'Sandt' },
  false: { en: 'False', da: 'Falsk' },
} as const;
