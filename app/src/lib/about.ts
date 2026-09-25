/**
 * Pure helpers for the About dialog (A84). No DOM and no node:fs: this module is
 * bundled into the client island. The photo check lives in about-assets.ts (server).
 */

/** Up to two initials, from the first and last word: "Christoffer Maintz" → "CM". */
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

/** The links worth rendering: those with a real http(s) URL. Placeholders are dropped. */
export const visibleLinks = (links: AboutLink[]): AboutLink[] =>
  links.filter((l) => /^https?:\/\/\S+$/.test(l.href.trim()));
