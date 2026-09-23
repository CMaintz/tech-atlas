/**
 * Search intents (the "search architecture" of the product spec): a query can ask
 * to compare two terms, find the route between them, or list what comes before one.
 * Pure — returns the raw phrases; the caller resolves them to terms.
 */
export type Intent =
  | { kind: 'compare'; a: string; b: string }
  | { kind: 'route'; a: string; b: string }
  | { kind: 'before'; a: string };

const PATTERNS: { kind: Intent['kind']; re: RegExp }[] = [
  {
    kind: 'before',
    re: /^(?:what (?:do i need|should i (?:know|learn|understand))(?: to know)? before|prerequisites? (?:of|for)|before|hvad (?:skal|bør) jeg (?:vide|kunne|forstå) før|forudsætninger for|før)\s+(.+?)\??$/i,
  },
  {
    kind: 'route',
    re: /^how (?:are|is|do(?:es)?)\s+(.+?)\s+(?:and|og)\s+(.+?)\s+(?:related|connected)\??$/i,
  },
  { kind: 'route', re: /^hvordan (?:hænger|er)\s+(.+?)\s+og\s+(.+?)\s+(?:sammen|forbundet)\??$/i },
  { kind: 'route', re: /^(?:from|fra)\s+(.+?)\s+(?:to|til)\s+(.+?)\??$/i },
  { kind: 'route', re: /^(.+?)\s*(?:→|->)\s*(.+?)$/ },
  {
    kind: 'compare',
    re: /^(?:compare\s+|sammenlign\s+)?(.+?)\s+(?:vs\.?|versus)\s+(.+?)\??$/i,
  },
  // "mod" is everyday Danish ("beskyttelse mod phishing"), so only after "sammenlign".
  { kind: 'compare', re: /^sammenlign\s+(.+?)\s+mod\s+(.+?)\??$/i },
  { kind: 'compare', re: /^(?:compare|sammenlign)\s+(.+?)\s+(?:and|with|og|med)\s+(.+?)\??$/i },
];

export function parseIntent(query: string): Intent | null {
  const q = query.trim();
  for (const { kind, re } of PATTERNS) {
    const m = q.match(re);
    if (!m) continue;
    if (kind === 'before') return { kind, a: m[1].trim() };
    if (m[1].trim() && m[2].trim()) return { kind, a: m[1].trim(), b: m[2].trim() };
  }
  return null;
}
