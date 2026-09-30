/** The site's two languages, as both functions accept them. */
export type Lang = "en" | "da";

export const isLang = (value: unknown): value is Lang =>
  value === "en" || value === "da";

export const LANG_ERROR = '`lang` must be "en" or "da"';

/** LANG_ERROR unless `value` is a language. */
export const langError = (value: unknown) => isLang(value) ? null : LANG_ERROR;
