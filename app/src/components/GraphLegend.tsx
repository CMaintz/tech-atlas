import { legendDomains, domainColour, type MapTheme, type Paintable } from '../lib/graph-style';
import { EdgeKey } from './graph-legend/EdgeKey';
import { GLASS } from './ui/glass';

type Dict = Record<string, string>;
type LegendDomain = ReturnType<typeof legendDomains>[number];

interface Props {
  nodes: Paintable[];
  /** Families to list (those present or enabled), with their colours and labels. */
  families: string[];
  familyColours: Dict;
  familyLabels: Dict;
  domainLabels: Dict;
  clusterLabels: Dict;
  text: Dict;
  /** Start open (desktop) or closed (small screens). */
  open?: boolean;
  /** The reader opened or closed the legend. */
  onToggle?: (open: boolean) => void;
  /** Compact: one domain row each, no cluster list (term-page graph). */
  compact?: boolean;
  /** Explorer only: the overview/all-relationships toggle (A86). */
  showAll?: boolean;
  onShowAll?: (on: boolean) => void;
  /** Explorer only: a one-line keyboard hint at the foot (A97). */
  hint?: string;
  /** The map theme its colours match (A92); dark by default. */
  theme?: MapTheme;
  /**
   * Explorer only (A93b): the closed legend is a pill and the open body floats above it,
   * growing upward from the pill, so it can sit in a bottom corner of the map.
   */
  upward?: boolean;
}

/** The graph legend (A74): domains and their cluster shades, edge families, arrow meaning. */
export default function GraphLegend(props: Props) {
  const theme = props.theme ?? 'dark';
  return (
    <details
      open={props.open}
      onToggle={(e) => props.onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      class={detailsClass(props)}
    >
      <summary class={summaryClass(props.upward)}>
        {props.text.legend}
        {props.upward && <Chevron />}
      </summary>
      <LegendBody {...props} theme={theme} />
    </details>
  );
}

/** The key itself; upward, it floats above the pill. */
function LegendBody(props: Props & { theme: MapTheme }) {
  return (
    <div data-legend-body class={props.upward ? UPWARD_BODY : undefined}>
      <NodeKey {...props} />
      <EdgeKey {...props} />
      {props.hint && <p class="mt-3 border-t border-border pt-2 text-subtle">{props.hint}</p>}
    </div>
  );
}

/** Inline (term page): a box that scrolls; upward (Explorer): a pill its body floats over. */
function detailsClass({ upward, compact }: Pick<Props, 'upward' | 'compact'>) {
  if (upward) return `group relative w-fit rounded-lg px-3 text-xs text-fg-soft ${GLASS}`;
  const size = compact ? 'w-full p-3' : 'w-fit px-3 py-2 open:w-64';
  return `max-h-[60vh] ${size} max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg text-xs text-fg-soft ${GLASS}`;
}

/** The label; as a pill it is at least 44 px tall on phones and holds the chevron. */
const summaryClass = (upward?: boolean) =>
  `cursor-pointer text-[11px] tracking-widest text-muted uppercase select-none ${upward ? 'flex min-h-11 items-center justify-between gap-2 md:min-h-0 md:py-2' : ''}`;

/** The open body above the pill: capped at 50dvh on phones (60dvh from md), scrolling. */
const UPWARD_BODY = `absolute bottom-full left-0 mb-1.5 max-h-[50dvh] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-lg px-3 pt-1 pb-2 md:max-h-[60dvh] ${GLASS}`;

/** Points up while closed (the body opens upward), down while open. */
function Chevron() {
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

/** The legend's terms: each domain (with its clusters), and what a shared term's ring means. */
function NodeKey(props: ListProps & { text: Dict }) {
  const shared = props.nodes.some((n) => n.domain.length > 1);
  return (
    <>
      <p class="mt-2 mb-1 text-subtle">{props.text.nodes}</p>
      <DomainList {...props} />
      {shared && <RingNote text={props.text.ring} theme={props.theme} />}
    </>
  );
}

/** Each shown domain in its colour, with (unless compact) its clusters' shades. */
function DomainList({ nodes, compact, domainLabels, clusterLabels, theme }: ListProps) {
  return (
    <ul class={compact ? 'space-y-1.5' : 'space-y-1'}>
      {legendDomains(nodes, theme).map((d) => (
        <li>
          <div class="flex items-center gap-2 font-medium" style={{ color: d.colour }}>
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              style={{
                background: d.colour,
                boxShadow: theme === 'dark' ? `0 0 6px ${d.colour}` : undefined,
              }}
            />
            {domainLabels[d.domain] ?? d.domain}
          </div>
          {!compact && <ClusterShades domain={d} labels={clusterLabels} />}
        </li>
      ))}
    </ul>
  );
}

/** A domain's clusters, each a dot in its shade. */
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

/** A shared term wears a ring in its second domain's colour. */
function RingNote({ text, theme }: { text: string; theme: MapTheme }) {
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
