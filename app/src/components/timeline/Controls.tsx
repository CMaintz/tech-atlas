import type { ComponentChildren } from 'preact';
import type { Dispatch, StateUpdater } from 'preact/hooks';
import { H_ZOOM } from '../../lib/timeline-layout';
import { useTimelineCtx } from './context';
import { inkVars } from './ink';
import type { DomainFilter } from './use-timeline';

type ControlsProps = {
  domains: string[];
  filter: DomainFilter;
  zoom: number;
  setZoom: Dispatch<StateUpdater<number>>;
};

/** The chart's controls: domain filter chips, then zoom out/in. */
export function Controls({ domains, filter, zoom, setZoom }: ControlsProps) {
  const { text } = useTimelineCtx();
  return (
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <span class="sr-only">{text.filter}</span>
      <FilterChip
        class="border-border-strong text-muted"
        pressed={filter.shown.length === domains.length}
        onClick={filter.all}
      >
        {text.allDomains}
      </FilterChip>
      {domains.map((d) => (
        <DomainChip domain={d} on={filter.shown.includes(d)} onToggle={() => filter.toggle(d)} />
      ))}
      <ZoomControls zoom={zoom} setZoom={setZoom} />
    </div>
  );
}

type FilterChipProps = {
  pressed: boolean;
  onClick: () => void;
  class: string;
  style?: string;
  children: ComponentChildren;
};

/** A pill that switches something on or off (`aria-pressed`). */
function FilterChip({ pressed, onClick, class: extra, style, children }: FilterChipProps) {
  return (
    <button
      type="button"
      class={`min-h-11 min-w-11 rounded-full border px-3 py-1 text-xs transition-colors sm:min-h-0 sm:min-w-0 hover:border-border-hover aria-pressed:text-fg ${extra}`}
      style={style}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type DomainChipProps = { domain: string; on: boolean; onToggle: () => void };

/** A domain's filter chip: outlined and dotted in its colour while its lane is shown. */
function DomainChip({ domain, on, onToggle }: DomainChipProps) {
  const { ink, label } = useTimelineCtx();
  return (
    <FilterChip
      class="map-ink flex items-center gap-1.5 text-muted"
      style={`${inkVars(ink(domain))}border-color:${on ? 'var(--ink)' : 'var(--border-strong)'}`}
      pressed={on}
      onClick={onToggle}
    >
      <span
        aria-hidden="true"
        class="inline-block h-2 w-2 rounded-full"
        style={{ background: on ? 'var(--ink)' : 'var(--subtle)' }}
      />
      {label(domain)}
    </FilterChip>
  );
}

type Zoom = { zoom: number; setZoom: Dispatch<StateUpdater<number>> };

function ZoomControls(props: Zoom) {
  const { text } = useTimelineCtx();
  return (
    <span class="ml-auto flex items-center gap-1" role="group" aria-label={text.zoom}>
      <ZoomButton step={-1} label={text.zoomOut} {...props}>
        −
      </ZoomButton>
      <ZoomButton step={1} label={text.zoomIn} {...props}>
        +
      </ZoomButton>
    </span>
  );
}

type ZoomButtonProps = Zoom & { step: -1 | 1; label: string; children: ComponentChildren };

/** One zoom step out (-1) or in (+1); disabled at the end of the range. */
function ZoomButton({ step, label, zoom, setZoom, children }: ZoomButtonProps) {
  const max = H_ZOOM.length - 1;
  const next = zoom + step;
  return (
    <button
      type="button"
      class="h-11 w-11 rounded border border-border-strong text-fg-soft hover:border-border-hover disabled:opacity-40 sm:h-7 sm:w-7"
      aria-label={label}
      title={label}
      disabled={next < 0 || next > max}
      onClick={() => setZoom((z) => Math.min(max, Math.max(0, z + step)))}
    >
      {children}
    </button>
  );
}
