import { chipClass } from '../ui/Chip';
import { domainColour, type MapTheme } from '../../lib/graph-style';
import type { Dict } from './types';

const DOT_ONLY_CHIP = (on: boolean) =>
  `flex h-7 w-7 items-center justify-center rounded-full border focus-visible:outline-2 focus-visible:outline-(--focus) ${on ? 'border-border-hover bg-surface-2/80' : 'border-border-strong hover:border-border-hover'}`;

type Look = {
  compact: boolean;
  theme: MapTheme;
  onToggle: (domain: string) => void;
};
type ChipProps = Look & { domain: string; on: boolean; label: string };

function DomainChip({ domain, on, compact, label, theme, onToggle }: ChipProps) {
  return (
    <button
      type="button"
      class={compact ? DOT_ONLY_CHIP(on) : chipClass(on)}
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

function DomainDot({ colour, on, large }: { colour: string; on: boolean; large: boolean }) {
  return (
    <span
      class={`inline-block rounded-full ${large ? 'h-2.5 w-2.5' : 'h-2 w-2'}`}
      style={{ background: on ? colour : 'transparent', boxShadow: `inset 0 0 0 1px ${colour}` }}
    />
  );
}

type Props = Look & {
  domains: string[];
  enabled: ReadonlySet<string>;
  labels: Dict;
  groupLabel: string;
  wrap?: boolean;
};

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
