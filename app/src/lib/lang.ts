export const LANGS = ['en', 'da'] as const;
export type Lang = (typeof LANGS)[number];

export type Bi = Record<Lang, string>;

export const langParams = () => LANGS.map((lang) => ({ params: { lang } }));
