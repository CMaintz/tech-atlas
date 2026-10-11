import PanelHeading from './PanelHeading';
import type { PartProps } from './types';

const HOW_TO_PREVIEW_STEPS = 3;

function NumberedHowToStep({ n, text }: { n: number; text: string }) {
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

function AllStepsLink({ panel: { props } }: PartProps) {
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

export default function HowToPreview({ panel }: PartProps) {
  const { record, props } = panel;
  const steps = record?.howTo?.steps[props.lang].slice(0, HOW_TO_PREVIEW_STEPS) ?? [];
  if (steps.length === 0) return null;
  return (
    <section aria-labelledby="tp-howto" data-panel-howto>
      <PanelHeading spacing="mb-2" id="tp-howto">
        {props.text.howTo}
      </PanelHeading>
      <ol class="space-y-2 text-sm">
        {steps.map((s, i) => (
          <NumberedHowToStep n={i + 1} text={s} />
        ))}
      </ol>
      <AllStepsLink panel={panel} />
    </section>
  );
}
