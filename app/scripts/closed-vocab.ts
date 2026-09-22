/**
 * Closed Vocabulary check (lint E1 — ADR-0004, ADR-0009).
 *
 * A word in a Summary or Body facet is allowed when it is:
 *   - plain language (content/wordlists/<lang>.txt — common-word frequency lists),
 *   - a token of a defined Term's name or alias (any language: loanwords are shared),
 *   - listed in content/allowed-words.<lang>.txt,
 *   - or an inflection / Danish compound of the above.
 * English is blocking; Danish is advisory in v1 (ADR-0009).
 *
 * Run `tsx scripts/vocab-report.ts` for a frequency report of unknown words.
 */
import { readFileSync } from 'node:fs';
import type { TermFrontmatter } from '../src/schema';

type Lang = 'en' | 'da';
const LANGS: Lang[] = ['en', 'da'];
const FACETS = ['formal', 'plain', 'inPractice', 'whyItMatters'] as const;

const readSet = (path: string) =>
  new Set(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*/, '').trim().split(/\s+/)[0]?.toLowerCase())
      .filter((w): w is string => Boolean(w)),
  );

const SUFFIXES: Record<Lang, string[]> = {
  en: [
    "'s",
    's',
    'es',
    'ed',
    'd',
    'ing',
    'ly',
    'er',
    'ers',
    'ness',
    'able',
    'ably',
    'ally',
    'al',
    'ment',
    'ful',
  ],
  da: ['ernes', 'erne', 'ens', 'ets', 'en', 'et', 'ne', 'er', 'es', 'e', 's', 'r', 't'],
};

const TOKEN = /\p{L}[\p{L}'’-]*/gu;
export const tokenize = (text: string) =>
  (text.match(TOKEN) ?? []).map((t) =>
    t
      .toLowerCase()
      .replace(/[’']s$/, '')
      .replace(/[’']/g, ''),
  );

export type VocabResult = { id: string; lang: Lang; unknown: string[] };

export function checkClosedVocab(terms: Map<string, TermFrontmatter>): VocabResult[] {
  const plain = {
    en: readSet('content/wordlists/en.txt'),
    da: readSet('content/wordlists/da.txt'),
  };
  const allowed = {
    en: readSet('content/allowed-words.en.txt'),
    da: readSet('content/allowed-words.da.txt'),
  };

  // Tokens of every term name, alias and id, in both languages (loanwords are shared).
  const termTokens = new Set<string>();
  for (const [id, t] of terms) {
    for (const part of id.split(/[/-]/)) termTokens.add(part);
    for (const lang of LANGS) {
      for (const text of [t.term[lang], ...t.aka[lang]]) {
        for (const tok of tokenize(text)) termTokens.add(tok);
      }
    }
  }

  const known = (w: string, lang: Lang) =>
    w.length < 2 || plain[lang].has(w) || termTokens.has(w) || allowed[lang].has(w);

  // English stems also try restoring a dropped -e (approv-ing), undoubling a
  // consonant (label-led) and y->i (worthi-ness).
  const stemCandidates = (stem: string, lang: Lang) => {
    if (lang !== 'en') return [stem];
    const c = [stem, `${stem}e`];
    if (stem.length > 3 && stem.at(-1) === stem.at(-2)) c.push(stem.slice(0, -1));
    if (stem.endsWith('i')) c.push(`${stem.slice(0, -1)}y`);
    return c;
  };

  const knownWithInflection = (w: string, lang: Lang, depth = 0): boolean => {
    if (known(w, lang)) return true;
    for (const suf of SUFFIXES[lang]) {
      if (!w.endsWith(suf) || w.length - suf.length < 3) continue;
      const stem = w.slice(0, -suf.length);
      if (stemCandidates(stem, lang).some((c) => known(c, lang))) return true;
      if (depth < 1 && knownWithInflection(stem, lang, depth + 1)) return true;
    }
    // English negating / repeating prefixes: un-readable, re-assembling.
    if (lang === 'en' && depth === 0) {
      for (const pre of ['un', 're', 'non', 'dis', 'mis']) {
        if (w.startsWith(pre) && w.length - pre.length >= 4) {
          if (knownWithInflection(w.slice(pre.length), lang, 1)) return true;
        }
      }
    }
    return false;
  };

  // Danish compounds (English is not split — it stays strict): split into two known parts, with an
  // optional linking -s- or -e-.
  const knownCompound = (w: string, lang: Lang) => {
    for (let i = 3; i <= w.length - 3; i++) {
      const left = w.slice(0, i);
      const right = w.slice(i);
      const leftOk =
        knownWithInflection(left, lang) ||
        ((left.endsWith('s') || left.endsWith('e')) && known(left.slice(0, -1), lang));
      if (leftOk && (knownWithInflection(right, lang) || knownCompound(right, lang))) return true;
    }
    return false;
  };

  const isAllowed = (w: string, lang: Lang) => {
    if (knownWithInflection(w, lang)) return true;
    if (w.includes('-')) return w.split('-').every((p) => !p || isAllowed(p, lang));
    return lang === 'da' && knownCompound(w, lang);
  };

  const results: VocabResult[] = [];
  for (const [id, t] of terms) {
    for (const lang of LANGS) {
      const texts = [t.summary[lang], ...FACETS.map((f) => t.body[f][lang])];
      const unknown = new Set<string>();
      for (const text of texts) {
        for (const tok of tokenize(text)) if (!isAllowed(tok, lang)) unknown.add(tok);
      }
      if (unknown.size) results.push({ id, lang, unknown: [...unknown].sort() });
    }
  }
  return results;
}
