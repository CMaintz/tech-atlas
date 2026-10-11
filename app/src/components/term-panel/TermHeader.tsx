import { domainColour, nodePaint } from '../../lib/graph-style';
import type { PartProps } from './types';

function ColourClusterDomainBadges({ panel }: PartProps) {
  const { node, theme, props } = panel;
  return (
    <div class="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
      <span
        class="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: nodePaint(node, theme).fill }}
        aria-hidden="true"
      />
      <span class="tracking-widest text-muted uppercase">
        {props.clusterLabels[node.cluster] ?? node.cluster}
      </span>
      <DomainBadges panel={panel} />
    </div>
  );
}

function DomainBadges({ panel: { node, theme, props } }: PartProps) {
  return (
    <>
      {node.domain.map((d) => (
        <span
          class="rounded-full border px-2 py-0.5 text-fg-soft"
          style={{ borderColor: domainColour(d, theme) }}
        >
          {props.domainLabels[d] ?? d}
        </span>
      ))}
    </>
  );
}

function UnreviewedDraftNote({ text }: { text: string }) {
  return (
    <p class="mt-3 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
      {text}
    </p>
  );
}

function AliasesSummaryDraft({ panel }: PartProps) {
  const { record, node, props } = panel;
  const aka = record?.aka[props.lang] ?? [];
  const summary = record?.summary[props.lang] ?? node.summary?.[props.lang];
  return (
    <>
      {aka.length > 0 && (
        <p class="mt-1 text-sm text-subtle">
          {props.ui.aka}: {aka.join(', ')}
        </p>
      )}
      {summary && <p class="mt-3 font-medium text-fg-soft">{summary}</p>}
      {record?.draft && <UnreviewedDraftNote text={props.ui.draft} />}
    </>
  );
}

export default function TermHeader({ panel }: PartProps) {
  return (
    <header>
      <ColourClusterDomainBadges panel={panel} />
      <h2
        id="tp-title"
        ref={panel.refs.heading}
        tabIndex={-1}
        class={`font-semibold outline-none ${panel.expanded ? 'text-4xl' : 'text-2xl'}`}
      >
        {panel.node.term[panel.props.lang]}
      </h2>
      <AliasesSummaryDraft panel={panel} />
    </header>
  );
}
