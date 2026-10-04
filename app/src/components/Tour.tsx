import type { TourStep } from '../lib/tour';
import { ResumePill } from './tour/ResumePill';
import { TourOverlay } from './tour/TourCard';
import type { TourUi } from './tour/types';
import { useTour } from './tour/use-tour';

interface Props {
  steps: TourStep[];
  /** Language root, e.g. /en/ */
  langBase: string;
  /** False on pages where a first-time visitor should not be greeted (the 404 page). */
  autoStart?: boolean;
  ui: TourUi;
}

/**
 * The guided tour (A61, motion reworked in A85): a non-modal, step-by-step card with a
 * spotlight on the part of the page it describes. Its position is kept in localStorage,
 * so it follows the reader from page to page; a click on any `[data-tour-start]` element
 * restarts it. Before it changes page it points at the link that goes there.
 *
 * Motion: every step first scrolls its target into view (smoothly), then glides the
 * spotlight and card there with one CSS transform transition. Scroll/resize tracking
 * measures once per frame and writes styles directly — no re-render per frame.
 */
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
