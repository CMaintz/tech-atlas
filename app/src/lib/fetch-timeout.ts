/**
 * Run an abortable request with a deadline. `run` gets a signal that aborts when the
 * caller's `signal` does (at once if it already has) or after `timeoutMs` — whichever
 * comes first. The deadline covers everything `run` awaits (e.g. reading the body too),
 * and the timer and listener are always cleaned up. A plain AbortController, not
 * `AbortSignal.any`, so older browsers are served too.
 */
export async function withTimeout<T>(
  timeoutMs: number,
  signal: AbortSignal | undefined,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  const timer = setTimeout(abort, timeoutMs);
  try {
    return await run(ctrl.signal);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
