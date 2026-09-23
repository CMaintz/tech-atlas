/** Canonical, order-independent slug for a compare pair (pure — used by site and client). */
export const pairSlugFromIds = (x: string, y: string) => {
  const [a, b] = [x, y].sort((p, q) => p.localeCompare(q));
  const na = a.split('/').pop()!;
  const nb = b.split('/').pop()!;
  return na !== nb ? `${na}-vs-${nb}` : `${a.replace('/', '.')}-vs-${b.replace('/', '.')}`;
};
