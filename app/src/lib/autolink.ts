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
 * car "recall", paying "attention", data "sensitivity". They link only on
 * pages in the same domain as the term. Fuller names ("attention mechanism",
 * "true positive rate") are unaffected. Each entry is backed by a real false
 * link found in the content (see autolink.test.ts).
 */
const SAME_DOMAIN_ONLY: Record<Lang, Set<string>> = {
  en: new Set(['attention', 'recall', 'sensitivity', 'token']),
  da: new Set(['token']),
};

const domainOf = (id: string) => id.split('/')[0];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "Intrusion detection system (IDS)" → ["Intrusion detection system", "IDS"]. */
export const namesOf = (label: string) => {
  const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? [m[1], ...m[2].split('/').map((x) => x.trim())] : [label];
};

export function makeLinker(terms: LinkableTerm[], lang: Lang) {
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
  const alternation = [...idsOf.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');
  const pattern = alternation
    ? new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})${SUFFIX[lang]}(?![\\p{L}\\p{N}])`, 'giu')
    : null;

  /** A name shared across domains (ADR-0003) resolves to the page's own domain, else stays unlinked. */
  const resolve = (name: string, self?: string) => {
    const ids = idsOf.get(name.toLowerCase()) ?? [];
    if (ids.length === 1) return ids[0];
    const own = self ? ids.filter((id) => domainOf(id) === domainOf(self)) : [];
    return own.length === 1 ? own[0] : undefined;
  };

  /**
   * Split text into plain and linked segments. `seen` carries across calls so a
   * term is linked only at its first mention on a page; `self` is never linked.
   */
  const link = (text: string, opts: { self?: string; seen?: Set<string> } = {}): Segment[] => {
    if (!pattern) return [{ text }];
    const out: Segment[] = [];
    let last = 0;
    for (const m of text.matchAll(pattern)) {
      if (STOP[lang].has(m[0].toLowerCase())) continue;
      const id = resolve(m[1], opts.self);
      if (!id || id === opts.self || opts.seen?.has(id)) continue;
      const sameDomain = opts.self !== undefined && domainOf(opts.self) === domainOf(id);
      if (SAME_DOMAIN_ONLY[lang].has(m[1].toLowerCase()) && !sameDomain) continue;
      opts.seen?.add(id);
      if (m.index > last) out.push({ text: text.slice(last, m.index) });
      out.push({ text: m[0], id });
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push({ text: text.slice(last) });
    return out;
  };

  /** Every other term mentioned anywhere in these texts. */
  const mentions = (texts: string[], self?: string) => {
    const seen = new Set<string>();
    for (const text of texts) link(text, { self, seen });
    return [...seen];
  };

  return { link, mentions };
}
