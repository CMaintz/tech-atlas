export const bareName = (id: string) => id.slice(id.lastIndexOf('/') + 1);

export function collisionsOf(ids: Iterable<string>): Map<string, string[]> {
  const byName = new Map<string, string[]>();
  for (const id of ids) byName.set(bareName(id), [...(byName.get(bareName(id)) ?? []), id]);
  return new Map(
    [...byName.entries()]
      .filter(([, list]) => list.length > 1)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, list]) => [name, [...list].sort()]),
  );
}

const normalise = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, ' ');

export function collisionForQuery(query: string, collisions: Map<string, string[]>): string | null {
  const q = normalise(query);
  if (!q) return null;
  for (const name of collisions.keys()) if (normalise(name) === q) return name;
  return null;
}
