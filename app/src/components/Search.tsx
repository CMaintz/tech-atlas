import { useEffect, useMemo, useState } from 'preact/hooks';
import MiniSearch from 'minisearch';

type Lang = 'en' | 'da';
type Doc = {
  id: string;
  term: Record<Lang, string>;
  aka: Record<Lang, string[]>;
  summary: Record<Lang, string>;
};

interface Props {
  lang: Lang;
  indexUrl: string;
  termBase: string;
  placeholder: string;
  noResults: string;
}

/** Client-side bilingual search: term names and aliases in both languages, typo-tolerant. */
export default function Search({ lang, indexUrl, termBase, placeholder, noResults }: Props) {
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
      searchOptions: {
        boost: { en: 3, da: 3, akaEn: 2, akaDa: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
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
  const results = engine && query.trim() ? engine.search(query).slice(0, 8) : [];

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
          {results.length === 0 ? (
            <li class="px-3 py-2 text-neutral-500">{noResults}</li>
          ) : (
            results.map((r) => {
              const d = byId.get(r.id as string);
              if (!d) return null;
              return (
                <li key={d.id}>
                  <a class="block px-3 py-2 hover:bg-neutral-800" href={`${termBase}${d.id}/`}>
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
