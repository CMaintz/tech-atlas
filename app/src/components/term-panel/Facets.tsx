import { useRef, useState } from 'preact/hooks';
import { tabKeyTarget } from '../../lib/key-intent';
import { FACETS, type Facet } from '../../lib/term-panel';
import PanelHeading from './PanelHeading';
import type { PartProps } from './types';

function FacetTextOrPlaceholder({ panel, facet }: PartProps & { facet: Facet }) {
  const { record, failed, props } = panel;
  if (record) return <p class="text-fg-soft">{record.body[facet][props.lang]}</p>;
  if (failed) return <p class="text-sm text-red-700 dark:text-red-300">{props.text.loadError}</p>;
  return (
    <div class="space-y-2" aria-hidden="true">
      <div class="h-3 w-full animate-pulse rounded bg-surface-2" />
      <div class="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
    </div>
  );
}

function ExpandedFacetGrid({ panel }: PartProps) {
  return (
    <div class="grid gap-5 sm:grid-cols-2">
      {FACETS.map((f) => (
        <div>
          <PanelHeading spacing="mb-1">{panel.props.ui[f]}</PanelHeading>
          <FacetTextOrPlaceholder panel={panel} facet={f} />
        </div>
      ))}
    </div>
  );
}

type TabsProps = PartProps & { facet: Facet; onFacet: (f: Facet) => void };

function useTabArrowKeys(facet: Facet, onFacet: (f: Facet) => void) {
  const list = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const next = tabKeyTarget(e.key, FACETS.indexOf(facet), FACETS.length);
    if (next === null) return;
    e.preventDefault();
    onFacet(FACETS[next]);
    list.current?.querySelector<HTMLElement>(`#tp-tab-${FACETS[next]}`)?.focus();
  };
  return { list, onKey };
}

function FacetTabList({ panel, facet, onFacet }: TabsProps) {
  const { list, onKey } = useTabArrowKeys(facet, onFacet);
  const tabs = { facet, onFacet, onKey };
  return (
    <div
      ref={list}
      role="tablist"
      aria-label={panel.props.text.facets}
      class="flex flex-wrap gap-1 border-b border-border"
    >
      {FACETS.map((f) => (
        <FacetTab label={panel.props.ui[f]} tab={f} {...tabs} />
      ))}
    </div>
  );
}

const TAB =
  '-mb-px border-b-2 px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-(--focus)';
const TAB_ON = 'border-border-hover text-fg';
const TAB_OFF = 'border-transparent text-subtle hover:text-fg-soft';

type TabProps = {
  label: string;
  tab: Facet;
  facet: Facet;
  onFacet: (f: Facet) => void;
  onKey: (e: KeyboardEvent) => void;
};

function FacetTab({ label, tab, facet, onFacet, onKey }: TabProps) {
  const selected = facet === tab;
  return (
    <button
      type="button"
      role="tab"
      id={`tp-tab-${tab}`}
      aria-selected={selected}
      aria-controls="tp-facet"
      tabIndex={selected ? 0 : -1}
      class={`${TAB} ${selected ? TAB_ON : TAB_OFF}`}
      onClick={() => onFacet(tab)}
      onKeyDown={onKey}
    >
      {label}
    </button>
  );
}

function DockedFacetTabs(p: TabsProps) {
  return (
    <>
      <FacetTabList {...p} />
      <div id="tp-facet" role="tabpanel" aria-labelledby={`tp-tab-${p.facet}`} class="pt-3">
        <FacetTextOrPlaceholder panel={p.panel} facet={p.facet} />
      </div>
    </>
  );
}

export default function Facets({ panel }: PartProps) {
  const [facet, setFacet] = useState<Facet>('formal');
  return (
    <section aria-label={panel.props.text.facets}>
      {panel.expanded ? (
        <ExpandedFacetGrid panel={panel} />
      ) : (
        <DockedFacetTabs panel={panel} facet={facet} onFacet={setFacet} />
      )}
    </section>
  );
}
