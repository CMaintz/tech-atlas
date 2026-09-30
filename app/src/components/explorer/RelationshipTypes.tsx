import type { Filters } from '../../lib/use-explorer-state';
import type { Dict } from './types';

type Props = {
  filters: Filters;
  /** Every relationship family, in legend order. */
  families: string[];
  colours: Dict;
  labels: Dict;
  /** Canvas-control strings (site.ts GRAPH_UI). */
  graphUi: Dict;
  /** The type list's (screen-reader) legend. */
  legend: string;
};

/** "Show all" (else the overview), and a tick per relationship type (A86, A95). */
export function RelationshipTypes({ filters, graphUi, ...types }: Props) {
  const { showAll, setShowAll } = filters;
  return (
    <div class="space-y-1.5">
      <label class="flex items-center gap-2 text-fg-soft">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => setShowAll((e.target as HTMLInputElement).checked)}
        />
        {graphUi.showAll}
      </label>
      {!showAll && <p class="text-subtle">{graphUi.overview}</p>}
      <p class="text-subtle">{graphUi.typesNote}</p>
      <TypeTicks filters={filters} {...types} />
    </div>
  );
}

/** One checkbox per relationship family, with its line colour. */
function TypeTicks({ filters, families, colours, labels, legend }: Omit<Props, 'graphUi'>) {
  return (
    <fieldset class="space-y-1 border-t border-border pt-1.5">
      <legend class="sr-only">{legend}</legend>
      {families.map((f) => (
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.families.has(f)}
            onChange={() => filters.toggleFamily(f)}
          />
          <span class="inline-block h-0.5 w-4" style={{ background: colours[f] }} />
          {labels[f] ?? f}
        </label>
      ))}
    </fieldset>
  );
}
