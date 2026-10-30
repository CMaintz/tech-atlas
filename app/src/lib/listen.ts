export type Binding = readonly [
  target: EventTarget,
  type: string,
  listener: (e: never) => void,
  options?: AddEventListenerOptions,
];

export function listen([target, type, fn, opts]: Binding): () => void {
  const handler = fn as EventListener;
  target.addEventListener(type, handler, opts);
  return () => target.removeEventListener(type, handler, opts);
}

export function listenAll(bindings: readonly Binding[]): () => void {
  const offs = bindings.map((b) => listen(b));
  return () => offs.forEach((off) => off());
}
