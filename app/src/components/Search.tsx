import { useEffect, useMemo, useState } from 'preact/hooks';
import MiniSearch from 'minisearch';
import { parseIntent } from '../lib/intent';
import { pairSlugFromIds } from '../lib/slug';

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
  /** Base URL of this language, e.g. /tech-atlas/en/ */
  langBase: string;
  placeholder: string;
  noResults: string;
  /** Templates with {a} / {b} placeholders. */
  intentLabels: { compare: string; route: string; before: string };
}

/**
 * Client-side bilingual search: typo-tolerant over names and aliases in both
 * languages, plus intents — "X vs Y" (compare), "from X to Y" (route) and
 * "before X" (prerequisites).
 */
export default function Search({
  lang,
  indexUrl,
  langBase,
  placeholder,
  noResults,
  intentLabels,
}: Props) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [query, setQuery] = useState('');

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
  const best = (phrase: string) => {
    const hit = engine?.search(phrase, { fields: ['en', 'da', 'akaEn', 'akaDa'] })[0];
    return hit ? byId.get(hit.id as string) : undefined;
  };

  const results = engine && query.trim() ? engine.search(query).slice(0, 8) : [];

  // An intent resolves each phrase to its best-matching term.
  let action: { href: string; label: string } | null = null;
  const intent = engine ? parseIntent(query) : null;
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

  return (
    <div class="relative">
      <input
        type="search"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        aria-label={placeholder}
        class="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-400 focus:outline-none"
      />
      {query.trim() && (
        <ul class="absolute z-10 mt-1 w-full overflow-hidden rounded border border-neutral-800 bg-neutral-900 shadow-lg">
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
          {results.length === 0 && !action ? (
            <li class="px-3 py-2 text-neutral-500">{noResults}</li>
          ) : (
            results.map((r) => {
              const d = byId.get(r.id as string);
              if (!d) return null;
              return (
                <li key={d.id}>
                  <a
                    class="block px-3 py-2 hover:bg-neutral-800"
                    href={`${langBase}terms/${d.id}/`}
                  >
                    <span class="text-neutral-100">{d.term[lang]}</span>
                    <span class="block text-sm text-neutral-500">{d.summary[lang]}</span>
                  </a>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
