import {
  H_PAD,
  LABEL_COL,
  LANE_PAD,
  type Chip,
  type HLane,
  type HLayout,
} from '../../lib/timeline-layout';
import { useTimelineCtx } from './context';
import { Dot } from './Dot';
import { inkVars } from './ink';
import type { TimelineEntry } from './types';
import { chipHandlers, type MoreList } from './use-more-list';

type Lane = HLane<TimelineEntry>;
type Layout = HLayout<TimelineEntry>;

/** One domain's lane: its sticky label, then its terms and "+N" chips along the axis. */
export function HorizontalLane(props: { lane: Lane; layout: Layout; more: MoreList }) {
  const { lane, layout, more } = props;
  const chipTop = LANE_PAD + lane.chipRow * layout.row;
  return (
    <div class="relative flex border-t border-border" style={{ height: lane.height }}>
      <LaneLabel lane={lane.lane} count={lane.count} />
      <ul class="relative" style={{ width: layout.width }}>
        {lane.list.map((it) => (
          <LaneTerm it={it} lane={lane} layout={layout} />
        ))}
        {lane.chips.map((c) => (
          <MoreChip chip={c} top={chipTop} row={layout.row} more={more} />
        ))}
      </ul>
    </div>
  );
}

function LaneLabel({ lane, count }: { lane: string; count: number }) {
  const { ink, label } = useTimelineCtx();
  return (
    <h2
      class="map-ink sticky left-0 z-10 flex shrink-0 items-start gap-2 border-r border-border bg-(--chart-bg) px-3 pt-2 text-sm font-medium"
      style={`${inkVars(ink(lane))}width:${LABEL_COL}px;color:var(--ink)`}
    >
      <span
        aria-hidden="true"
        class="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: 'var(--ink)' }}
      />
      {label(lane)}
      <span class="sr-only">({count})</span>
    </h2>
  );
}

type TermProps = { it: TimelineEntry; lane: Lane; layout: Layout };

/** A term on its row: dot then name, or name then dot when its label is flipped. */
function LaneTerm({ it, lane, layout }: TermProps) {
  const flipped = lane.flip.has(it.id);
  return (
    <li class="absolute flex items-center" style={termBox(it, lane, layout, flipped)}>
      <LaneTermLink it={it} lane={lane} layout={layout} />
    </li>
  );
}

function LaneTermLink({ it, lane, layout }: TermProps) {
  const { ink, ringOf, item, selId } = useTimelineCtx();
  const flipped = lane.flip.has(it.id);
  return (
    <a
      href={it.href}
      data-tl-item
      class={`flex items-center gap-1.5 rounded px-0.5 whitespace-nowrap hover:text-fg ${flipped ? 'flex-row-reverse' : ''} ${it.hub ? 'font-semibold text-fg' : 'text-fg-soft'} ${selId === it.id ? 'bg-surface-2 text-fg' : ''}`}
      style={{ fontSize: it.hub ? layout.font + 1 : layout.font }}
      aria-label={`${it.name}, ${it.year}`}
      {...item(it)}
    >
      <Dot colour={ink(lane.lane)} ring={ringOf(it, lane.lane)} hub={it.hub} />
      {it.name}
    </a>
  );
}

/** A term's row box, anchored at its dot: from the left, or from the right when flipped. */
function termBox(it: TimelineEntry, lane: Lane, layout: Layout, flipped: boolean) {
  const x = layout.scale.at(it.year + 0.5);
  const dot = it.hub ? 6 : 4;
  const box = { height: layout.row, top: LANE_PAD + lane.track.get(it.id)! * layout.row };
  return flipped
    ? { ...box, right: layout.width - H_PAD - x - dot }
    : { ...box, left: H_PAD + x - dot };
}

type ChipProps = { chip: Chip; top: number; row: number; more: MoreList };

/** A "+N" chip on the lane's last row, at the first folded term's year. */
function MoreChip({ chip, top, row, more }: ChipProps) {
  return (
    <li class="absolute flex items-center" style={{ height: row, top, left: H_PAD + chip.x - 6 }}>
      <MoreButton chip={chip} more={more} />
    </li>
  );
}

function MoreButton({ chip, more }: { chip: Chip; more: MoreList }) {
  const { text } = useTimelineCtx();
  const on = more.more?.key === chip.key;
  return (
    <button
      type="button"
      data-tl-more
      class={`rounded-full border px-1.5 text-[10px] leading-4 hover:border-fg-soft hover:text-fg ${on ? 'border-fg-soft bg-surface-2 text-fg' : 'border-border-strong bg-surface-2 text-fg-soft'}`}
      aria-expanded={on && more.more!.pinned}
      aria-label={text.moreLabel.replace('{n}', String(chip.ids.length))}
      {...chipHandlers(chip, more)}
    >
      +{chip.ids.length}
    </button>
  );
}
