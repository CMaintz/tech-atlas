import { useEffect, useRef, useState } from 'preact/hooks';
import { fetchSemantic, nearBest, type Scored, type SemanticQuery } from './semantic';

export const DEBOUNCE_MS = 300;

type Ask = SemanticQuery & { key: string };
type Answer = { key: string; hits: Scored[] };

function askAfterPause(ask: Ask, answered: Map<string, Scored[]>, onAnswer: (a: Answer) => void) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    fetchSemantic(ask, { signal: ctrl.signal })
      .then((hits) => {
        const near = nearBest(hits);
        answered.set(ask.key, near);
        onAnswer({ key: ask.key, hits: near });
      })
      .catch(() => undefined);
  }, DEBOUNCE_MS);
  return () => {
    clearTimeout(timer);
    ctrl.abort();
  };
}

function recallOrAsk(ask: Ask, answered: Map<string, Scored[]>, onAnswer: (a: Answer) => void) {
  const cached = answered.get(ask.key);
  if (!cached) return askAfterPause(ask, answered, onAnswer);
  onAnswer({ key: ask.key, hits: cached });
  return undefined;
}

export function useSemanticHits(query: SemanticQuery, enabled: boolean): Scored[] | null {
  const { url, q, lang } = query;
  const [answer, setAnswer] = useState<Answer | null>(null);
  const answered = useRef(new Map<string, Scored[]>());
  const key = `${lang}:${q}`;
  useEffect(() => {
    if (!enabled || !url) return;
    return recallOrAsk({ url, q, lang, key }, answered.current, setAnswer);
  }, [key, enabled, url]);
  return enabled && url && answer?.key === key ? answer.hits : null;
}
