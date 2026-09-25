import { legendDomains, domainColour, type MapTheme, type Paintable } from '../lib/graph-style';

type Dict = Record<string, string>;

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
  /** The map theme its colours match (A92); dark by default. */
  theme?: MapTheme;
}

/** The graph legend (A74): domains and their cluster shades, edge families, arrow meaning. */
export default function GraphLegend(props: Props) {
  const { text } = props;
  const theme = props.theme ?? 'dark';
  const domains = legendDomains(props.nodes, theme);
  const hasRing = props.nodes.some((n) => n.domain.length > 1);
  return (
    <details
      open={props.open}
      onToggle={(e) => props.onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      class={`max-h-[60vh] ${props.compact ? 'w-full p-3' : 'w-fit px-3 py-2 open:w-64'} max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-border bg-bg/85 text-xs text-fg-soft shadow-lg shadow-black/15 dark:shadow-black/40 backdrop-blur`}
    >
      <summary class="cursor-pointer text-[11px] tracking-widest text-muted uppercase select-none">
        {text.legend}
      </summary>

      <p class="mt-2 mb-1 text-subtle">{text.nodes}</p>
      <ul class={props.compact ? 'space-y-1.5' : 'space-y-1'}>
        {domains.map((d) => (
          <li>
            <div class="flex items-center gap-2 font-medium" style={{ color: d.colour }}>
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                style={{
                  background: d.colour,
                  boxShadow: theme === 'dark' ? `0 0 6px ${d.colour}` : undefined,
                }}
              />
              {props.domainLabels[d.domain] ?? d.domain}
            </div>
            {!props.compact && (
              <div class="mt-0.5 ml-4 flex flex-wrap gap-x-2 gap-y-0.5 text-muted">
                {d.clusters.map((c) => (
                  <span class="inline-flex items-center gap-1">
                    <span
                      class="inline-block h-2 w-2 rounded-full"
                      style={{ background: c.colour }}
                    />
                    {props.clusterLabels[c.cluster] ?? c.cluster}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {hasRing && (
        <p class="mt-2 flex items-center gap-2 text-muted">
          <span
            class="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{
              background: domainColour('cs', theme),
              boxShadow: `0 0 0 2px ${domainColour('security', theme)}`,
            }}
          />
          {text.ring}
        </p>
      )}

      <p class="mt-3 mb-1 text-subtle">{text.edges}</p>
      {props.onShowAll && (
        <>
          <label class="mb-1.5 flex items-center gap-2 text-fg-soft">
            <input
              type="checkbox"
              checked={props.showAll}
              onChange={(e) => props.onShowAll!((e.target as HTMLInputElement).checked)}
            />
            {text.showAll}
          </label>
          {!props.showAll && <p class="mb-1.5 text-subtle">{text.overview}</p>}
        </>
      )}
      <ul class="space-y-1">
        {props.families.map((f) => (
          <li class="flex items-center gap-2">
            <span
              class="inline-block h-0.5 w-5 shrink-0 rounded"
              style={{ background: props.familyColours[f] }}
            />
            {props.familyLabels[f] ?? f}
          </li>
        ))}
      </ul>

      <ul class="mt-3 space-y-1.5 text-muted">
        <li class="flex items-start gap-2">
          <svg
            width="22"
            height="10"
            viewBox="0 0 22 10"
            class="mt-0.5 shrink-0 text-fg-soft"
            aria-hidden="true"
          >
            <line
              x1="1"
              y1="5"
              x2="15"
              y2="5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-dasharray="3 3"
            />
            <path d="M14 1 L21 5 L14 9 Z" fill="currentColor" />
          </svg>
          {text.oneWay}
        </li>
        <li class="flex items-start gap-2">
          <svg
            width="22"
            height="10"
            viewBox="0 0 22 10"
            class="mt-0.5 shrink-0 text-fg-soft"
            aria-hidden="true"
          >
            <line x1="1" y1="5" x2="21" y2="5" stroke="currentColor" stroke-width="1.5" />
          </svg>
          {text.twoWay}
        </li>
        <li class="flex items-start gap-2">
          <span
            class="mt-1 inline-block h-0.5 w-5 shrink-0 rounded"
            style={{
              background: `linear-gradient(90deg, ${domainColour('security', theme)}, ${domainColour('cs', theme)})`,
            }}
          />
          {text.crossDomain}
        </li>
      </ul>
    </details>
  );
}
