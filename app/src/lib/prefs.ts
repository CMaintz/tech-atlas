/**
 * Small browser-side helpers for site chrome (A62–A64), kept pure so they can be
 * unit-tested: recently viewed terms, the Danish-language suggestion and the "/"
 * search shortcut.
 */

export const RECENT_KEY = 'atlas.recent';
export const RECENT_MAX = 8;

/** Parse the stored recently-viewed list; anything malformed → empty. */
export function parseRecent(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Put `id` first, drop an earlier visit to it, keep at most `max`. */
export function pushRecent(list: readonly string[], id: string, max = RECENT_MAX): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

export const LANG_SUGGEST_KEY = 'atlas.langSuggest.dismissed';

/**
 * Whether the reader's browser ranks Danish above English — `navigator.languages`
 * in preference order. Danish must come first among the two site languages.
 */
export function prefersDanish(languages: readonly string[]): boolean {
  for (const l of languages) {
    const base = l.toLowerCase().split('-')[0];
    if (base === 'da') return true;
    if (base === 'en') return false;
  }
  return false;
}

/** Whether a keypress lands in something the reader is typing into. */
export function isTypingTarget(el: { tagName?: string; isContentEditable?: boolean } | null) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Whether a keydown is the plain "/" search shortcut. */
export function isSearchShortcut(e: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}) {
  return e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey;
}
