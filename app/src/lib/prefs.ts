export const RECENT_KEY = 'atlas.recent';
export const RECENT_MAX = 8;

export function parseRecent(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function pushRecent(list: readonly string[], id: string, max = RECENT_MAX): string[] {
  return [id, ...list.filter((x) => x !== id)].slice(0, max);
}

export const LANG_SUGGEST_KEY = 'atlas.langSuggest.dismissed';

export const THEME_KEY = 'atlas.theme';
export type ThemeChoice = 'system' | 'light' | 'dark';

export function parseTheme(raw: string | null): ThemeChoice {
  return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export function resolveTheme(choice: ThemeChoice, osPrefersLight: boolean): 'light' | 'dark' {
  if (choice !== 'system') return choice;
  return osPrefersLight ? 'light' : 'dark';
}

export function prefersDanish(languages: readonly string[]): boolean {
  for (const l of languages) {
    const base = l.toLowerCase().split('-')[0];
    if (base === 'da') return true;
    if (base === 'en') return false;
  }
  return false;
}

export function isCurrentNav(pathname: string, href: string, home: string): boolean {
  const norm = (p: string) => {
    const s = p.replace(/index\.html$/, '');
    return s.endsWith('/') ? s : `${s}/`;
  };
  const path = norm(pathname);
  const target = norm(href);
  return target === norm(home) ? path === target : path.startsWith(target);
}

export function isTypingTarget(el: { tagName?: string; isContentEditable?: boolean } | null) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName ?? '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function isSearchShortcut(e: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}) {
  return e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey;
}
