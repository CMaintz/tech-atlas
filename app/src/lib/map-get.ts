export function getOrThrow<K, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`${what}: no entry for ${String(key)}`);
  return value;
}
