import { bareName } from './collisions';

export const pairSlugFromIds = (x: string, y: string) => {
  const [a, b] = [x, y].sort((p, q) => p.localeCompare(q));
  const na = bareName(a);
  const nb = bareName(b);
  return na !== nb ? `${na}-vs-${nb}` : `${a.replace('/', '.')}-vs-${b.replace('/', '.')}`;
};
