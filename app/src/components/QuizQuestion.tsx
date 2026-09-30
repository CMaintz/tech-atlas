import type { Question } from '../lib/quiz';
import type { QuizState } from '../lib/use-quiz';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;
type Option = Question['options'][number];
/** Every part of a question's view gets the same props. */
type Props = { quiz: QuizState; q: Question; lang: Lang; termBase: string; ui: Dict };

/** An option's look: neutral until answered, then the right one green, a wrong choice red. */
function optionClass(o: Option, q: Question, chosen: string | null) {
  if (!chosen) return 'border-border-strong hover:border-border-hover';
  if (o.id === q.answer) return 'border-green-600 bg-green-50 dark:bg-green-950/40';
  if (o.id === chosen) return 'border-red-600 bg-red-50 dark:bg-red-950/40';
  return 'border-border opacity-60';
}

function Options({ quiz, q }: Props) {
  // Term → definition options are whole sentences: one per row reads better.
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

/** Right, or wrong with the right answer — linked to its term unless an explanation follows. */
function Verdict({ quiz, q, termBase, ui }: Props) {
  if (quiz.chosen === q.answer)
    return <span class="text-green-700 dark:text-green-400">{ui.correct}</span>;
  const answerLabel = q.options.find((o) => o.id === q.answer)!.label;
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

/** Why, for a hand-written question, with a link to the term to read. */
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

/** One question of a session: counter, prompt, options and, once answered, the feedback. */
export default function QuizQuestion(props: Props) {
  const { quiz, q } = props;
  return (
    <div class="space-y-3">
      <p class="text-xs text-subtle">
        {quiz.index + 1} / {quiz.session!.length}
      </p>
      <p class="text-fg">{q.prompt}</p>
      <Options {...props} />
      {quiz.chosen && <Feedback {...props} />}
    </div>
  );
}
