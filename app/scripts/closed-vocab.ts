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

type WordSets = Record<Lang, Set<string>>;

/** Tokens of every term name, alias and id, in both languages (loanwords are shared). */
function termTokensOf(terms: Map<string, TermFrontmatter>): Set<string> {
  const tokens = new Set<string>();
  for (const [id, t] of terms) {
    for (const part of id.split(/[/-]/)) tokens.add(part);
    for (const lang of LANGS) {
      for (const text of [t.term[lang], ...t.aka[lang]]) {
        for (const tok of tokenize(text)) tokens.add(tok);
      }
    }
  }
  return tokens;
}

// English stems also try restoring a dropped -e (approv-ing), undoubling a
// consonant (label-led) and y->i (worthi-ness).
function stemCandidates(stem: string, lang: Lang): string[] {
  if (lang !== 'en') return [stem];
  const c = [stem, `${stem}e`];
  if (stem.length > 3 && stem.at(-1) === stem.at(-2)) c.push(stem.slice(0, -1));
  if (stem.endsWith('i')) c.push(`${stem.slice(0, -1)}y`);
  return c;
}

/** What is left of `w` after each suffix it ends in, keeping a stem of 3+ letters. */
const inflectionStems = (w: string, lang: Lang) =>
  SUFFIXES[lang]
    .filter((suf) => w.endsWith(suf) && w.length - suf.length >= 3)
    .map((suf) => w.slice(0, -suf.length));

/** The words a Summary or Body may use, and the inflections and compounds of them. */
class Vocabulary {
  private plain: WordSets = {
    en: readSet('content/wordlists/en.txt'),
    da: readSet('content/wordlists/da.txt'),
  };
  private allowed: WordSets = {
    en: readSet('content/allowed-words.en.txt'),
    da: readSet('content/allowed-words.da.txt'),
  };

  constructor(private termTokens: Set<string>) {}

  isAllowed(w: string, lang: Lang): boolean {
    if (this.knownWithInflection(w, lang)) return true;
    if (w.includes('-')) return w.split('-').every((p) => !p || this.isAllowed(p, lang));
    return lang === 'da' && this.knownCompound(w, lang);
  }

  private known(w: string, lang: Lang) {
    return (
      w.length < 2 || this.plain[lang].has(w) || this.termTokens.has(w) || this.allowed[lang].has(w)
    );
  }

  private knownWithInflection(w: string, lang: Lang, depth = 0): boolean {
    if (this.known(w, lang)) return true;
    if (inflectionStems(w, lang).some((stem) => this.knownStem(stem, lang, depth))) return true;
    return lang === 'en' && depth === 0 && this.knownWithPrefix(w, lang);
  }

  /** A stem is known as is (or restored), or, one level deep, as a further inflection. */
  private knownStem(stem: string, lang: Lang, depth: number): boolean {
    if (stemCandidates(stem, lang).some((c) => this.known(c, lang))) return true;
    return depth < 1 && this.knownWithInflection(stem, lang, depth + 1);
  }

  // English negating / repeating prefixes: un-readable, re-assembling.
  private knownWithPrefix(w: string, lang: Lang) {
    return ['un', 're', 'non', 'dis', 'mis'].some(
      (pre) =>
        w.startsWith(pre) &&
        w.length - pre.length >= 4 &&
        this.knownWithInflection(w.slice(pre.length), lang, 1),
    );
  }

  // Danish compounds (English is not split — it stays strict): split into two known parts, with an
  // optional linking -s- or -e-.
  private knownCompound(w: string, lang: Lang): boolean {
    for (let i = 3; i <= w.length - 3; i++) {
      const left = w.slice(0, i);
      const right = w.slice(i);
      const leftOk =
        this.knownWithInflection(left, lang) ||
        ((left.endsWith('s') || left.endsWith('e')) && this.known(left.slice(0, -1), lang));
      if (leftOk && (this.knownWithInflection(right, lang) || this.knownCompound(right, lang)))
        return true;
    }
    return false;
  }
}

/** The words of a term's Summary and Body facets (one language) the vocabulary lacks, sorted. */
function unknownWords(t: TermFrontmatter, lang: Lang, vocab: Vocabulary): string[] {
  const texts = [t.summary[lang], ...FACETS.map((f) => t.body[f][lang])];
  const unknown = new Set<string>();
  for (const text of texts) {
    for (const tok of tokenize(text)) if (!vocab.isAllowed(tok, lang)) unknown.add(tok);
  }
  return [...unknown].sort();
}

export function checkClosedVocab(terms: Map<string, TermFrontmatter>): VocabResult[] {
  const vocab = new Vocabulary(termTokensOf(terms));
  const results: VocabResult[] = [];
  for (const [id, t] of terms) {
    for (const lang of LANGS) {
      const unknown = unknownWords(t, lang, vocab);
      if (unknown.length) results.push({ id, lang, unknown });
    }
  }
  return results;
}
