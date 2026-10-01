import PanelHeading from './PanelHeading';
import type { PartProps } from './types';

/** How many how-to steps the panel previews (A101). */
const HOW_TO_PREVIEW = 3;

/** One numbered step. */
function HowToStep({ n, text }: { n: number; text: string }) {
  return (
    <li class="flex gap-2">
      <span
        aria-hidden="true"
        class="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[0.7rem] font-semibold text-fg"
      >
        {n}
      </span>
      <span class="text-fg-soft">{text}</span>
    </li>
  );
}

/** "All steps and guides": the how-to section of the term page. */
function HowToMore({ panel: { props } }: PartProps) {
  return (
    <a
      class="mt-2 inline-flex min-h-11 items-center text-sm text-muted underline-offset-2 hover:text-fg hover:underline sm:min-h-0"
      href={`${props.termBase}${props.id}/#how-to`}
      title={props.text.howToMoreLabel}
    >
      {props.text.howToMore}
    </a>
  );
}

/**
 * How to put it into practice (A101): the first steps only, and a link to the term page,
 * which has them all, with pitfalls and guides. Absent when the term has no how-to.
 */
export default function HowToPreview({ panel }: PartProps) {
  const { record, props } = panel;
  const steps = record?.howTo?.steps[props.lang].slice(0, HOW_TO_PREVIEW) ?? [];
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="tp-howto" data-panel-howto>
      <PanelHeading spacing="mb-2" id="tp-howto">
        {props.text.howTo}
      </PanelHeading>
      <HowToSteps steps={steps} />
      <HowToMore panel={panel} />
    </section>
  );
}

/** The previewed steps, numbered from 1. */
function HowToSteps({ steps }: { steps: string[] }) {
  return (
    <ol class="space-y-2 text-sm">
      {steps.map((s, i) => (
        <HowToStep n={i + 1} text={s} />
      ))}
    </ol>
  );
}
