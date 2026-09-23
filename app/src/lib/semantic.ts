/**
 * Semantic (vector) search — the pure half (A51). Terms are embedded at author time
 * by `npm run embed` (scripts/embed.ts) with a small multilingual model; the browser
 * embeds the query with the same model in a worker (src/components/semantic.worker.ts)
 * and ranks terms by cosine similarity. Lexical (MiniSearch) and semantic rankings are
 * merged by reciprocal rank fusion. Everything here is pure and unit-tested.
 */

/** The model, its quantisation and the e5 prefixes. Changing any of these re-embeds. */
export const MODEL = {
  id: 'Xenova/multilingual-e5-small',
  dtype: 'q8',
  passagePrefix: 'passage: ',
  queryPrefix: 'query: ',
} as const;

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
  return `${MODEL.passagePrefix}${t.term[lang]}${aka}. ${t.summary[lang]} ${t.body.plain[lang]}`;
}

export const queryText = (q: string) => MODEL.queryPrefix + q.trim();

/** The committed vector file (public/semantic/vectors.json). */
export interface VectorFile {
  model: string;
  dtype: string;
  dim: number;
  langs: Lang[];
  /** sha256 of the model settings and every passage — the lint's staleness check (E11). */
  inputHash: string;
  /** Term ids; vector i*langs.length + j is term i in language j. */
  ids: string[];
  /** Int8 components, base64; each vector scaled so its largest component is ±127. */
  data: string;
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
 * Keep only the semantic hits close to the best one. e5 similarities sit in a narrow
 * band (about 0.8–0.9), so an absolute threshold is meaningless; a margin below the
 * top hit drops the long tail that every query, even nonsense, would otherwise get.
 */
export function nearBest(scored: Scored[], margin = 0.03): Scored[] {
  const top = scored[0]?.score ?? 0;
  return scored.filter((s) => s.score >= top - margin);
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
    'mit mod når og om os på sig skal som til ud var vi vil være'
  ).split(' '),
);

/** MiniSearch `processTerm` for natural-language queries: lower-case, drop function words. */
export const dropStopwords = (term: string): string | null => {
  const t = term.toLowerCase();
  return STOPWORDS.has(t) ? null : t;
};
