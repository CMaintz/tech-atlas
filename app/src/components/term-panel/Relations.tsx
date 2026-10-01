import { prerequisitesOf } from '../../lib/graph-model';
import { relationGroups, relationReasons, type PanelRelationGroup } from '../../lib/term-panel';
import PanelHeading from './PanelHeading';
import type { PartProps } from './types';

/** A related term: re-focuses the map (and the panel) on it, never navigates. */
function TermChip({ panel, id, title }: PartProps & { id: string; title?: string }) {
  const { cache } = panel;
  return (
    <button
      type="button"
      class="rounded border border-border px-2 py-0.5 text-left text-sm text-fg-soft hover:border-border-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)"
      title={title}
      onClick={() => panel.props.onSelect(id)}
      onMouseEnter={() => cache.prefetch(id)}
      onFocus={() => cache.prefetch(id)}
    >
      {panel.nameOf(id)}
    </button>
  );
}

/** What to learn first: the prerequisite path to this term, as chips. */
export function LearnFirst({ panel }: PartProps) {
  const { props } = panel;
  const path = prerequisitesOf(props.graph, props.id);
  if (path.length === 0) return null;
  return (
    <section>
      <PanelHeading spacing="mb-1">{props.ui.learnFirst}</PanelHeading>
      <p class="mb-2 text-xs text-subtle">{props.ui.learnFirstIntro}</p>
      <ol class="flex flex-wrap items-center gap-1">
        {path.map((n, i) => (
          <li class="flex items-center gap-1">
            {i > 0 && (
              <span class="text-subtle" aria-hidden="true">
                →
              </span>
            )}
            <TermChip panel={panel} id={n.id} />
          </li>
        ))}
      </ol>
    </section>
  );
}

type GroupProps = PartProps & {
  group: PanelRelationGroup;
  why: ReturnType<typeof relationReasons>;
};

/** One relationship type and its terms; a chip's tooltip says why the relation holds. */
function RelationGroup({ panel, group, why }: GroupProps) {
  const { edgeLabels, lang } = panel.props;
  return (
    <div>
      <dt class="text-xs text-muted">{edgeLabels[group.type] ?? group.type}</dt>
      <dd class="mt-1 flex flex-wrap gap-1.5">
        {group.ids.map((x) => (
          <TermChip panel={panel} id={x} title={why.get(`${group.type}|${x}`)?.[lang]} />
        ))}
      </dd>
    </div>
  );
}

/** The relationship groups as a list; a chip's tooltip comes from the loaded record. */
function RelationList({ panel, groups }: PartProps & { groups: PanelRelationGroup[] }) {
  const why = relationReasons(panel.record?.edges ?? []);
  return (
    <dl class="space-y-3">
      {groups.map((g) => (
        <RelationGroup panel={panel} group={g} why={why} />
      ))}
    </dl>
  );
}

/** Every relationship of the term, grouped by type in reading order. */
export function Relationships({ panel }: PartProps) {
  const { props } = panel;
  const groups = relationGroups(props.graph, props.id, props.edgeInverse, props.relationOrder);
  return (
    <section>
      <PanelHeading spacing="mb-2">{props.ui.relationships}</PanelHeading>
      {groups.length === 0 ? (
        <p class="text-sm text-subtle">{props.text.noRelations}</p>
      ) : (
        <RelationList panel={panel} groups={groups} />
      )}
    </section>
  );
}
