/**
 * Semantic (vector) search — the pure half (A75, superseding A51–A55). CI embeds every
 * term through Workers AI into Postgres (pgvector) next to the learner data
 * (scripts/seed-vectors.ts), and the `semantic-search` Supabase Edge Function embeds each
 * query with the same call and returns the nearest terms; `npm run embed` keeps a
 * committed copy for the lint's hashes and the offline ranking tests (A76). The
 * browser never downloads a model: it calls the function (fetchSemantic) and merges its
 * ranking with the lexical one (MiniSearch) by reciprocal rank fusion. Pure, unit-tested.
 */

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

/**
 * The committed vector file (supabase/seed/term-vectors.json): the lint's per-term hash
 * source and the offline ranking tests' index. The database is seeded by re-embedding.
 */
export interface VectorFile {
  model: string;
  /** Where the vectors were computed (Workers AI, or the ONNX export on the author's machine). */
  backend: string;
  dim: number;
  langs: Lang[];
  /** Hash of the model, pooling, dimension, passage format, quantisation, languages (E11). */
  settingsHash: string;
  /** Per term, a hash of its embedded passages (lint W8 when one changes). */
  passageHashes: Record<string, string>;
  /** Term ids; vector i*langs.length + j is term i in language j. */
  ids: string[];
  /** Int8 components, base64; each vector scaled so its largest component is ±127. */
  data: string;
}

/** What the content expects of the vector file (computed by scripts/semantic-inputs.ts). */
export interface ExpectedVectors {
  settingsHash: string;
  passageHashes: Record<string, string>;
}

/**
 * Compare a committed vector file with the content. Errors (lint E11) make search wrong
 * — other model settings, or a term added or removed; `changed` (lint W8) lists terms
 * whose text changed since they were embedded, which only makes their vector a bit stale.
 */
export function compareVectors(
  file: Pick<VectorFile, 'settingsHash' | 'passageHashes'>,
  expected: ExpectedVectors,
): { errors: string[]; changed: string[] } {
  if (file.settingsHash !== expected.settingsHash) {
    return { errors: ['model or embedding settings changed'], changed: [] };
  }
  const have = file.passageHashes ?? {};
  const missing = Object.keys(expected.passageHashes).filter((id) => !(id in have));
  const removed = Object.keys(have).filter((id) => !(id in expected.passageHashes));
  const errors = [
    ...(missing.length ? [`terms without vectors: ${missing.join(', ')}`] : []),
    ...(removed.length ? [`vectors for removed terms: ${removed.join(', ')}`] : []),
  ];
  const changed = Object.keys(expected.passageHashes).filter(
    (id) => id in have && have[id] !== expected.passageHashes[id],
  );
  return { errors, changed };
}

/** Quantise vectors to Int8, one scale per vector (direction is all cosine needs). */
export function quantize(vectors: ArrayLike<number>[]): Int8Array {
  const dim = vectors[0]?.length ?? 0;
  const out = new Int8Array(vectors.length * dim);
  vectors.forEach((v, i) => {
    let max = 0;
    for (let k = 0; k < dim; k++) max = Math.max(max, Math.abs(v[k]));
    const s = max ? 127 / max : 0;
    for (let k = 0; k < dim; k++) out[i * dim + k] = Math.round(v[k] * s);
  });
  return out;
}

/** Dequantise to unit-length Float32 vectors, so cosine is a dot product. */
export function dequantize(q: Int8Array, dim: number): Float32Array[] {
  const out: Float32Array[] = [];
  for (let i = 0; i < q.length / dim; i++) out.push(normalize(q.subarray(i * dim, (i + 1) * dim)));
  return out;
}

export function normalize(v: ArrayLike<number>): Float32Array {
  const out = Float32Array.from(v as ArrayLike<number>);
  let n = 0;
  for (let k = 0; k < out.length; k++) n += out[k] * out[k];
  n = Math.sqrt(n);
  if (n) for (let k = 0; k < out.length; k++) out[k] /= n;
  return out;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let k = 0; k < a.length; k++) {
    dot += a[k] * b[k];
    na += a[k] * a[k];
    nb += b[k] * b[k];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export function toBase64(bytes: Int8Array): string {
  const u = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(b64: string): Int8Array {
  const s = atob(b64);
  const out = new Int8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = (s.charCodeAt(i) << 24) >> 24;
  return out;
}

/** An index ready to query: per term, one unit vector per language. */
export interface SemanticIndex {
  ids: string[];
  vectors: Float32Array[][];
}

export function loadIndex(file: VectorFile): SemanticIndex {
  const flat = dequantize(fromBase64(file.data), file.dim);
  const n = file.langs.length;
  return { ids: file.ids, vectors: file.ids.map((_, i) => flat.slice(i * n, (i + 1) * n)) };
}

/** One `public.term_vectors` row: the vector in pgvector's text form. */
export interface VectorRow {
  id: string;
  lang: Lang;
  embedding: string;
  passage_hash: string;
}

/**
 * The rows the seed script upserts: vector `i * langs.length + j` belongs to term `i` in
 * language `j` (the order semanticInputs emits passages in), normalised to unit length.
 */
export function toVectorLiteralRows(
  ids: readonly string[],
  langs: readonly Lang[],
  vectors: readonly ArrayLike<number>[],
  passageHashes: Record<string, string>,
): VectorRow[] {
  if (vectors.length !== ids.length * langs.length) {
    throw new Error(`expected ${ids.length * langs.length} vectors, got ${vectors.length}`);
  }
  return ids.flatMap((id, i) =>
    langs.map((lang, j) => ({
      id,
      lang,
      embedding: `[${Array.from(normalize(vectors[i * langs.length + j]), (x) => +x.toFixed(6)).join(',')}]`,
      passage_hash: passageHashes[id],
    })),
  );
}

export interface Scored {
  id: string;
  score: number;
}

/**
 * Rank terms by similarity to a query vector. A term scores its best language, so a
 * Danish query finds a term whose name is English (and vice versa).
 */
export function rankBySimilarity(index: SemanticIndex, query: ArrayLike<number>, k = 8): Scored[] {
  const q = normalize(query);
  const scored = index.ids.map((id, i) => {
    let best = -1;
    for (const v of index.vectors[i]) {
      let dot = 0;
      for (let d = 0; d < q.length; d++) dot += q[d] * v[d];
      if (dot > best) best = dot;
    }
    return { id, score: best };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, k);
}

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
 * The list a search box shows (A75; the home search and the Explorer's "Find a term",
 * A95): the lexical hits as they are until the server's meaning-based hits for this
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
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (opts.signal?.aborted) abort();
  opts.signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, opts.timeoutMs ?? SEMANTIC_TIMEOUT_MS);
  try {
    const res = await (opts.fetch ?? fetch)(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q, lang, k: opts.k ?? 8 }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`semantic search: HTTP ${res.status}`);
    const body = (await res.json()) as { hits?: unknown };
    if (!Array.isArray(body?.hits)) throw new Error('semantic search: malformed response');
    return body.hits.map((h) => {
      const { id, score } = (h ?? {}) as Record<string, unknown>;
      if (typeof id !== 'string' || typeof score !== 'number') {
        throw new Error('semantic search: malformed hit');
      }
      return { id, score };
    });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', abort);
  }
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
