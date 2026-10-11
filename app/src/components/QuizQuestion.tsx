import type { Question } from '../lib/quiz';
import type { QuizState } from '../lib/use-quiz';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;
type Option = Question['options'][number];
type Props = { quiz: QuizState; q: Question; lang: Lang; termBase: string; ui: Dict };

function required<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`${what} is missing`);
  return value;
}

function optionClass(o: Option, q: Question, chosen: string | null) {
  if (!chosen) return 'border-border-strong hover:border-border-hover';
  if (o.id === q.answer) return 'border-green-600 bg-green-50 dark:bg-green-950/40';
  if (o.id === chosen) return 'border-red-600 bg-red-50 dark:bg-red-950/40';
  return 'border-border opacity-60';
}

function Options({ quiz, q }: Props) {
  const long = q.options.some((o) => o.label.length > 60);
  return (
    <div class={`grid gap-2 ${long ? '' : 'sm:grid-cols-2'}`}>
      {q.options.map((o) => (
        <button
          class={`min-h-11 rounded border px-3 py-2 text-left text-sm ${optionClass(o, q, quiz.chosen)}`}
          onClick={() => quiz.answer(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const answerOption = (q: Question) =>
  required(
    q.options.find((o) => o.id === q.answer),
    'answer',
  );

function Verdict({ quiz, q, termBase, ui }: Props) {
  if (quiz.chosen === q.answer)
    return <span class="text-green-700 dark:text-green-400">{ui.correct}</span>;
  const answerLabel = answerOption(q).label;
  return (
    <span class="text-red-700 dark:text-red-400">
      {ui.incorrect}{' '}
      {q.explanation ? (
        answerLabel
      ) : (
        <a class="underline" href={`${termBase}${q.link}/`}>
          {answerLabel}
        </a>
      )}
    </span>
  );
}

function Explanation({ quiz, q, lang, termBase, ui }: Props) {
  const linkName = quiz.graph?.nodes.find((n) => n.id === q.link)?.term[lang];
  return (
    <p class="basis-full text-fg-soft">
      {q.explanation}{' '}
      {linkName && (
        <a class="underline" href={`${termBase}${q.link}/`}>
          {ui.readAbout ?? '→'} {linkName}
        </a>
      )}
    </p>
  );
}

function Feedback(props: Props) {
  return (
    <div class="flex flex-wrap items-center gap-3 text-sm">
      <Verdict {...props} />
      {props.q.explanation && <Explanation {...props} />}
      <button
        class="min-h-11 rounded border border-border-hover px-3 py-1 hover:bg-surface sm:min-h-0"
        onClick={props.quiz.next}
      >
        {props.ui.next}
      </button>
    </div>
  );
}

export default function QuizQuestion(props: Props) {
  const { quiz, q } = props;
  return (
    <div class="space-y-3">
      <p class="text-xs text-subtle">
        {quiz.index + 1} / {required(quiz.session, 'quiz session').length}
      </p>
      <p class="text-fg">{q.prompt}</p>
      <Options {...props} />
      {quiz.chosen && <Feedback {...props} />}
    </div>
  );
}
