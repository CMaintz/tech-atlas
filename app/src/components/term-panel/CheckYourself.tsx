import { useState } from 'preact/hooks';
import KnowledgeStatus from '../KnowledgeStatus';
import Quiz from '../Quiz';
import PanelHeading from './PanelHeading';
import type { PartProps } from './types';

const BTN =
  'rounded border border-border-strong px-2 py-1 text-xs text-fg-soft hover:border-border-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)';

/** The quick quiz: a button until asked for, then three questions on the term. */
function QuickQuiz({ panel: { props } }: PartProps) {
  const [quiz, setQuiz] = useState(false);
  return quiz ? (
    <Quiz
      lang={props.lang}
      graphUrl={props.graphUrl}
      termBase={props.termBase}
      ui={props.ui}
      termId={props.id}
      count={3}
    />
  ) : (
    <button type="button" class={BTN} onClick={() => setQuiz(true)}>
      {props.text.quickQuiz}
    </button>
  );
}

/**
 * Self-assessment and a quick quiz on the term. Rendered with `key={id}`, so a new term
 * starts with the quiz closed again.
 */
export default function CheckYourself({ panel }: PartProps) {
  const { props } = panel;
  return (
    <section class="space-y-3 rounded border border-border p-3">
      <PanelHeading>{props.ui.checkYourself}</PanelHeading>
      <KnowledgeStatus key={props.id} termId={props.id} ui={props.ui} />
      <QuickQuiz panel={panel} />
    </section>
  );
}
