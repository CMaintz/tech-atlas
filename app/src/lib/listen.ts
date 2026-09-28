/** Event listeners whose removal is handed back, so an effect can return it as its cleanup. */

/**
 * Adds an event listener and returns the function that removes it (with the same
 * options).
 */
export function listen<E extends Event>(
  target: EventTarget,
  type: string,
  fn: (e: E) => void,
  opts?: AddEventListenerOptions,
): () => void {
  const handler = fn as EventListener;
  target.addEventListener(type, handler, opts);
  return () => target.removeEventListener(type, handler, opts);
}

/** A target, an event type and its listener. */
export type Binding = readonly [target: EventTarget, type: string, listener: (e: never) => void];

/** Add every listener; returns a function that removes them all. */
export function listenAll(bindings: readonly Binding[]): () => void {
  for (const [target, type, fn] of bindings) target.addEventListener(type, fn as EventListener);
  return () => {
    for (const [target, type, fn] of bindings)
      target.removeEventListener(type, fn as EventListener);
  };
}
