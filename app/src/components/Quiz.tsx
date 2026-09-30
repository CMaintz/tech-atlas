import type { ComponentChildren } from 'preact';
import type { Scope } from '../lib/quiz';
import { useQuiz } from '../lib/use-quiz';
import QuizQuestion from './QuizQuestion';

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

/** Start and "again": the quiz's own call to action. */
function QuizButton({ onClick, children }: { onClick: () => void; children: ComponentChildren }) {
  return (
    <button
      class="min-h-11 rounded border border-border-hover px-3 py-1.5 text-sm hover:bg-surface sm:min-h-0"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function QuizScore({
  ui,
  score,
  total,
  onAgain,
}: {
  ui: Dict;
  score: number;
  total: number;
  onAgain: () => void;
}) {
  return (
    <div class="space-y-3">
      <p class="text-lg">{ui.score.replace('{n}', String(score)).replace('{m}', String(total))}</p>
      <QuizButton onClick={onAgain}>{ui.again}</QuizButton>
    </div>
  );
}

const Note = ({ children }: { children: ComponentChildren }) => (
  <p class="text-sm text-subtle">{children}</p>
);

/**
 * A short quiz session: hand-written questions first where a term has them, the rest
 * generated from the graph; every answer feeds spaced repetition.
 */
export default function Quiz(props: Props) {
  const { lang, termBase, ui, termId, scope = 'all' } = props;
  const quiz = useQuiz({ ...props, scope, count: props.count ?? 10 });
  const { session, index } = quiz;
  if (!quiz.quizzer) return <Note>{ui.loading}</Note>;
  if (!session) return <QuizButton onClick={quiz.start}>{ui.start}</QuizButton>;
  if (session.length === 0)
    return <Note>{scope === 'weak' && !termId ? ui.noWeakTerms : ui.noQuestions}</Note>;
  if (index >= session.length)
    return <QuizScore ui={ui} score={quiz.score} total={session.length} onAgain={quiz.start} />;
  return <QuizQuestion quiz={quiz} q={session[index]} lang={lang} termBase={termBase} ui={ui} />;
}
