import { legendDomains, domainColour, type MapTheme, type Paintable } from '../lib/graph-style';
import { EdgeKey } from './graph-legend/EdgeKey';
import { GLASS } from './ui/glass';

type Dict = Record<string, string>;
type LegendDomain = ReturnType<typeof legendDomains>[number];

interface Props {
  nodes: Paintable[];
  families: string[];
  familyColours: Dict;
  familyLabels: Dict;
  domainLabels: Dict;
  clusterLabels: Dict;
  text: Dict;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  compact?: boolean;
  showAll?: boolean;
  onShowAll?: (on: boolean) => void;
  hint?: string;
  theme?: MapTheme;
  upward?: boolean;
}

export default function GraphLegend(props: Props) {
  const theme = props.theme ?? 'dark';
  return (
    <details
      open={props.open}
      onToggle={(e) => props.onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      class={detailsClass(props)}
    >
      <summary class={pillSummaryClass(props.upward)}>
        {props.text.legend}
        {props.upward && <PillChevron />}
      </summary>
      <LegendBody {...props} theme={theme} />
    </details>
  );
}

function LegendBody(props: Props & { theme: MapTheme }) {
  return (
    <div data-legend-body class={props.upward ? UPWARD_BODY : undefined}>
      <NodeKey {...props} />
      <EdgeKey {...props} />
      {props.hint && <p class="mt-3 border-t border-border pt-2 text-subtle">{props.hint}</p>}
    </div>
  );
}

function detailsClass({ upward, compact }: Pick<Props, 'upward' | 'compact'>) {
  if (upward) return `group relative w-fit rounded-lg px-3 text-xs text-fg-soft ${GLASS}`;
  const size = compact ? 'w-full p-3' : 'w-fit px-3 py-2 open:w-64';
  return `max-h-[60vh] ${size} max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg text-xs text-fg-soft ${GLASS}`;
}

const pillSummaryClass = (upward?: boolean) =>
  `cursor-pointer text-[11px] tracking-widest text-muted uppercase select-none ${upward ? 'flex min-h-11 items-center justify-between gap-2 md:min-h-0 md:py-2' : ''}`;

const UPWARD_BODY = `absolute bottom-full left-0 mb-1.5 max-h-[50dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-lg px-3 pt-1 pb-2 md:max-h-[60dvh] ${GLASS}`;

function PillChevron() {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      aria-hidden="true"
      class="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
    >
      <path d="M1 5 L5 1 L9 5" fill="none" stroke="currentColor" stroke-width="1.5" />
    </svg>
  );
}

type ListProps = Pick<Props, 'nodes' | 'compact' | 'domainLabels' | 'clusterLabels'> & {
  theme: MapTheme;
};

function NodeKey(props: ListProps & { text: Dict }) {
  const shared = props.nodes.some((n) => n.domain.length > 1);
  return (
    <>
      <p class="mt-2 mb-1 text-subtle">{props.text.nodes}</p>
      <DomainList {...props} />
      {shared && <SharedTermRingNote text={props.text.ring} theme={props.theme} />}
    </>
  );
}

function DomainList({ nodes, compact, domainLabels, clusterLabels, theme }: ListProps) {
  return (
    <ul class={compact ? 'space-y-1.5' : 'space-y-1'}>
      {legendDomains(nodes, theme).map((d) => (
        <li>
          <DomainName domain={d} label={domainLabels[d.domain] ?? d.domain} theme={theme} />
          {!compact && <ClusterShades domain={d} labels={clusterLabels} />}
        </li>
      ))}
    </ul>
  );
}

type DomainNameProps = { domain: LegendDomain; label: string; theme: MapTheme };

function DomainName({ domain, label, theme }: DomainNameProps) {
  return (
    <div class="flex items-center gap-2 font-medium" style={{ color: domain.colour }}>
      <span
        class="inline-block h-2.5 w-2.5 rounded-full"
        style={{
          background: domain.colour,
          boxShadow: theme === 'dark' ? `0 0 6px ${domain.colour}` : undefined,
        }}
      />
      {label}
    </div>
  );
}

function ClusterShades({ domain, labels }: { domain: LegendDomain; labels: Dict }) {
  return (
    <div class="mt-0.5 ml-4 flex flex-wrap gap-x-2 gap-y-0.5 text-muted">
      {domain.clusters.map((c) => (
        <span class="inline-flex items-center gap-1">
          <span class="inline-block h-2 w-2 rounded-full" style={{ background: c.colour }} />
          {labels[c.cluster] ?? c.cluster}
        </span>
      ))}
    </div>
  );
}

function SharedTermRingNote({ text, theme }: { text: string; theme: MapTheme }) {
  return (
    <p class="mt-2 flex items-center gap-2 text-muted">
      <span
        class="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{
          background: domainColour('cs', theme),
          boxShadow: `0 0 0 2px ${domainColour('security', theme)}`,
        }}
      />
      {text}
    </p>
  );
}
