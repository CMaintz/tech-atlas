import { describe, expect, it } from 'vitest';
import { loadQuestions } from '../../scripts/load-questions';
import { loadTerms } from '../../scripts/load-terms';
import { Question as QuestionSchema, QuestionFile } from '../schema';
import { buildGraph, type ModelTerm } from './graph-model';
import { parseLearner, recordAnswer, recordQuestion, type Learner } from './learner';
import {
  answeredBy,
  checkQuestions,
  clientQuestions,
  type BankQuestion,
  type NamedTerm,
} from './question-rules';
import { buildSession, makeQuizzer } from './quiz';
import { mergeLearner } from './sync';

const seeded =
  (seed = 1) =>
  () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

const named = (id: string, en: string, da = en, aka: string[] = []): NamedTerm => ({
  id: `security/${id}`,
  term: { en, da },
  aka: { en: aka, da: [] },
  cluster: 'c',
});
const TERMS = new Map(
  [
    named('phishing', 'Phishing'),
    named('mfa', 'Multi-factor authentication (MFA)', 'Multifaktor-autentifikation (MFA)'),
    named('backup', 'Backup', 'Sikkerhedskopi'),
    named('awareness', 'Security awareness', 'Sikkerhedsbevidsthed'),
  ].map((t) => [t.id, t]),
);
const L = (en: string, da = `${en} (da)`) => ({ en, da });
const WHY = L(
  'Because the right option removes the cause, while each of the other three only treats a symptom or shifts the risk elsewhere.',
  'Fordi det rigtige svar fjerner årsagen, mens hver af de tre andre kun behandler et symptom eller flytter risikoen et andet sted hen.',
);
const q = (over: Partial<BankQuestion> = {}): BankQuestion => ({
  id: 'q-one',
  terms: ['security/phishing'],
  kind: 'scenario',
  stem: L('A clerk at the municipality receives an odd email. What should she do first?'),
  options: [L('Report it'), L('Delete it'), L('Forward it'), L('Reply to it')],
  answer: 0,
  explanation: WHY,
  difficulty: 1,
  sources: [{ title: 'x', tier: 'other' }],
  draft: true,
  file: 'security/c',
  ...over,
});

describe('schema', () => {
  it('accepts a well-formed question file', () => {
    const { file: _, ...one } = q();
    expect(QuestionFile.safeParse({ questions: [one] }).success).toBe(true);
  });

  it('rejects a bare term id, a wrong option count and an answer out of range', () => {
    const { file: _, ...one } = q();
    expect(QuestionSchema.safeParse({ ...one, terms: ['phishing'] }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...one, options: one.options.slice(0, 3) }).success).toBe(
      false,
    );
    expect(QuestionSchema.safeParse({ ...one, answer: 4 }).success).toBe(false);
    expect(
      QuestionSchema.safeParse({ ...one, kind: 'true-false', options: one.options }).success,
    ).toBe(false);
  });

  it('requires both languages and sources', () => {
    const { file: _, ...one } = q();
    expect(QuestionSchema.safeParse({ ...one, stem: { en: 'x' } }).success).toBe(false);
    expect(QuestionSchema.safeParse({ ...one, sources: [] }).success).toBe(false);
  });
});

describe('lint rules', () => {
  const codes = (qs: BankQuestion[]) => checkQuestions(qs, TERMS).errors.map((e) => e.slice(0, 2));

  it('passes a good question', () => {
    expect(checkQuestions([q()], TERMS)).toEqual({ errors: [], warnings: [] });
  });

  it('flags duplicate ids, unknown terms and a bad answer index', () => {
    expect(codes([q(), q()])).toContain('Q2');
    expect(codes([q({ terms: ['security/nope'] })])).toContain('Q3');
    expect(codes([q({ answer: 7 })])).toContain('Q4');
  });

  it('flags blank text, repeated options and a thin explanation', () => {
    expect(codes([q({ stem: L('Stem', ' ') })])).toContain('Q5');
    expect(codes([q({ options: [L('A'), L('a.', 'x'), L('C'), L('D')] })])).toContain('Q6');
    expect(codes([q({ explanation: L('Because.', 'Fordi.') })])).toContain('Q8');
  });

  it('flags a stem that names its own correct option', () => {
    const giveaway = q({
      stem: L('Which control, MFA or something else, stops password reuse?'),
      options: [L('MFA'), L('Backup'), L('Awareness'), L('Firewall')],
    });
    expect(codes([giveaway])).toContain('Q7');
  });

  it('insists true/false options are True then False', () => {
    const tf = q({ kind: 'true-false', options: [L('Yes'), L('No')] });
    expect(codes([tf])).toContain('Q9');
    const ok = q({
      kind: 'true-false',
      options: [
        { en: 'True', da: 'Sandt' },
        { en: 'False', da: 'Falsk' },
      ],
    });
    expect(codes([ok])).toEqual([]);
  });

  it('warns when every tested term answers the question (no page would show it)', () => {
    const self = q({ options: [L('Phishing'), L('Backup'), L('Vishing'), L('Spam')] });
    expect(checkQuestions([self], TERMS).warnings.join()).toContain('W10');
  });
});

describe('answeredBy', () => {
  it('matches names, short forms in parentheses and Danish names', () => {
    const mfa = q({
      terms: ['security/mfa', 'security/phishing'],
      options: [L('MFA'), L('Backup'), L('Awareness'), L('Firewall')],
    });
    expect(answeredBy(mfa, TERMS)).toEqual(['security/mfa']);
    const da = q({
      terms: ['security/backup'],
      options: [{ en: 'A copy', da: 'Sikkerhedskopi' }, L('B'), L('C'), L('D')],
    });
    expect(answeredBy(da, TERMS)).toEqual(['security/backup']);
    expect(answeredBy(q(), TERMS)).toEqual([]);
  });
});

// ---- Integration: the quiz ------------------------------------------------------

const term = (id: string, edges: ModelTerm['edges'] = {}): ModelTerm => ({
  id: `security/${id}`,
  term: { en: id, da: `${id}-da` },
  domain: ['security'],
  cluster: 'c',
  summary: { en: `summary of ${id}`, da: `resumé af ${id}` },
  edges,
});
const graph = buildGraph(
  ['phishing', 'mfa', 'backup', 'awareness', 'a', 'b', 'c', 'd'].map((id) =>
    term(id, id === 'mfa' ? { mitigates: ['phishing'] } : {}),
  ),
);
const graphTerms = new Map(
  graph.nodes.map((n) => [n.id, { id: n.id, term: n.term, aka: { en: [], da: [] } }]),
);
const BANK: BankQuestion[] = [
  // Answered by mfa: never on mfa's page, fine on phishing's.
  q({
    id: 'answer-is-mfa',
    terms: ['security/mfa', 'security/phishing'],
    options: [L('mfa', 'mfa-da'), L('backup'), L('awareness'), L('a')],
  }),
  q({ id: 'about-phishing', terms: ['security/phishing'] }),
  q({ id: 'about-both', terms: ['security/phishing', 'security/mfa'] }),
];
const bank = clientQuestions(BANK, graphTerms, 'en');

describe('term pages', () => {
  it('show hand-written questions first, never one the page’s own term answers', () => {
    for (let seed = 1; seed < 30; seed++) {
      const quizzer = makeQuizzer(graph, 'en', seeded(seed), bank);
      const onMfa = quizzer.pageQuestions('security/mfa', 5);
      expect(onMfa.map((x) => x.bankId)).not.toContain('answer-is-mfa');
      expect(onMfa[0].bankId).toBe('about-both');
      const onPhishing = quizzer.pageQuestions('security/phishing', 3);
      expect(onPhishing.every((x) => x.bankId)).toBe(true);
      expect(new Set(onPhishing.map((x) => x.bankId)).size).toBe(3);
    }
  });

  it('link a wrong answer to the term it names, else another tested term', () => {
    const quizzer = makeQuizzer(graph, 'en', seeded(), bank);
    const [x] = quizzer
      .pageQuestions('security/phishing', 3)
      .filter((y) => y.bankId === 'answer-is-mfa');
    expect(x.link).toBe('security/mfa');
    expect(x.options.find((o) => o.id === x.answer)!.label).toBe('mfa');
    expect(x.explanation).toBe(WHY.en);
  });

  it('fall back to generated questions when the bank has none', () => {
    const quizzer = makeQuizzer(graph, 'en', seeded(), bank);
    expect(quizzer.pageQuestions('security/backup', 3).some((x) => x.bankId)).toBe(false);
  });
});

describe('study sessions', () => {
  const learner: Learner = { terms: {} };

  it('prefer hand-written questions and never repeat one', () => {
    const qs = buildSession(graph, learner, 'all', makeQuizzer(graph, 'en', seeded(), bank), 10);
    const hand = qs.filter((x) => x.bankId).map((x) => x.bankId);
    // One question per term: phishing and mfa each get one of theirs, never the same one.
    expect(hand.length).toBe(2);
    expect(new Set(hand).size).toBe(2);
    expect(qs.some((x) => !x.bankId)).toBe(true);
  });

  it('skip a hand-written question that is not yet due again', () => {
    const now = 1_000_000;
    let l = recordQuestion(learner, 'about-phishing', true, now);
    l = recordQuestion(l, 'answer-is-mfa', true, now);
    l = recordQuestion(l, 'about-both', true, now);
    const qs = buildSession(graph, l, 'all', makeQuizzer(graph, 'en', seeded(), bank), 10, now);
    expect(qs.some((x) => x.bankId)).toBe(false);
  });
});

describe('learner records per question', () => {
  it('keeps a question schedule beside the term schedule, through parse and merge', () => {
    let l: Learner = { terms: {} };
    l = recordAnswer(l, 'security/phishing', false, 10);
    l = recordQuestion(l, 'about-phishing', false, 10);
    expect(l.terms['security/phishing'].wrong).toBe(1);
    expect(l.questions!['about-phishing'].box).toBe(1);
    // Recording a term answer keeps question records and vice versa.
    expect(recordAnswer(l, 'security/mfa', true, 11).questions).toEqual(l.questions);
    expect(parseLearner(JSON.parse(JSON.stringify(l)), 20)).toEqual(l);
    const merged = mergeLearner({ terms: {} }, l);
    expect(merged.questions!['about-phishing'].wrong).toBe(1);
    expect(mergeLearner({ terms: {} }, { terms: {} })).toEqual({ terms: {} });
  });
});

describe('the real bank', { timeout: 30_000 }, () => {
  const { terms } = loadTerms();
  const { questions, errors } = loadQuestions();
  const named = new Map([...terms.entries()].map(([id, t]) => [id, { ...t, id }]));

  it('loads and passes its own rules', () => {
    expect(errors).toEqual([]);
    expect(checkQuestions(questions, named).errors).toEqual([]);
  });

  it('never asks a term page the question its own term answers', () => {
    const real = buildGraph([...terms.entries()].map(([id, t]) => ({ ...t, id }) as ModelTerm));
    for (const lang of ['en', 'da'] as const) {
      const clientBank = clientQuestions(questions, named, lang);
      const quizzer = makeQuizzer(real, lang, seeded(3), clientBank);
      for (const id of new Set(questions.flatMap((x) => x.terms))) {
        for (const x of quizzer.pageQuestions(id, 50)) {
          expect(x.answer, `${id}: ${x.prompt}`).not.toBe(id);
          if (!x.bankId) continue;
          const src = clientBank.find((b) => b.id === x.bankId)!;
          expect(src.answeredBy, `${id}: ${x.bankId}`).not.toContain(id);
        }
      }
    }
  });
});
