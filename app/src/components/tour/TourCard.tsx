import { cardModel, fillCount, type TourStep } from '../../lib/tour';
import type { TourUi } from './types';
import type { Tour } from './use-tour';

type CardProps = { tour: Tour; steps: TourStep[]; ui: TourUi };
type Model = ReturnType<typeof cardModel>;
type PartProps = CardProps & { m: Model };

const TITLE_ID = 'tour-title';
const BODY_ID = 'tour-body';
const btn = 'min-h-11 rounded border px-3 py-1.5 text-sm sm:min-h-0';
const primary = `${btn} border-amber-400 bg-amber-400 font-medium text-on-accent hover:bg-amber-300`;
const secondary = `${btn} border-border-strong text-fg-soft hover:border-border-hover`;

/** The overlay: the spotlight, and the (non-modal) card describing what it lights. */
export function TourOverlay(props: CardProps) {
  const { refs } = props.tour;
  return (
    <div class="print:hidden" data-tour-overlay ref={refs.root}>
      <div aria-hidden="true" class="tour-spot" ref={refs.spot} />
      <TourDialog {...props} />
    </div>
  );
}

function TourDialog(props: CardProps) {
  const { tour, steps } = props;
  const m = cardModel(tour.shown?.view, steps.length);
  return (
    <div
      ref={tour.refs.card}
      role="dialog"
      aria-modal="false"
      aria-labelledby={TITLE_ID}
      aria-describedby={BODY_ID}
      tabIndex={-1}
      class="tour-card max-h-[60dvh] overflow-y-auto rounded border border-border-strong bg-surface p-4 text-fg shadow-2xl focus:outline-none"
    >
      <CardText {...props} m={m} />
      {m.welcome ? <WelcomeActions {...props} /> : <StepActions {...props} m={m} />}
    </div>
  );
}

/** Title (a bridge card: the way to the next page), close button and body. */
function CardText({ tour, steps, ui, m }: PartProps) {
  const current = steps[m.textStep];
  const bridgeBody = tour.shown?.via === 'menu' ? ui.tourBridgeMenu : ui.tourBridgeLink;
  const close = () => tour.finish(m.welcome ? tour.dontShow : false);
  return (
    <>
      <div class="mb-1 flex items-start justify-between gap-4">
        <h2 id={TITLE_ID} class="text-base font-semibold">
          {m.bridge ? (current.via ?? current.title) : current.title}
        </h2>
        <CloseButton label={ui.tourClose} onClick={close} />
      </div>
      <p id={BODY_ID} class="text-sm text-fg-soft">
        {m.bridge ? bridgeBody : current.body}
      </p>
    </>
  );
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      class="-mt-3 -mr-3 flex h-11 w-11 shrink-0 items-center justify-center text-lg leading-none text-subtle hover:text-fg sm:-mt-1 sm:-mr-1 sm:h-auto sm:w-auto sm:px-1"
      onClick={onClick}
    >
      ×
    </button>
  );
}

/** The welcome card: start, not now, and "don't show again". */
function WelcomeActions({ tour, ui }: CardProps) {
  return (
    <div class="mt-4 space-y-3">
      <div class="flex flex-wrap gap-2">
        <button type="button" class={primary} onClick={() => tour.go(1)}>
          {ui.tourWelcomeStart}
        </button>
        <button type="button" class={secondary} onClick={() => tour.finish(tour.dontShow)}>
          {ui.tourNotNow}
        </button>
      </div>
      <DontShowAgain tour={tour} label={ui.tourDontShow} />
    </div>
  );
}

function DontShowAgain({ tour, label }: { tour: Tour; label: string }) {
  return (
    <label class="flex min-h-11 items-center gap-2 text-sm text-muted sm:min-h-0 sm:text-xs">
      <input
        type="checkbox"
        checked={tour.dontShow}
        onChange={(e) => tour.setDontShow((e.target as HTMLInputElement).checked)}
      />
      {label}
    </label>
  );
}

/** A step (or bridge) card: "Step n of m", then Back and Next/Finish. */
function StepActions(props: PartProps) {
  const { steps, ui, m } = props;
  return (
    <div class="mt-4 flex items-center justify-between gap-3">
      <span class="text-xs text-subtle" aria-live="polite">
        {/* No count on the way from the welcome card: it is not a step. */}
        {m.step > 0 && fillCount(ui.tourStepOf, m.step, steps.length - 1)}
      </span>
      <div class="flex gap-2">
        <StepButtons {...props} />
      </div>
    </div>
  );
}

/**
 * What Back and Next do. On a bridge card: Back returns to the step it came from, Next
 * goes to the next page. Otherwise they move one step.
 */
function stepMoves({ tour, steps, m }: PartProps) {
  const { bridge } = m;
  if (!bridge) return { back: () => tour.go(m.step - 1), next: () => tour.go(m.step + 1) };
  return {
    back: () => tour.setView({ kind: 'show', step: bridge.from }),
    next: () => tour.leave(bridge.to, steps[bridge.to].page ?? ''),
  };
}

function StepButtons(props: PartProps) {
  const { ui, m } = props;
  const { back, next } = stepMoves(props);
  return (
    <>
      {(m.bridge || m.step > 1) && (
        <button type="button" class={secondary} onClick={back}>
          {ui.tourBack}
        </button>
      )}
      <button type="button" class={primary} onClick={next} data-tour-next>
        {m.last ? ui.tourFinish : ui.tourNext}
      </button>
    </>
  );
}
