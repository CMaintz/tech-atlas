import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import MiniSearch from 'minisearch';
import { exactName, parseIntent } from '../lib/intent';
import { pairSlugFromIds } from '../lib/slug';
import { collisionForQuery, collisionsOf } from '../lib/collisions';
import {
  dropStopwords,
  fetchSemantic,
  looksNaturalLanguage,
  nearBest,
  reciprocalRankFusion,
  type Scored,
} from '../lib/semantic';

type Lang = 'en' | 'da';
type Doc = {
  id: string;
  term: Record<Lang, string>;
  aka: Record<Lang, string[]>;
  summary: Record<Lang, string>;
  contrasts: string[];
};

interface Props {
  lang: Lang;
  indexUrl: string;
  /** The `semantic-search` Edge Function, or '' when no backend is configured. */
  semanticUrl: string;
  /** Base URL of this language, e.g. /tech-atlas/en/ */
  langBase: string;
  placeholder: string;
  noResults: string;
  /** Shown while the index is still loading. */
  loadingLabel: string;
  /** Shown under the box: the "/" shortcut. */
  hint?: string;
  /** Templates with {a} / {b} placeholders. */
  intentLabels: { compare: string; route: string; before: string };
  /** Shown when the query is a name several terms share; {name} and {n} placeholders. */
  disambiguationLabel: string;
  /** Label on hits found only by meaning. */
  byMeaningLabel: string;
}

const MAX = 8;
/** Pause after the last keystroke before asking the server. */
const DEBOUNCE_MS = 300;

/**
 * Client-side bilingual search: typo-tolerant over names and aliases in both
 * languages, plus intents — "X vs Y" (compare), "from X to Y" (route) and
 * "before X" (prerequisites) — and, for questions and descriptions, search by meaning
 * (A75): the `semantic-search` Edge Function ranks terms server-side, fused with the
 * lexical ranking by RRF. Without a backend, or when it fails or is slow, the lexical
 * results simply stand.
 */
export default function Search({
  lang,
  indexUrl,
  semanticUrl,
  langBase,
  placeholder,
  noResults,
  loadingLabel,
  hint,
  intentLabels,
  disambiguationLabel,
  byMeaningLabel,
}: Props) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [query, setQuery] = useState('');
  const [semantic, setSemantic] = useState<{ query: string; hits: Scored[] } | null>(null);
  // Answers already fetched this visit, so editing back to a query doesn't ask again.
  const answered = useRef(new Map<string, Scored[]>());
  const box = useRef<HTMLInputElement>(null);

  // Arriving via the "/" shortcut from another page (…/#search): focus the box.
  useEffect(() => {
    if (location.hash === '#search') box.current?.focus();
  }, []);

  useEffect(() => {
    fetch(indexUrl)
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, [indexUrl]);

  const engine = useMemo(() => {
    if (!docs) return null;
    const ms = new MiniSearch({
      fields: ['en', 'da', 'akaEn', 'akaDa', 'summary'],
      searchOptions: { boost: { en: 3, da: 3, akaEn: 2, akaDa: 2 }, fuzzy: 0.2, prefix: true },
    });
    ms.addAll(
      docs.map((d) => ({
        id: d.id,
        en: d.term.en,
        da: d.term.da,
        akaEn: d.aka.en.join(' '),
        akaDa: d.aka.da.join(' '),
        summary: d.summary[lang],
      })),
    );
    return ms;
  }, [docs, lang]);

  const byId = useMemo(() => new Map((docs ?? []).map((d) => [d.id, d])), [docs]);
  const collisions = useMemo(() => collisionsOf((docs ?? []).map((d) => d.id)), [docs]);
  const best = (phrase: string) => {
    const exact = exactName(docs ?? [], phrase);
    if (exact) return exact;
    const hit = engine?.search(phrase, { fields: ['en', 'da', 'akaEn', 'akaDa'] })[0];
    return hit ? byId.get(hit.id as string) : undefined;
  };

  const q = query.trim();
  const intent = engine ? parseIntent(query) : null;
  const plain = engine && q ? engine.search(q) : [];
  // A question or description: drop function words lexically, and ask the server.
  const natural = Boolean(engine) && !intent && looksNaturalLanguage(q, plain.length);
  const lexical = natural && engine ? engine.search(q, { processTerm: dropStopwords }) : plain;
  const lexicalIds = lexical.slice(0, MAX).map((r) => r.id as string);
  // In fusion the lexical side is names and aliases only: for a question, a word from the
  // summaries ("stopping", "people") is noise, while a named term ("MFA") is a strong signal.
  const nameIds =
    natural && engine
      ? engine
          .search(q, { processTerm: dropStopwords, fields: ['en', 'da', 'akaEn', 'akaDa'] })
          .slice(0, MAX)
          .map((r) => r.id as string)
      : [];

  useEffect(() => {
    if (!natural || !semanticUrl) return;
    const key = `${lang}:${q}`;
    const cached = answered.current.get(key);
    if (cached) {
      setSemantic({ query: q, hits: cached });
      return;
    }
    // Debounced; a newer keystroke aborts the request in flight. Any failure or a
    // response slower than SEMANTIC_TIMEOUT_MS leaves the lexical results as they are.
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchSemantic(semanticUrl, q, lang, { signal: ctrl.signal })
        .then((hits) => {
          const near = nearBest(hits);
          answered.current.set(key, near);
          setSemantic({ query: q, hits: near });
        })
        .catch(() => {
          /* lexical only */
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, natural, semanticUrl, lang]);

  // Semantic first, so a tie between the two rankings goes to meaning for a question.
  const fresh = natural && semantic?.query === q ? semantic.hits : null;
  const results = fresh
    ? reciprocalRankFusion({ semantic: fresh.map((h) => h.id), lexical: nameIds }).slice(0, MAX)
    : lexicalIds.map((id) => ({ id, from: ['lexical'] }));

  // An intent resolves each phrase to its best-matching term.
  let action: { href: string; label: string } | null = null;
  if (intent) {
    const a = best(intent.a);
    const b = intent.kind === 'before' ? undefined : best(intent.b);
    const fill = (t: string) =>
      t.replace('{a}', a?.term[lang] ?? '').replace('{b}', b?.term[lang] ?? '');
    if (intent.kind === 'before' && a) {
      action = { href: `${langBase}terms/${a.id}/#learn-first`, label: fill(intentLabels.before) };
    } else if (a && b && a.id !== b.id) {
      action =
        intent.kind === 'compare' && a.contrasts.includes(b.id)
          ? {
              href: `${langBase}compare/${pairSlugFromIds(a.id, b.id)}/`,
              label: fill(intentLabels.compare),
            }
          : {
              href: `${langBase}explorer/?from=${encodeURIComponent(a.id)}&to=${encodeURIComponent(b.id)}`,
              label: fill(intentLabels.route),
            };
    }
  }

  // A query that is exactly a name several terms share goes to its Disambiguation page (ADR-0003).
  const shared = collisionForQuery(q, collisions);
  const disambiguation = shared
    ? {
        href: `${langBase}terms/${shared}/`,
        label: disambiguationLabel
          .replace('{name}', shared.replace(/-/g, ' '))
          .replace('{n}', String(collisions.get(shared)!.length)),
      }
    : null;

  return (
    <div class="relative">
      <input
        ref={box}
        id="search"
        type="search"
        autocomplete="off"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        aria-label={placeholder}
        class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
      />
      {q && !engine && (
        <p
          class="absolute z-10 mt-1 w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-neutral-500"
          role="status"
        >
          {loadingLabel}
        </p>
      )}
      {q && engine && (
        <ul
          class="absolute z-10 mt-1 w-full overflow-hidden rounded border border-neutral-800 bg-neutral-900 shadow-lg"
          aria-live="polite"
        >
          {action && (
            <li>
              <a
                class="block border-b border-neutral-800 bg-neutral-800/60 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
                href={action.href}
              >
                → {action.label}
              </a>
            </li>
          )}
          {disambiguation && (
            <li>
              <a
                class="block border-b border-neutral-800 bg-neutral-800/60 px-3 py-2 text-neutral-100 hover:bg-neutral-800"
                href={disambiguation.href}
              >
                → {disambiguation.label}
              </a>
            </li>
          )}
          {results.length === 0 && !action && !disambiguation ? (
            <li class="px-3 py-2 text-neutral-500">{noResults}</li>
          ) : (
            results.map((r) => {
              const d = byId.get(r.id);
              if (!d) return null;
              return (
                <li key={d.id}>
                  <a
                    class="block px-3 py-2 hover:bg-neutral-800"
                    href={`${langBase}terms/${d.id}/`}
                  >
                    <span class="text-neutral-100">{d.term[lang]}</span>
                    {!r.from.includes('lexical') && (
                      <span class="ml-2 rounded bg-sky-950 px-1.5 py-0.5 text-xs text-sky-300">
                        ✦ {byMeaningLabel}
                      </span>
                    )}
                    <span class="block text-sm text-neutral-500">{d.summary[lang]}</span>
                  </a>
                </li>
              );
            })
          )}
        </ul>
      )}
      {hint && <p class="mt-2 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
