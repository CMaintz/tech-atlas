import type { Filters } from '../../lib/use-explorer-state';
import type { Dict } from './types';

type Props = {
  filters: Filters;
  families: string[];
  colours: Dict;
  labels: Dict;
  graphUi: Dict;
  legend: string;
};

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
      <FamilyCheckboxes filters={filters} {...types} />
    </div>
  );
}

function FamilyCheckboxes({ filters, families, colours, labels, legend }: Omit<Props, 'graphUi'>) {
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
