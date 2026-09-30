import { useEffect, useRef, useState } from 'preact/hooks';
import type { SearchLink } from '../lib/search';
import type { Hit } from '../lib/semantic';
import { useSearch, type SearchOptions, type SearchState } from '../lib/use-search';

type Lang = 'en' | 'da';

interface Props extends SearchOptions {
  placeholder: string;
  noResults: string;
  /** Shown while the index is still loading. */
  loadingLabel: string;
  /** Shown under the box: the "/" shortcut. */
  hint?: string;
  /** Label on hits found only by meaning. */
  byMeaningLabel: string;
}

/** A ref to an element that takes focus when the page was opened at `#<hash>`. */
function useFocusOnHash<T extends HTMLElement>(hash: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (location.hash === `#${hash}`) ref.current?.focus();
  }, []);
  return ref;
}

type BoxProps = { value: string; placeholder: string; onInput: (v: string) => void };

function SearchBox({ value, placeholder, onInput }: BoxProps) {
  // Arriving via the "/" shortcut from another page (…/#search): focus the box.
  const box = useFocusOnHash<HTMLInputElement>('search');
  return (
    <input
      ref={box}
      id="search"
      type="search"
      autocomplete="off"
      value={value}
      onInput={(e) => onInput((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      aria-label={placeholder}
      class="w-full rounded border border-border-strong bg-surface px-3 py-2.5 text-base sm:py-2 text-fg placeholder:text-subtle focus:border-border-hover focus:outline-none"
    />
  );
}

/** A result row that leads somewhere other than a term: an intent or a Disambiguation page. */
function ShortcutItem({ link }: { link: SearchLink }) {
  return (
    <li>
      <a
        class="block border-b border-border bg-surface-2/60 px-3 py-2 text-fg hover:bg-surface-2"
        href={link.href}
      >
        → {link.label}
      </a>
    </li>
  );
}

type HitProps = {
  hit: Hit;
  found: SearchState;
  lang: Lang;
  langBase: string;
  byMeaningLabel: string;
};

function HitItem({ hit, found, lang, langBase, byMeaningLabel }: HitProps) {
  const d = found.byId.get(hit.id);
  if (!d) return null;
  return (
    <li>
      <a class="block px-3 py-2 hover:bg-surface-2" href={`${langBase}terms/${d.id}/`}>
        <span class="text-fg">{d.term[lang]}</span>
        {!hit.from.includes('lexical') && (
          <span class="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            ✦ {byMeaningLabel}
          </span>
        )}
        <span class="block text-sm text-subtle">{d.summary[lang]}</span>
      </a>
    </li>
  );
}

function Results({ found, ...props }: Props & { found: SearchState }) {
  const { action, disambiguation, results } = found;
  const nothing = results.length === 0 && !action && !disambiguation;
  return (
    <ul
      class="absolute z-10 mt-1 max-h-[70dvh] w-full overflow-y-auto overscroll-contain rounded border border-border bg-surface shadow-lg"
      aria-live="polite"
    >
      {action && <ShortcutItem link={action} />}
      {disambiguation && <ShortcutItem link={disambiguation} />}
      {nothing ? (
        <li class="px-3 py-2 text-subtle">{props.noResults}</li>
      ) : (
        results.map((r) => <HitItem key={r.id} hit={r} found={found} {...props} />)
      )}
    </ul>
  );
}

/** Under the box while there is a query: a loading note until the index is ready, then results. */
function Dropdown(props: Props & { found: SearchState }) {
  if (props.found.ready) return <Results {...props} />;
  return (
    <p
      class="absolute z-10 mt-1 w-full rounded border border-border bg-surface px-3 py-2 text-subtle"
      role="status"
    >
      {props.loadingLabel}
    </p>
  );
}

/**
 * Client-side bilingual search: typo-tolerant over names and aliases in both
 * languages, plus intents — "X vs Y" (compare), "from X to Y" (route) and
 * "before X" (prerequisites) — and, for questions and descriptions, search by meaning
 * (A75): the `semantic-search` Edge Function ranks terms server-side, fused with the
 * lexical ranking by RRF. Without a backend, or when it fails or is slow, the lexical
 * results simply stand.
 */
export default function Search(props: Props) {
  const [query, setQuery] = useState('');
  const found = useSearch(props, query);
  return (
    <div class="relative">
      <SearchBox value={query} placeholder={props.placeholder} onInput={setQuery} />
      {found.q && <Dropdown found={found} {...props} />}
      {/* The "/" shortcut means nothing without a keyboard. */}
      {props.hint && <p class="mt-2 text-xs text-subtle pointer-coarse:hidden">{props.hint}</p>}
    </div>
  );
}
