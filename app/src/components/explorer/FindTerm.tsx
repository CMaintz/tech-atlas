import { Chip } from '../ui/Chip';
import { GLASS } from '../ui/glass';
import type { GraphNode } from '../../lib/graph-model';
import type { BarSize } from '../../lib/use-explorer-bar';
import type { FindField, TermSearch } from '../../lib/use-explorer-find';
import { FIELD } from './styles';
import type { Dict, Lang } from './types';

type Props = {
  ui: Dict;
  lang: Lang;
  search: TermSearch;
  field: FindField;
  byId: ReadonlyMap<string, GraphNode>;
  size: BarSize;
  /** In the phones' sheet: a full-width field, results in flow. */
  sheet: boolean;
  onPick: (id: string) => void;
};

/** "Find a term". In a compact bar a search icon that opens the field (keeps one row). */
export function FindTerm(props: Props) {
  if (props.size === 'compact' && !props.field.open)
    return <SearchButton label={props.ui.findTerm} onOpen={() => props.field.setOpen(true)} />;
  return (
    <div class="relative">
      <QueryField {...props} />
      {props.search.query.trim() && <FindResults {...props} />}
    </div>
  );
}

function SearchButton({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <Chip extra="px-2" aria-label={label} title={label} onClick={onOpen}>
      <SearchIcon />
    </Chip>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

/** Enter picks the first match; Esc clears the query, then closes an opened field. */
function onKey(e: KeyboardEvent, { search, field, onPick }: Props) {
  const { query, setQuery, matches } = search;
  if (e.key === 'Enter' && matches[0]) onPick(matches[0].id);
  if (e.key === 'Escape' && (query || field.open)) {
    e.preventDefault();
    if (query) setQuery('');
    else field.setOpen(false);
  }
}

function QueryField(props: Props) {
  const { ui, search, field } = props;
  return (
    <input
      type="search"
      ref={field.field}
      onBlur={() => {
        if (!search.query.trim()) field.setOpen(false);
      }}
      placeholder={ui.findTerm}
      aria-label={ui.findTerm}
      aria-controls="xp-find"
      value={search.query}
      onInput={(e) => search.setQuery((e.target as HTMLInputElement).value)}
      onKeyDown={(e) => onKey(e, props)}
      class={`${FIELD} ${props.sheet ? '' : props.size === 'full' ? 'w-56' : 'w-44'}`}
    />
  );
}

/** The matches: in the sheet in flow, else a frosted list under the field. */
function FindResults({ ui, lang, search, byId, sheet, onPick }: Props) {
  const place = sheet
    ? 'mt-2'
    : `absolute top-full left-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] ${GLASS}`;
  return (
    <ul
      id="xp-find"
      aria-live="polite"
      aria-label={ui.findTerm}
      class={`${place} space-y-0.5 rounded-xl p-2 text-xs`}
    >
      {search.matches.length === 0 && <li class="px-1 text-subtle">{ui.noResults}</li>}
      {search.matches.map((m) => (
        <li>
          <button
            type="button"
            class="w-full rounded px-1.5 py-1 text-left text-fg-soft hover:bg-surface-2 hover:text-fg focus-visible:bg-surface-2"
            onClick={() => onPick(m.id)}
          >
            {byId.get(m.id)!.term[lang]}
            {!m.from.includes('lexical') && <MeaningBadge label={ui.semanticByMeaning} />}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Marks a match found by meaning rather than by name. */
function MeaningBadge({ label }: { label: string }) {
  return (
    <span class="ml-1.5 rounded bg-sky-100 px-1 py-px text-[10px] text-sky-800 dark:bg-sky-950 dark:text-sky-300">
      ✦ {label}
    </span>
  );
}
