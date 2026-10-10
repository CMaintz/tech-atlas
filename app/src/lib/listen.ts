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

export type Binding = readonly [target: EventTarget, type: string, listener: (e: never) => void];

export function listenAll(bindings: readonly Binding[]): () => void {
  for (const [target, type, fn] of bindings) target.addEventListener(type, fn as EventListener);
  return () => {
    for (const [target, type, fn] of bindings)
      target.removeEventListener(type, fn as EventListener);
  };
}
