/** Event listeners added together and removed together. */

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
