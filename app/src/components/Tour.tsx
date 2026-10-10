import type { TourStep } from '../lib/tour';
import { ResumePill } from './tour/ResumePill';
import { TourOverlay } from './tour/TourCard';
import type { TourUi } from './tour/types';
import { useTour } from './tour/use-tour';

interface Props {
  steps: TourStep[];
  langBase: string;
  autoStart?: boolean;
  ui: TourUi;
}

export default function Tour({ steps, langBase, autoStart = true, ui }: Props) {
  const tour = useTour(steps, langBase, autoStart);
  const { view } = tour;
  if (view.kind === 'resume') {
    const total = steps.length - 1; // the welcome card is not counted as a step
    const end = () => tour.finish(false);
    return <ResumePill step={view.step} total={total} ui={ui} onResume={tour.go} onEnd={end} />;
  }
  if (view.kind === 'off' && !tour.shown) return null;
  return <TourOverlay tour={tour} steps={steps} ui={ui} />;
}
