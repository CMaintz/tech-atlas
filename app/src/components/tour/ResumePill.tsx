import { fillCount } from '../../lib/tour';
import type { TourUi } from './types';

type ResumePillProps = {
  step: number;
  /** Steps in the tour, not counting the welcome card. */
  total: number;
  ui: TourUi;
  onResume: (step: number) => void;
  onEnd: () => void;
};

/** A tour is running but its step lives on another page: offer to continue or end it. */
export function ResumePill({ step, total, ui, onResume, onEnd }: ResumePillProps) {
  return (
    <div class="tour-pill fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] flex items-center gap-2 rounded border border-border-strong bg-surface px-3 py-2 text-sm shadow-lg print:hidden">
      <ResumeButton
        label={fillCount(ui.tourContinue, step, total)}
        onClick={() => onResume(step)}
      />
      <EndButton label={ui.tourEnd} onClick={onEnd} />
    </div>
  );
}

/** Ends the tour here. */
function EndButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class="min-h-11 text-subtle hover:text-fg-soft sm:min-h-0"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ResumeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      class="min-h-11 text-accent hover:underline sm:min-h-0"
      onClick={onClick}
      data-tour-resume
    >
      {label} →
    </button>
  );
}
