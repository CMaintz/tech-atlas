import { TimelineContext } from './timeline/context';
import { Controls } from './timeline/Controls';
import { HorizontalChart } from './timeline/HorizontalChart';
import { Legend } from './timeline/Legend';
import { MorePopover, PanelHost, TermPopover } from './timeline/Popovers';
import type { TimelineProps } from './timeline/types';
import { useTimeline } from './timeline/use-timeline';
import { VerticalChart } from './timeline/VerticalChart';

export type { TimelineEntry, TimelinePanel } from './timeline/types';

/**
 * The swim-lane timeline (Timeline v2): one lane per domain along a year axis with
 * decade ticks and era bands. Horizontal on wide screens, vertical on phones; both are
 * rendered server-side (CSS picks one), so it reads without JavaScript. The island adds
 * domain filtering, zoom and a summary popover.
 */
export default function Timeline(props: TimelineProps) {
  const t = useTimeline(props);
  return (
    <TimelineContext.Provider value={t.ctx}>
      <div class="tl2">
        <Controls domains={props.domains} filter={t.filter} zoom={t.zoom} setZoom={t.setZoom} />
        <Legend domains={props.domains} />
        <HorizontalChart chart={t.chart} more={t.more} />
        <MorePopover list={t.more} byId={t.byId} />
        <VerticalChart chart={t.chart} single={t.filter.shown.length === 1} />
        <SelectedTerm t={t} props={props} />
      </div>
    </TimelineContext.Provider>
  );
}

/** The picked term: in the term panel once its code has loaded, else in the summary popover. */
function SelectedTerm({ t, props }: { t: ReturnType<typeof useTimeline>; props: TimelineProps }) {
  return (
    <>
      <PanelHost panel={t.panel} config={props.panel} domainLabels={props.domainLabels} />
      <TermPopover selection={t.selection} byId={t.byId} />
    </>
  );
}
