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
}

/** The graph legend (A74): domains and their cluster shades, edge families, arrow meaning. */
export default function GraphLegend(props: Props) {
  const { text } = props;
  const theme = props.theme ?? 'dark';
  return (
    <details
      open={props.open}
      onToggle={(e) => props.onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      class={`max-h-[60vh] ${props.compact ? 'w-full p-3' : 'w-fit px-3 py-2 open:w-64'} max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg text-xs text-fg-soft ${GLASS}`}
    >
      <summary class="cursor-pointer text-[11px] tracking-widest text-muted uppercase select-none">
        {text.legend}
      </summary>
      <NodeKey {...props} theme={theme} />
      <EdgeKey {...props} theme={theme} />
      {props.hint && <p class="mt-3 border-t border-border pt-2 text-subtle">{props.hint}</p>}
    </details>
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
