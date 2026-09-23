import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import MiniSearch from 'minisearch';
import { parseIntent } from '../lib/intent';
import { pairSlugFromIds } from '../lib/slug';
import {
  dropStopwords,
  looksNaturalLanguage,
  reciprocalRankFusion,
  type Scored,
} from '../lib/semantic';
import type { WorkerRequest, WorkerResponse } from './semantic.worker';

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
  /** The committed term vectors (public/semantic/vectors.json). */
  vectorsUrl: string;
  /** Base URL of this language, e.g. /tech-atlas/en/ */
  langBase: string;
  placeholder: string;
  noResults: string;
  /** Templates with {a} / {b} placeholders. */
  intentLabels: { compare: string; route: string; before: string };
  /** `loading` has a {p} placeholder for the download progress. */
  semanticLabels: { enable: string; loading: string; byMeaning: string; failed: string };
}

/** Set once the model has loaded, so it is in the browser cache and costs nothing to reuse. */
const SEMANTIC_KEY = 'atlas.semantic';
const MAX = 8;

/**
 * Client-side bilingual search: typo-tolerant over names and aliases in both
 * languages, plus intents — "X vs Y" (compare), "from X to Y" (route) and
 * "before X" (prerequisites) — and, for questions and descriptions, semantic search
 * (A51): a multilingual model in a worker, fused with the lexical ranking by RRF.
 */
export default function Search({
  lang,
  indexUrl,
  vectorsUrl,
  langBase,
  placeholder,
  noResults,
  intentLabels,
  semanticLabels,
}: Props) {
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [query, setQuery] = useState('');
  // Semantic search: opted in (or the model is already cached), load state, last result.
  const [semanticOn, setSemanticOn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [semantic, setSemantic] = useState<{ query: string; hits: Scored[] } | null>(null);
  const worker = useRef<Worker | null>(null);
  const lastRequest = useRef(0);

  useEffect(() => {
    fetch(indexUrl)
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => setDocs([]));
    try {
      if (localStorage.getItem(SEMANTIC_KEY)) setSemanticOn(true);
    } catch {
      /* storage unavailable: semantic search stays opt-in */
    }
    return () => worker.current?.terminate();
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

  const q = query.trim();
  const intent = engine ? parseIntent(query) : null;
  const plain = engine && q ? engine.search(q) : [];
  // A question or description: drop function words lexically, and ask the model.
  const natural = !intent && looksNaturalLanguage(q, plain.length);
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
    if (!natural || !semanticOn) return;
    const timer = setTimeout(() => {
      if (!worker.current) {
        worker.current = new Worker(new URL('./semantic.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const m = e.data;
          if (m.type === 'progress') {
            setProgress(m.total ? m.loaded / m.total : null);
          } else if (m.type === 'ready') {
            setStatus('ready');
            try {
              localStorage.setItem(SEMANTIC_KEY, '1');
            } catch {
              /* not remembered; still works this visit */
            }
          } else if (m.type === 'result') {
            setSemantic({ query: m.query, hits: m.hits });
          } else if (m.id === lastRequest.current) {
            setStatus('error');
          }
        };
      }
      setStatus((s) => (s === 'ready' ? s : 'loading'));
      lastRequest.current += 1;
      const req: WorkerRequest = { id: lastRequest.current, query: q, vectorsUrl };
      worker.current.postMessage(req);
    }, 300);
    return () => clearTimeout(timer);
  }, [q, natural, semanticOn, vectorsUrl]);

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

  const waiting = natural && semanticOn && !fresh && status !== 'error';
  const note = 'block px-3 py-2 text-sm text-neutral-500';

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
      {q && (
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
          {natural && !semanticOn && (
            <li>
              <button
                type="button"
                class="block w-full border-b border-neutral-800 px-3 py-2 text-left text-sm text-sky-300 hover:bg-neutral-800"
                onClick={() => setSemanticOn(true)}
              >
                ✦ {semanticLabels.enable}
              </button>
            </li>
          )}
          {waiting && status !== 'ready' && (
            <li class={note} role="status">
              {semanticLabels.loading.replace(
                '{p}',
                progress === null ? '' : `${Math.round(progress * 100)}%`,
              )}
            </li>
          )}
          {natural && semanticOn && status === 'error' && (
            <li class={note}>{semanticLabels.failed}</li>
          )}
          {results.length === 0 && !action && !waiting ? (
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
                        ✦ {semanticLabels.byMeaning}
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
    </div>
  );
}
