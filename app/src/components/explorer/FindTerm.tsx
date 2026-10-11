import { Chip } from '../ui/Chip';
import { GLASS } from '../ui/glass';
import type { BarSize } from '../../lib/use-explorer-bar';
import type { FindField, TermSearch } from '../../lib/use-explorer-find';
import { BAR_FIELD } from './styles';
import type { Dict } from './types';

type Props = {
  ui: Dict;
  search: TermSearch;
  field: FindField;
  name: (id: string) => string;
  size: BarSize;
  sheet: boolean;
  onPick: (id: string) => void;
};

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

function onFindKey(e: KeyboardEvent, { search, field, onPick }: Props) {
  const { query, setQuery, matches } = search;
  if (e.key === 'Enter' && matches[0]) onPick(matches[0].id);
  if (e.key === 'Escape' && (query || field.open)) {
    e.preventDefault();
    if (query) setQuery('');
    else field.setOpen(false);
  }
}

const fieldWidth = ({ sheet, size }: Props) => (sheet ? '' : size === 'full' ? 'w-56' : 'w-44');

function QueryField(props: Props) {
  const { ui, search, field } = props;
  const closeIfEmpty = () => !search.query.trim() && field.setOpen(false);
  return (
    <input
      type="search"
      ref={field.field}
      onBlur={closeIfEmpty}
      placeholder={ui.findTerm}
      aria-label={ui.findTerm}
      aria-controls="xp-find"
      value={search.query}
      onInput={(e) => search.setQuery((e.target as HTMLInputElement).value)}
      onKeyDown={(e) => onFindKey(e, props)}
      class={`${BAR_FIELD} ${fieldWidth(props)}`}
    />
  );
}

const RESULTS_UNDER_FIELD = `absolute top-full left-0 z-20 mt-2 w-64 max-w-[calc(100vw-2rem)] ${GLASS}`;

function FindResults(props: Props) {
  const { ui, search, sheet } = props;
  return (
    <ul
      id="xp-find"
      aria-live="polite"
      aria-label={ui.findTerm}
      class={`${sheet ? 'mt-2' : RESULTS_UNDER_FIELD} space-y-0.5 rounded-xl p-2 text-xs`}
    >
      {search.matches.length === 0 && <li class="px-1 text-subtle">{ui.noResults}</li>}
      {search.matches.map((m) => (
        <FindMatch {...props} match={m} />
      ))}
    </ul>
  );
}

type MatchProps = Props & { match: TermSearch['matches'][number] };

function FindMatch({ ui, name, onPick, match }: MatchProps) {
  return (
    <li>
      <button
        type="button"
        class="w-full rounded px-1.5 py-1 text-left text-fg-soft hover:bg-surface-2 hover:text-fg focus-visible:bg-surface-2"
        onClick={() => onPick(match.id)}
      >
        {name(match.id)}
        {!match.from.includes('lexical') && <MeaningBadge label={ui.semanticByMeaning} />}
      </button>
    </li>
  );
}

function MeaningBadge({ label }: { label: string }) {
  return (
    <span class="ml-1.5 rounded bg-sky-100 px-1 py-px text-[10px] text-sky-800 dark:bg-sky-950 dark:text-sky-300">
      ✦ {label}
    </span>
  );
}
