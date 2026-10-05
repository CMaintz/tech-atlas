/**
 * Semantic search's vectors: the committed vector file and how it is checked
 * against the content, its Int8/base64 encoding, the in-memory index the offline ranking
 * tests query, and the rows the seed script upserts. Pure; re-exported by semantic.ts.
 */
import type { Lang } from './semantic';

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
  const changed = Object.keys(expected.passageHashes).filter(
    (id) => id in have && have[id] !== expected.passageHashes[id],
  );
  return { errors: termSetErrors(have, expected.passageHashes), changed };
}

/** Terms added since the vectors were made, and vectors of terms since removed. */
function termSetErrors(have: Record<string, string>, want: Record<string, string>): string[] {
  const missing = Object.keys(want).filter((id) => !(id in have));
  const removed = Object.keys(have).filter((id) => !(id in want));
  return [
    ...(missing.length ? [`terms without vectors: ${missing.join(', ')}`] : []),
    ...(removed.length ? [`vectors for removed terms: ${removed.join(', ')}`] : []),
  ];
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
