import { legendDomains, domainColour, type Paintable } from '../lib/graph-style';

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
  /** Explorer only: a one-line keyboard hint at the foot (A96). */
  hint?: string;
}

/** The graph legend (A74): domains and their cluster shades, edge families, arrow meaning. */
export default function GraphLegend(props: Props) {
  const { text } = props;
  const domains = legendDomains(props.nodes);
  const hasRing = props.nodes.some((n) => n.domain.length > 1);
  return (
    <details
      open={props.open}
      onToggle={(e) => props.onToggle?.((e.currentTarget as HTMLDetailsElement).open)}
      class={`max-h-[60vh] ${props.compact ? 'w-full p-3' : 'w-fit px-3 py-2 open:w-64'} max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-950/85 text-xs text-neutral-300 shadow-lg shadow-black/40 backdrop-blur`}
    >
      <summary class="cursor-pointer text-[11px] tracking-widest text-neutral-400 uppercase select-none">
        {text.legend}
      </summary>

      <p class="mt-2 mb-1 text-neutral-500">{text.nodes}</p>
      <ul class={props.compact ? 'space-y-1.5' : 'space-y-1'}>
        {domains.map((d) => (
          <li>
            <div class="flex items-center gap-2 font-medium" style={{ color: d.colour }}>
              <span
                class="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: d.colour, boxShadow: `0 0 6px ${d.colour}` }}
              />
              {props.domainLabels[d.domain] ?? d.domain}
            </div>
            {!props.compact && (
              <div class="mt-0.5 ml-4 flex flex-wrap gap-x-2 gap-y-0.5 text-neutral-400">
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
        <p class="mt-2 flex items-center gap-2 text-neutral-400">
          <span
            class="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{
              background: domainColour('cs'),
              boxShadow: `0 0 0 2px ${domainColour('security')}`,
            }}
          />
          {text.ring}
        </p>
      )}

      <p class="mt-3 mb-1 text-neutral-500">{text.edges}</p>
      {props.onShowAll && (
        <>
          <label class="mb-1.5 flex items-center gap-2 text-neutral-200">
            <input
              type="checkbox"
              checked={props.showAll}
              onChange={(e) => props.onShowAll!((e.target as HTMLInputElement).checked)}
            />
            {text.showAll}
          </label>
          {!props.showAll && <p class="mb-1.5 text-neutral-500">{text.overview}</p>}
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

      <ul class="mt-3 space-y-1.5 text-neutral-400">
        <li class="flex items-start gap-2">
          <svg
            width="22"
            height="10"
            viewBox="0 0 22 10"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <line
              x1="1"
              y1="5"
              x2="15"
              y2="5"
              stroke="#d4d4d4"
              stroke-width="1.5"
              stroke-dasharray="3 3"
            />
            <path d="M14 1 L21 5 L14 9 Z" fill="#d4d4d4" />
          </svg>
          {text.oneWay}
        </li>
        <li class="flex items-start gap-2">
          <svg
            width="22"
            height="10"
            viewBox="0 0 22 10"
            class="mt-0.5 shrink-0"
            aria-hidden="true"
          >
            <line x1="1" y1="5" x2="21" y2="5" stroke="#d4d4d4" stroke-width="1.5" />
          </svg>
          {text.twoWay}
        </li>
        <li class="flex items-start gap-2">
          <span
            class="mt-1 inline-block h-0.5 w-5 shrink-0 rounded"
            style={{
              background: `linear-gradient(90deg, ${domainColour('security')}, ${domainColour('cs')})`,
            }}
          />
          {text.crossDomain}
        </li>
      </ul>
      {props.hint && (
        <p class="mt-3 border-t border-neutral-800 pt-2 text-neutral-500">{props.hint}</p>
      )}
    </details>
  );
}
