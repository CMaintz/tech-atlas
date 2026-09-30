/**
 * What a key press means to a keyboard-driven widget (the term panel's Previous/Next and
 * its facet tabs): pure, so the rules are testable without a DOM.
 */

/** ←/→ as a direction: 1 (right), -1 (left) or 0 (any other key). */
export const arrowDir = (key: string): 1 | -1 | 0 =>
  key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;

/** Something with a tag name, and perhaps editable content (an element, or a stand-in). */
type KeyTarget = { tagName: string; isContentEditable?: boolean } | null | undefined;

/** A form field (input, textarea, select) — it owns the keys typed into it. */
export const isField = (t: KeyTarget): boolean =>
  !!t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);

/** A form field or editable content: the arrow keys move its caret, not the panel. */
export const isTyping = (t: KeyTarget): boolean => isField(t) || !!t?.isContentEditable;

/**
 * The tab a tablist key moves to (WAI-ARIA tabs): ←/→ wrap through `count` tabs from
 * `current`, Home/End jump to the ends. Null for any other key.
 */
export function tabKeyTarget(key: string, current: number, count: number): number | null {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const dir = arrowDir(key);
  if (!dir) return null;
  return (current + dir + count) % count;
}
