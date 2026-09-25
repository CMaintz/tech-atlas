/**
 * The browser side of search by meaning (A75), shared by the home search and the
 * Explorer's "Find a term" (A95): after a pause in typing it asks the `semantic-search`
 * function for the terms nearest `q`, aborting a request a newer keystroke overtakes.
 * Returns the near-best hits for exactly this query, or null until they arrive, when
 * disabled or without a backend, and on any failure or timeout (the caller then keeps
 * its name matches). Answers are remembered for the visit.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { fetchSemantic, nearBest, type Lang, type Scored } from './semantic';

/** Pause after the last keystroke before asking the server. */
export const DEBOUNCE_MS = 300;

export function useSemanticHits(
  url: string,
  q: string,
  lang: Lang,
  enabled: boolean,
): Scored[] | null {
  const [answer, setAnswer] = useState<{ key: string; hits: Scored[] } | null>(null);
  const answered = useRef(new Map<string, Scored[]>());
  const key = `${lang}:${q}`;

  useEffect(() => {
    if (!enabled || !url) return;
    const cached = answered.current.get(key);
    if (cached) {
      setAnswer({ key, hits: cached });
      return;
    }
    // Any failure, or a response slower than SEMANTIC_TIMEOUT_MS, leaves the names only.
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetchSemantic(url, q, lang, { signal: ctrl.signal })
        .then((hits) => {
          const near = nearBest(hits);
          answered.current.set(key, near);
          setAnswer({ key, hits: near });
        })
        .catch(() => {
          /* names only */
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [key, enabled, url]);

  return enabled && url && answer?.key === key ? answer.hits : null;
}
