export const arrowDir = (key: string): 1 | -1 | 0 =>
  key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;

type KeyTarget = { tagName: string; isContentEditable?: boolean } | null | undefined;

export const isField = (t: KeyTarget): boolean =>
  !!t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);

export const isTyping = (t: KeyTarget): boolean => isField(t) || !!t?.isContentEditable;

export function tabKeyTarget(key: string, current: number, count: number): number | null {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const dir = arrowDir(key);
  if (!dir) return null;
  return (current + dir + count) % count;
}
