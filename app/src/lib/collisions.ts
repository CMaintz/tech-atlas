/**
 * Collisions (ADR-0003): two distinct Terms in different folders that share a bare
 * name (`cs/audit`, `security/audit`). The bare name serves a generated
 * Disambiguation page at `/[lang]/terms/<name>/`. Pure — shared by lint, the site
 * and the Search island.
 */

/** The bare name of a namespaced id: `security/audit` → `audit`. */
export const bareName = (id: string) => id.split('/').pop()!;

/** Every bare name held by two or more Terms, with its ids sorted; names sorted. */
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

/**
 * The colliding name a search query spells exactly (ignoring case and `-` vs space),
 * e.g. "Audit" → "audit"; null when the query is not a shared name.
 */
export function collisionForQuery(query: string, collisions: Map<string, string[]>): string | null {
  const q = normalise(query);
  if (!q) return null;
  for (const name of collisions.keys()) if (normalise(name) === q) return name;
  return null;
}
