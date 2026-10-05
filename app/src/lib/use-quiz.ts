/**
 * The state of a quiz island: the quizzer (graph plus hand-written bank), the current
 * session and the learner's way through it. Every answer feeds spaced repetition.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Graph } from './graph-model';
import { loadLearner, recordAnswer, recordQuestion, saveLearner } from './learner';
import type { ClientQuestion } from './question-rules';
import {
  buildSession,
  makeQuizzer,
  type Lang,
  type Question,
  type Quizzer,
  type Scope,
} from './quiz';
import { useGraph } from './use-graph';

/**
 * The hand-written question bank sits next to graph.json, so every caller
 * that already passes `graphUrl` (term page, Explorer panel, study hub) gets it.
 */
export const bankUrl = (graphUrl: string, lang: Lang) =>
  graphUrl.replace(/graph\.json(\?.*)?$/, `questions-${lang}.json`);

/** The bank for `lang`; empty when it is missing or unreachable, null while loading. */
function useBank(graphUrl: string, lang: Lang): ClientQuestion[] | null {
  const [bank, setBank] = useState<ClientQuestion[] | null>(null);
  useEffect(() => {
    // No bank (missing file, offline) just means generated questions only.
    const url = bankUrl(graphUrl, lang);
    (url === graphUrl ? Promise.resolve([]) : fetch(url).then((r) => (r.ok ? r.json() : [])))
      .catch(() => [])
      .then(setBank);
  }, [graphUrl, lang]);
  return bank;
}

function useQuizzer(graphUrl: string, lang: Lang) {
  const graph = useGraph(graphUrl);
  const bank = useBank(graphUrl, lang);
  const quizzer = useMemo(
    () => (graph && bank ? makeQuizzer(graph, lang, Math.random, bank) : null),
    [graph, bank, lang],
  );
  return { graph, quizzer };
}

/** Record one answer against every term it tests, and against its bank question. */
function saveAnswer(q: Question, correct: boolean) {
  let learner = loadLearner();
  for (const t of q.termIds ?? [q.termId]) learner = recordAnswer(learner, t, correct);
  if (q.bankId) learner = recordQuestion(learner, q.bankId, correct);
  saveLearner(learner);
}

type Progress = { index: number; chosen: string | null; score: number };
const FRESH: Progress = { index: 0, chosen: null, score: 0 };

/** Where the learner is in `session`: the question, the option they chose, the score. */
function useProgress(session: Question[] | null) {
  const [progress, setProgress] = useState<Progress>(FRESH);
  const answer = (id: string) => {
    const q = session?.[progress.index];
    if (!q || progress.chosen) return;
    const correct = id === q.answer;
    setProgress((p) => ({ ...p, chosen: id, score: p.score + (correct ? 1 : 0) }));
    saveAnswer(q, correct);
  };
  const next = () => setProgress((p) => ({ ...p, index: p.index + 1, chosen: null }));
  return { ...progress, answer, next, reset: () => setProgress(FRESH) };
}

export type QuizOptions = {
  lang: Lang;
  graphUrl: string;
  /** Quiz a single term (the term page's "Check yourself"); otherwise a session over `scope`. */
  termId?: string;
  scope: Scope;
  count: number;
};

/**
 * A term page asks about the term, never questions the page itself answers;
 * a session puts due reviews first and mixes question kinds.
 */
const questionsOf = (graph: Graph, quizzer: Quizzer, o: QuizOptions) =>
  o.termId
    ? quizzer.pageQuestions(o.termId, o.count)
    : buildSession(graph, loadLearner(), o.scope, quizzer, o.count);

export function useQuiz(o: QuizOptions) {
  const { graph, quizzer } = useQuizzer(o.graphUrl, o.lang);
  const [session, setSession] = useState<Question[] | null>(null);
  const progress = useProgress(session);
  const start = () => {
    if (!graph || !quizzer) return;
    setSession(questionsOf(graph, quizzer, o));
    progress.reset();
  };
  // The term page starts straight away; the study hub waits for "Start".
  useEffect(() => {
    if (o.termId && quizzer) start();
  }, [quizzer]);
  return { graph, quizzer, session, ...progress, start };
}

export type QuizState = ReturnType<typeof useQuiz>;
