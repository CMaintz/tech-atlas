/**
 * Adds an event listener and returns the function that removes it (with the same
 * options), so an effect can hand the pair back as its cleanup.
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
