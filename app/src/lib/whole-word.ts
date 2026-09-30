/** Whole-word matching for the content rules: a name counts only as a separate word. */

/** `s` with every regular-expression metacharacter escaped. */
export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether `text` contains `word` as a whole word (case-insensitive, Unicode letters). */
export const containsWord = (text: string, word: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(word)}(?![\\p{L}\\p{N}])`, 'iu').test(text);
