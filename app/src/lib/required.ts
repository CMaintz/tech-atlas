export function required<K, V>(map: ReadonlyMap<K, V>, key: K, what: string): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`no ${what} for ${String(key)}`);
  return value;
}
