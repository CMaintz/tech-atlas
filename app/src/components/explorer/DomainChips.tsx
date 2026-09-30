import { chipClass } from '../ui/Chip';
import { domainColour, type MapTheme } from '../../lib/graph-style';
import type { Dict } from './types';

/** A dot-only chip: the tighter bar's domain toggle. */
const DOT_CHIP = (on: boolean) =>
  `flex h-7 w-7 items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-(--focus) ${on ? 'border-border-hover bg-surface-2/80' : 'border-border-strong hover:border-border-hover'}`;

type Look = {
  /** Dot only (named by its tooltip and accessible name), or a labelled pill. */
  compact: boolean;
  theme: MapTheme;
  onToggle: (domain: string) => void;
};
type ChipProps = Look & { domain: string; on: boolean; label: string };

/** One domain's toggle: its colour dot, filled while the domain is shown. */
function DomainChip({ domain, on, compact, label, theme, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      class={compact ? DOT_CHIP(on) : chipClass(on)}
      aria-pressed={on}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      onClick={() => onToggle(domain)}
    >
      <DomainDot colour={domainColour(domain, theme)} on={on} large={compact} />
      {!compact && label}
    </button>
  );
}

/** The domain's colour: a filled dot while shown, else just its outline. */
function DomainDot({ colour, on, large }: { colour: string; on: boolean; large: boolean }) {
  return (
    <span
      class={`inline-block rounded-full ${large ? 'h-2.5 w-2.5' : 'h-2 w-2'}`}
      style={{ background: on ? colour : 'transparent', boxShadow: `inset 0 0 0 1px ${colour}` }}
    />
  );
}

type Props = Look & {
  /** Every domain, in the graph's order. */
  domains: string[];
  enabled: ReadonlySet<string>;
  labels: Dict;
  /** The group's accessible name. */
  groupLabel: string;
  /** Wrap onto more rows (the sheet); the bar keeps one row. */
  wrap?: boolean;
};

/** Domain toggles: labelled pills (the sheet, a full bar) or dot-only chips (a tighter bar). */
export function DomainChips({ domains, enabled, labels, groupLabel, wrap = true, ...look }: Props) {
  const gap = look.compact ? 'gap-1' : 'gap-1.5';
  return (
    <div
      class={`flex shrink-0 ${wrap ? 'flex-wrap' : ''} items-center ${gap}`}
      role="group"
      aria-label={groupLabel}
      data-tour="explorer-filters"
    >
      {domains.map((d) => (
        <DomainChip domain={d} on={enabled.has(d)} label={labels[d] ?? d} {...look} />
      ))}
    </div>
  );
}
