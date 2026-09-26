import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Graph } from '../lib/graph-model';
import { buildSession, makeQuizzer, type Question, type Scope } from '../lib/quiz';
import { loadLearner, recordAnswer, recordQuestion, saveLearner } from '../lib/learner';
import type { ClientQuestion } from '../lib/question-rules';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;

interface Props {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  ui: Dict;
  /** Quiz a single term (the term page's "Check yourself"); otherwise a session over `scope`. */
  termId?: string;
  /** What a session draws from: 'all', 'weak', 'domain:<id>' or 'cluster:<id>'. */
  scope?: Scope;
  count?: number;
}

/**
 * The hand-written question bank sits next to graph.json (A90), so every caller
 * that already passes `graphUrl` (term page, Explorer panel, study hub) gets it.
 */
const bankUrl = (graphUrl: string, lang: Lang) =>
  graphUrl.replace(/graph\.json(\?.*)?$/, `questions-${lang}.json`);

/**
 * A short quiz session: hand-written questions first where a term has them, the rest
 * generated from the graph; every answer feeds spaced repetition.
 */
export default function Quiz({
  lang,
  graphUrl,
  termBase,
  ui,
  termId,
  scope = 'all',
  count = 10,
}: Props) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [bank, setBank] = useState<ClientQuestion[] | null>(null);
  const [session, setSession] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetch(graphUrl)
      .then((r) => r.json())
      .then(setGraph);
    // No bank (missing file, offline) just means generated questions only.
    const url = bankUrl(graphUrl, lang);
    (url === graphUrl ? Promise.resolve([]) : fetch(url).then((r) => (r.ok ? r.json() : [])))
      .catch(() => [])
      .then(setBank);
  }, [graphUrl, lang]);

  const quizzer = useMemo(
    () => (graph && bank ? makeQuizzer(graph, lang, Math.random, bank) : null),
    [graph, bank, lang],
  );

  const start = () => {
    if (!graph || !quizzer) return;
    // A term page asks about the term, never questions the page itself answers (A79);
    // a session puts due reviews first and mixes question kinds.
    const qs = termId
      ? quizzer.pageQuestions(termId, count)
      : buildSession(graph, loadLearner(), scope, quizzer, count);
    setSession(qs);
    setIndex(0);
    setChosen(null);
    setScore(0);
  };

  // The term page starts straight away; the study hub waits for "Start".
  useEffect(() => {
    if (termId && quizzer) start();
  }, [quizzer]);

  if (!quizzer) return <p class="text-sm text-subtle">{ui.loading}</p>;

  if (!session) {
    return (
      <button
        class="min-h-11 rounded border border-border-hover px-3 py-1.5 text-sm hover:bg-surface sm:min-h-0"
        onClick={start}
      >
        {ui.start}
      </button>
    );
  }
  if (session.length === 0)
    return (
      <p class="text-sm text-subtle">
        {scope === 'weak' && !termId ? ui.noWeakTerms : ui.noQuestions}
      </p>
    );

  if (index >= session.length) {
    return (
      <div class="space-y-3">
        <p class="text-lg">
          {ui.score.replace('{n}', String(score)).replace('{m}', String(session.length))}
        </p>
        <button
          class="min-h-11 rounded border border-border-hover px-3 py-1.5 text-sm hover:bg-surface sm:min-h-0"
          onClick={start}
        >
          {ui.again}
        </button>
      </div>
    );
  }

  const q = session[index];
  const answer = (id: string) => {
    if (chosen) return;
    setChosen(id);
    const correct = id === q.answer;
    if (correct) setScore((s) => s + 1);
    let learner = loadLearner();
    for (const t of q.termIds ?? [q.termId]) learner = recordAnswer(learner, t, correct);
    if (q.bankId) learner = recordQuestion(learner, q.bankId, correct);
    saveLearner(learner);
  };
  const linkName = graph?.nodes.find((n) => n.id === q.link)?.term[lang];
  const answerLabel = q.options.find((o) => o.id === q.answer)!.label;
  // Term → definition options are whole sentences: one per row reads better.
  const long = q.options.some((o) => o.label.length > 60);

  return (
    <div class="space-y-3">
      <p class="text-xs text-subtle">
        {index + 1} / {session.length}
      </p>
      <p class="text-fg">{q.prompt}</p>
      <div class={`grid gap-2 ${long ? '' : 'sm:grid-cols-2'}`}>
        {q.options.map((o) => {
          const state = !chosen
            ? 'border-border-strong hover:border-border-hover'
            : o.id === q.answer
              ? 'border-green-600 bg-green-50 dark:bg-green-950/40'
              : o.id === chosen
                ? 'border-red-600 bg-red-50 dark:bg-red-950/40'
                : 'border-border opacity-60';
          return (
            <button
              class={`min-h-11 rounded border px-3 py-2 text-left text-sm ${state}`}
              onClick={() => answer(o.id)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div class="flex flex-wrap items-center gap-3 text-sm">
          {chosen === q.answer ? (
            <span class="text-green-700 dark:text-green-400">{ui.correct}</span>
          ) : q.explanation ? (
            <span class="text-red-700 dark:text-red-400">
              {ui.incorrect} {answerLabel}
            </span>
          ) : (
            <span class="text-red-700 dark:text-red-400">
              {ui.incorrect}{' '}
              <a class="underline" href={`${termBase}${q.link}/`}>
                {answerLabel}
              </a>
            </span>
          )}
          {q.explanation && (
            <p class="basis-full text-fg-soft">
              {q.explanation}{' '}
              {linkName && (
                <a class="underline" href={`${termBase}${q.link}/`}>
                  {ui.readAbout ?? '→'} {linkName}
                </a>
              )}
            </p>
          )}
          <button
            class="min-h-11 rounded border border-border-hover px-3 py-1 hover:bg-surface sm:min-h-0"
            onClick={() => {
              setIndex(index + 1);
              setChosen(null);
            }}
          >
            {ui.next}
          </button>
        </div>
      )}
    </div>
  );
}
