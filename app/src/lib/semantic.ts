import { withTimeout } from './fetch-timeout';
import type { Scored } from './semantic-vectors';

export * from './semantic-vectors';

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

export const EMBED_OPTIONS = { pooling: 'cls', normalize: true } as const;

export const QUANTIZE_VERSION = 1;
export const PASSAGE_FORMAT = 2;

export type Lang = 'en' | 'da';
export const EMBED_LANGS: readonly Lang[] = ['en', 'da'];

export interface EmbeddableTerm {
  term: Record<Lang, string>;
  aka: Record<Lang, string[]>;
  summary: Record<Lang, string>;
  body: { plain: Record<Lang, string> };
}

export function passageText(t: EmbeddableTerm, lang: Lang): string {
  const aka = t.aka[lang].length ? ` (${t.aka[lang].join(', ')})` : '';
  return `${t.term[lang]}${aka}. ${t.summary[lang]} ${t.body.plain[lang]}`;
}

export const queryText = (q: string) => q.trim();

export interface Fused {
  id: string;
  score: number;
  from: string[];
}

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

export function looksNaturalLanguage(query: string, lexicalHits: number): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return words.length >= 3 || (lexicalHits === 0 && query.trim().length >= 4);
}

export function nearBest(scored: Scored[], margin = 0.06): Scored[] {
  const top = scored[0]?.score ?? 0;
  return scored.filter((s) => s.score >= top - margin);
}

export type Hit = { id: string; from: string[] };

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

export const SEMANTIC_TIMEOUT_MS = 6000;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

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

export type SemanticQuery = { url: string; q: string; lang: Lang };

export async function fetchSemantic(
  { url, q, lang }: SemanticQuery,
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

export const dropStopwords = (term: string): string | null => {
  const t = term.toLowerCase();
  return STOPWORDS.has(t) ? null : t;
};
