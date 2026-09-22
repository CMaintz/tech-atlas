/**
 * Closed Vocabulary report: which unknown words recur most. Use it to decide
 * whether a word should become a Term, go in allowed-words, or be rephrased away.
 */
import { checkClosedVocab } from './closed-vocab';
import { loadTerms } from './load-terms';

const results = checkClosedVocab(loadTerms().terms);
for (const lang of ['en', 'da'] as const) {
  const hits = results.filter((r) => r.lang === lang);
  const counts = new Map<string, number>();
  for (const r of hits) for (const w of r.unknown) counts.set(w, (counts.get(w) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  console.log(`\n[${lang}] ${hits.length} terms with unknown words, ${top.length} distinct words`);
  console.log(top.map(([w, n]) => `${w}(${n})`).join('  '));
}
