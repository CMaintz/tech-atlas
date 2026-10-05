/**
 * Semantic (vector) search — the pure half. CI embeds every
 * term through Workers AI into Postgres (pgvector) next to the learner data
 * (scripts/seed-vectors.ts), and the `semantic-search` Supabase Edge Function embeds each
 * query with the same call and returns the nearest terms; `npm run embed` keeps a
 * committed copy for the lint's hashes and the offline ranking tests. The
 * browser never downloads a model: it calls the function (fetchSemantic) and merges its
 * ranking with the lexical one (MiniSearch) by reciprocal rank fusion. Pure, unit-tested.
 *
 * The vector file, its encoding and the offline index live in semantic-vectors.ts,
 * re-exported here so every caller keeps one import.
 */
import { withTimeout } from './fetch-timeout';
import type { Scored } from './semantic-vectors';

export * from './semantic-vectors';

/**
 * The model: BAAI's bge-m3 (dense output = unit-length [CLS] vector; no query/passage
 * prefixes). The Edge Function runs it on Cloudflare Workers AI; `npm run embed` uses
 * the same Workers AI model when Cloudflare credentials are set, otherwise the
 * full-precision ONNX export of the same weights (pinned revision) on this machine.
 * Changing any of these (or QUANTIZE_VERSION / PASSAGE_FORMAT) re-embeds.
 */
export const MODEL = {
  id: 'BAAI/bge-m3',
  cloudflare: '@cf/baai/bge-m3',
  onnx: {
    id: 'Xenova/bge-m3',
    revision: '4de13258303883538bd53b696b452bf8099f0858',
    dtype: 'fp32',
  },
  dim: 1024,
} as const;

/** The dense bge-m3 output, as the ONNX feature-extraction pipeline computes it. */
export const EMBED_OPTIONS = { pooling: 'cls', normalize: true } as const;

/** Bump when the vector encoding (quantize/toBase64) changes. */
export const QUANTIZE_VERSION = 1;
/** Bump when passageText changes shape. */
export const PASSAGE_FORMAT = 2;

export type Lang = 'en' | 'da';
export const EMBED_LANGS: readonly Lang[] = ['en', 'da'];

/** The fields of a Term that are embedded. */
export interface EmbeddableTerm {
  term: Record<Lang, string>;
  aka: Record<Lang, string[]>;
  summary: Record<Lang, string>;
  body: { plain: Record<Lang, string> };
}

/** The passage embedded for one term in one language: name, aliases, summary, plain facet. */
export function passageText(t: EmbeddableTerm, lang: Lang): string {
  const aka = t.aka[lang].length ? ` (${t.aka[lang].join(', ')})` : '';
  return `${t.term[lang]}${aka}. ${t.summary[lang]} ${t.body.plain[lang]}`;
}

/** bge-m3 embeds a query as it is (no instruction prefix). */
export const queryText = (q: string) => q.trim();

export interface Fused {
  id: string;
  score: number;
  /** Which rankings contributed, in the order given (e.g. ['lexical', 'semantic']). */
  from: string[];
}

/**
 * Reciprocal rank fusion: score = Σ 1 / (k + rank). Rank-based, so the incomparable
 * scales of MiniSearch and cosine never have to be reconciled. Ties keep first-seen order.
 */
export function reciprocalRankFusion(rankings: Record<string, string[]>, k = 60): Fused[] {
  const acc = new Map<string, Fused>();
  for (const [name, ids] of Object.entries(rankings)) {
    ids.forEach((id, rank) => {
      const f = acc.get(id) ?? { id, score: 0, from: [] };
      f.score += 1 / (k + rank + 1);
      if (!f.from.includes(name)) f.from.push(name);
      acc.set(id, f);
    });
  }
  return [...acc.values()].sort((a, b) => b.score - a.score);
}

/**
 * Whether a query reads as a question or description rather than a name: three or more
 * words, or a query the name index could not match at all.
 */
export function looksNaturalLanguage(query: string, lexicalHits: number): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return words.length >= 3 || (lexicalHits === 0 && query.trim().length >= 4);
}

/**
 * Keep only the semantic hits close to the best one. bge-m3's best matches for the
 * fixture questions score 0.59–0.71, with the right answer always within 0.03 of the
 * top hit; the absolute level varies by query, so a margin below the top hit (not a
 * threshold) drops the long tail that every query, even nonsense, would otherwise get.
 */
export function nearBest(scored: Scored[], margin = 0.06): Scored[] {
  const top = scored[0]?.score ?? 0;
  return scored.filter((s) => s.score >= top - margin);
}

/** A search result and which rankings found it ('lexical', 'semantic'). */
export type Hit = { id: string; from: string[] };

/**
 * The list a search box shows (the home search and the Explorer's "Find a term"):
 * the lexical hits as they are until the server's meaning-based hits for this
 * very query arrive, then both fused by RRF (semantic first, so a tie goes to meaning).
 * `names` is the lexical side in fusion (names and aliases only); ids `known` rejects
 * (terms this page cannot show) are dropped.
 */
export function mergeHits(
  lexical: readonly string[],
  semantic: readonly Scored[] | null,
  opts: { names?: readonly string[]; max?: number; known?: (id: string) => boolean } = {},
): Hit[] {
  const { names = lexical, max = 8, known = () => true } = opts;
  if (!semantic)
    return lexical
      .filter(known)
      .slice(0, max)
      .map((id) => ({ id, from: ['lexical'] }));
  return reciprocalRankFusion({
    semantic: semantic.map((h) => h.id).filter(known),
    lexical: names.filter(known),
  })
    .slice(0, max)
    .map(({ id, from }) => ({ id, from }));
}

/** How long the browser waits for the function before showing lexical results only. */
export const SEMANTIC_TIMEOUT_MS = 6000;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/** The function's JSON answer as scored hits; throws on anything malformed. */
function parseHits(body: { hits?: unknown }): Scored[] {
  if (!Array.isArray(body?.hits)) throw new Error('semantic search: malformed response');
  return body.hits.map((h) => {
    const { id, score } = (h ?? {}) as Record<string, unknown>;
    if (typeof id !== 'string' || typeof score !== 'number') {
      throw new Error('semantic search: malformed hit');
    }
    return { id, score };
  });
}

/**
 * Ask the `semantic-search` function for the terms nearest a query. Rejects on an HTTP
 * error, a malformed body, the caller's abort, or after `timeoutMs` — the caller then
 * simply keeps the lexical results.
 */
export async function fetchSemantic(
  url: string,
  q: string,
  lang: Lang,
  opts: { signal?: AbortSignal; timeoutMs?: number; fetch?: FetchLike; k?: number } = {},
): Promise<Scored[]> {
  return withTimeout(opts.timeoutMs ?? SEMANTIC_TIMEOUT_MS, opts.signal, async (signal) => {
    const res = await (opts.fetch ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, lang, k: opts.k ?? 8 }),
      signal,
    });
    if (!res.ok) throw new Error(`semantic search: HTTP ${res.status}`);
    return parseHits((await res.json()) as { hits?: unknown });
  });
}

// Function words (English + Danish) dropped from natural-language queries before the
// lexical search, so "how do I…" doesn't prefix-match names like "Plan-Do-Check-Act".
const STOPWORDS = new Set(
  (
    'a an and are as at be but by can could do does did for from has have how i if in into is it ' +
    'its me my no not of on or our should so than that the their them then there these they this ' +
    'to us was we were what when where which who why will with would you your ' +
    'af at bliver da de dem den der det din dine dit du efter eller en er et for fra før gør ' +
    'har hvad hvem hvilke hvilken hvis hvor hvordan hvorfor i ikke jeg kan man med mig min mine ' +
    'mit mod når og om os på sig skal som til ud var vi vil være så men også noget nogen alle'
  ).split(' '),
);

/** MiniSearch `processTerm` for natural-language queries: lower-case, drop function words. */
export const dropStopwords = (term: string): string | null => {
  const t = term.toLowerCase();
  return STOPWORDS.has(t) ? null : t;
};
