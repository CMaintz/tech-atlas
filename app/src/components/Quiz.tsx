import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Graph } from '../lib/graph-model';
import { buildSession, makeQuizzer, type Question, type Scope } from '../lib/quiz';
import { loadLearner, recordAnswer, saveLearner } from '../lib/learner';

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

/** A short quiz session, generated from the graph; every answer feeds spaced repetition. */
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
  const [session, setSession] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetch(graphUrl)
      .then((r) => r.json())
      .then(setGraph);
  }, [graphUrl]);

  const quizzer = useMemo(() => (graph ? makeQuizzer(graph, lang) : null), [graph, lang]);

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

  if (!graph) return <p class="text-sm text-neutral-500">{ui.loading}</p>;

  if (!session) {
    return (
      <button
        class="rounded border border-neutral-400 px-3 py-1.5 text-sm hover:bg-neutral-900"
        onClick={start}
      >
        {ui.start}
      </button>
    );
  }
  if (session.length === 0)
    return (
      <p class="text-sm text-neutral-500">
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
          class="rounded border border-neutral-400 px-3 py-1.5 text-sm hover:bg-neutral-900"
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
    saveLearner(recordAnswer(loadLearner(), q.termId, correct));
  };
  const answerLabel = q.options.find((o) => o.id === q.answer)!.label;
  // Term → definition options are whole sentences: one per row reads better.
  const long = q.options.some((o) => o.label.length > 60);

  return (
    <div class="space-y-3">
      <p class="text-xs text-neutral-500">
        {index + 1} / {session.length}
      </p>
      <p class="text-neutral-100">{q.prompt}</p>
      <div class={`grid gap-2 ${long ? '' : 'sm:grid-cols-2'}`}>
        {q.options.map((o) => {
          const state = !chosen
            ? 'border-neutral-700 hover:border-neutral-400'
            : o.id === q.answer
              ? 'border-green-600 bg-green-950/40'
              : o.id === chosen
                ? 'border-red-600 bg-red-950/40'
                : 'border-neutral-800 opacity-60';
          return (
            <button
              class={`rounded border px-3 py-2 text-left text-sm ${state}`}
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
            <span class="text-green-400">{ui.correct}</span>
          ) : (
            <span class="text-red-400">
              {ui.incorrect}{' '}
              <a class="underline" href={`${termBase}${q.link}/`}>
                {answerLabel}
              </a>
            </span>
          )}
          <button
            class="rounded border border-neutral-400 px-3 py-1 hover:bg-neutral-900"
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
