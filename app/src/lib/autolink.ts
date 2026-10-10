/**
 * Auto-linking (SPEC §4: "Terms auto-link") and Mentions (SPEC §6: untyped edges
 * harvested from prose). Pure — shared by the site, the build script and lint.
 */
export type Lang = 'en' | 'da';
export type LinkableTerm = {
  id: string;
  term: { en: string; da: string };
  aka?: { en: string[]; da: string[] };
};
export type Segment = { text: string; id?: string };

/** Inflections a name may carry and still count as a mention (longest first). */
const SUFFIX: Record<Lang, string> = {
  en: "(?:'s|’s|es|s)?",
  da: '(?:ernes|erne|ens|ets|en|et|ne|er|n|t|s|e)?',
};

/**
 * Surface forms never auto-linked: everyday words that happen to spell a term
 * name ("key", a business "process", DA "aktiv" = active, "kontor" = office).
 * The term stays reachable through its fuller names.
 */
const STOP: Record<Lang, Set<string>> = {
  en: new Set(['key', 'keys', 'process', 'processes', 'control', 'controls']),
  da: new Set([
    'key',
    'keys',
    'nøgle',
    'nøgler',
    'nøglen',
    'process',
    'proces',
    'processen',
    'processer',
    'control',
    'controls',
    'kontrol',
    'kontrollen',
    'kontroller',
    'aktiv',
    'aktive',
    'aktivt',
    'kontor',
    'evaluering',
    'evalueringen',
    'samle',
    'samler',
    'samles',
    'samlet',
  ]),
};

/**
 * Names that are the term inside its own domain but an everyday word, or a
 * different concept, outside it: an AI "token" vs an OAuth access token, a
 * car "recall", paying "attention", data "sensitivity", a product "feature", a
 * classification or certification "label". They link only on
 * pages in the same domain as the term. Fuller names ("attention mechanism",
 * "true positive rate") are unaffected. Each entry is backed by a real false
 * link found in the content (see autolink.test.ts).
 */
const SAME_DOMAIN_ONLY: Record<Lang, Set<string>> = {
  en: new Set(['attention', 'feature', 'label', 'recall', 'sensitivity', 'token']),
  da: new Set(['feature', 'label', 'mærkat', 'token']),
};

const domainOf = (id: string) => id.split('/')[0];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Intrusion detection system (IDS)" → ["Intrusion detection system", "IDS"]. */
export const namesOf = (label: string) => {
  const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? [m[1], ...m[2].split('/').map((x) => x.trim())] : [label];
};

/** Every linkable name (lower case, 3+ letters) → the ids of the terms it names. */
export function nameIndex(terms: LinkableTerm[], lang: Lang): Map<string, string[]> {
  const idsOf = new Map<string, string[]>();
  for (const t of terms) {
    // Danish pages also recognise English names — many security terms are loanwords.
    const labels = [t.term[lang], ...(t.aka?.[lang] ?? []), ...(lang === 'da' ? [t.term.en] : [])];
    for (const name of labels.flatMap(namesOf)) {
      const key = name.trim().toLowerCase();
      const ids = idsOf.get(key) ?? [];
      if (key.length >= 3 && !ids.includes(t.id)) idsOf.set(key, [...ids, t.id]);
    }
  }
  return idsOf;
}

/** One regex for every name as a whole word, longest first, allowing `lang`'s inflections. */
function namePattern(names: string[], lang: Lang): RegExp | null {
  const alternation = [...names]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');
  return alternation
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})${SUFFIX[lang]}(?![\\p{L}\\p{N}])`, 'giu')
    : null;
}

type LinkOpts = { self?: string; seen?: Set<string> };
type Hit = { m: RegExpExecArray; id: string };

const sameDomain = (self: string | undefined, id: string) =>
  self !== undefined && domainOf(self) === domainOf(id);

/**
 * The term a match links to on the page about `self`, if any, marked `seen` so it links
 * only once: never an everyday word, the page itself, or a term already linked on it.
 */
function linkClaimer(idsOf: Map<string, string[]>, lang: Lang) {
  /** A name shared across domains (ADR-0003) resolves to the page's own domain, else stays unlinked. */
  const resolve = (name: string, self?: string) => {
    const ids = idsOf.get(name.toLowerCase()) ?? [];
    if (ids.length === 1) return ids[0];
    const own = self ? ids.filter((id) => domainOf(id) === domainOf(self)) : [];
    return own.length === 1 ? own[0] : undefined;
  };
  return (m: RegExpExecArray, { self, seen }: LinkOpts) => {
    if (STOP[lang].has(m[0].toLowerCase())) return undefined;
    const id = resolve(m[1], self);
    if (!id || id === self || seen?.has(id)) return undefined;
    if (SAME_DOMAIN_ONLY[lang].has(m[1].toLowerCase()) && !sameDomain(self, id)) return undefined;
    seen?.add(id);
    return id;
  };
}

/** `text` cut into plain runs around the linked matches `hits`, in order. */
function segmentsOf(text: string, hits: Hit[]): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const { m, id } of hits) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], id });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

export function makeLinker(terms: LinkableTerm[], lang: Lang) {
  const idsOf = nameIndex(terms, lang);
  const pattern = namePattern([...idsOf.keys()], lang);
  const claim = linkClaimer(idsOf, lang);

  /**
   * Split text into plain and linked segments. `seen` carries across calls so a
   * term is linked only at its first mention on a page; `self` is never linked.
   */
  const link = (text: string, opts: LinkOpts = {}): Segment[] => {
    if (!pattern) return [{ text }];
    const hits = [...text.matchAll(pattern)]
      .map((m) => ({ m, id: claim(m, opts) }))
      .filter((h): h is Hit => h.id !== undefined);
    return segmentsOf(text, hits);
  };

  /** Every other term mentioned anywhere in these texts. */
  const mentions = (texts: string[], self?: string) => {
    const seen = new Set<string>();
    for (const text of texts) link(text, { self, seen });
    return [...seen];
  };

  return { link, mentions };
}
