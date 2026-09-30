import { domainColour, nodePaint } from '../../lib/graph-style';
import type { PartProps } from './types';

/** The term's colour, cluster and domains. */
function TermBadges({ panel }: PartProps) {
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
      {node.domain.map((d) => (
        <span
          class="rounded-full border px-2 py-0.5 text-fg-soft"
          style={{ borderColor: domainColour(d, theme) }}
        >
          {props.domainLabels[d] ?? d}
        </span>
      ))}
    </div>
  );
}

/** The record is a draft, not yet reviewed. */
function DraftNote({ text }: { text: string }) {
  return (
    <p class="mt-3 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
      {text}
    </p>
  );
}

/** Other names, the summary and the draft notice — once the record has them. */
function TermIntro({ panel }: PartProps) {
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
      {record?.draft && <DraftNote text={props.ui.draft} />}
    </>
  );
}

/**
 * The panel's header: badges, the term's name — focused (and so announced) when a term
 * opens — and its intro.
 */
export default function TermHeader({ panel }: PartProps) {
  return (
    <header>
      <TermBadges panel={panel} />
      <h2
        id="tp-title"
        ref={panel.refs.heading}
        tabIndex={-1}
        class={`font-semibold outline-none ${panel.expanded ? 'text-4xl' : 'text-2xl'}`}
      >
        {panel.node.term[panel.props.lang]}
      </h2>
      <TermIntro panel={panel} />
    </header>
  );
}
