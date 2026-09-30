/** The site's two languages (ADR-0007). Free of `import.meta.env`, so any module can use it. */
export const LANGS = ['en', 'da'] as const;
export type Lang = (typeof LANGS)[number];

/** One human string in both languages. */
export type Bi = Record<Lang, string>;
