export const initials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const head = (w: string) => Array.from(w)[0] ?? '';
  const last = words.length > 1 ? head(words[words.length - 1]) : '';
  return (head(words[0]) + last).toLocaleUpperCase();
};

export interface AboutLink {
  id: string;
  label: string;
  href: string;
}

export const visibleLinks = (links: AboutLink[]): AboutLink[] =>
  links.filter((l) => /^https?:\/\/\S+$/.test(l.href.trim()));
