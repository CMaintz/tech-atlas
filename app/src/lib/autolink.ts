export type Lang = 'en' | 'da';
export type LinkableTerm = {
  id: string;
  term: { en: string; da: string };
  aka?: { en: string[]; da: string[] };
};
export type Segment = { text: string; id?: string };

const SUFFIX: Record<Lang, string> = {
  en: "(?:'s|’s|es|s)?",
  da: '(?:ernes|erne|ens|ets|en|et|ne|er|n|t|s|e)?',
};

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

const SAME_DOMAIN_ONLY: Record<Lang, Set<string>> = {
  en: new Set(['attention', 'feature', 'label', 'recall', 'sensitivity', 'token']),
  da: new Set(['feature', 'label', 'mærkat', 'token']),
};

const domainOf = (id: string) => id.split('/')[0];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const namesOf = (label: string) => {
  const m = label.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? [m[1], ...m[2].split('/').map((x) => x.trim())] : [label];
};

function nameIndex(terms: LinkableTerm[], lang: Lang): Map<string, string[]> {
  const idsOf = new Map<string, string[]>();
  for (const t of terms) {
    const labels = [t.term[lang], ...(t.aka?.[lang] ?? []), ...(lang === 'da' ? [t.term.en] : [])];
    for (const name of labels.flatMap(namesOf)) {
      const key = name.trim().toLowerCase();
      const ids = idsOf.get(key) ?? [];
      if (key.length >= 3 && !ids.includes(t.id)) idsOf.set(key, [...ids, t.id]);
    }
  }
  return idsOf;
}

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

function linkClaimer(idsOf: Map<string, string[]>, lang: Lang) {
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

  const link = (text: string, opts: LinkOpts = {}): Segment[] => {
    if (!pattern) return [{ text }];
    const hits = [...text.matchAll(pattern)]
      .map((m) => ({ m, id: claim(m, opts) }))
      .filter((h): h is Hit => h.id !== undefined);
    return segmentsOf(text, hits);
  };

  const mentions = (texts: string[], self?: string) => {
    const seen = new Set<string>();
    for (const text of texts) link(text, { self, seen });
    return [...seen];
  };

  return { link, mentions };
}
