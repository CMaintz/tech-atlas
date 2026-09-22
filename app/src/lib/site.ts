export const LANGS = ['en', 'da'] as const;
export type Lang = (typeof LANGS)[number];

const rawBase = import.meta.env.BASE_URL;
/** Always ends in '/'. GitHub Pages serves the site under /tech-atlas/. */
export const BASE = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

/** Base-path-aware URL for an internal path. */
export const url = (path = '') => BASE + path.replace(/^\//, '');

export const termUrl = (lang: Lang, id: string) => url(`${lang}/terms/${id}/`);

/** Swap the language segment of the current pathname. */
export const swapLang = (pathname: string, to: Lang) =>
  pathname.startsWith(BASE + 'en') || pathname.startsWith(BASE + 'da')
    ? BASE + to + pathname.slice(BASE.length + 2)
    : url(`${to}/`);

export const UI = {
  en: {
    tagline: 'A bilingual technical dictionary that reads as a knowledge graph.',
    index: 'Index',
    compare: 'Compare',
    search: 'Search terms, aliases, definitions…',
    noResults: 'No matches',
    connections: 'Connections',
    relationships: 'Relationships',
    sources: 'Sources',
    aka: 'Also known as',
    readArticle: 'Read the full article →',
    backToTerm: '← Back to the entry',
    draft: 'Draft — this entry has not been reviewed yet.',
    compareTitle: "Don't confuse these",
    compareIntro: 'Pairs that are easy to mix up, side by side.',
    whyDiffer: 'Why they differ',
    shared: 'Shared connections',
    versus: 'vs',
    terms: 'terms',
    formal: 'Formal',
    plain: 'In plain English',
    inPractice: 'In practice',
    whyItMatters: 'Why it matters',
  },
  da: {
    tagline: 'En tosproget teknisk ordbog, der læses som en vidensgraf.',
    index: 'Indeks',
    compare: 'Sammenlign',
    search: 'Søg i begreber, synonymer, definitioner…',
    noResults: 'Ingen resultater',
    connections: 'Forbindelser',
    relationships: 'Relationer',
    sources: 'Kilder',
    aka: 'Også kendt som',
    readArticle: 'Læs hele artiklen →',
    backToTerm: '← Tilbage til opslaget',
    draft: 'Kladde — dette opslag er endnu ikke gennemgået.',
    compareTitle: 'Forveksl ikke disse',
    compareIntro: 'Begrebspar, der er lette at blande sammen, side om side.',
    whyDiffer: 'Hvorfor de er forskellige',
    shared: 'Fælles forbindelser',
    versus: 'vs.',
    terms: 'begreber',
    formal: 'Formelt',
    plain: 'Forklaret enkelt',
    inPractice: 'I praksis',
    whyItMatters: 'Hvorfor det betyder noget',
  },
} as const;

export const DOMAIN_LABELS: Record<string, Record<Lang, string>> = {
  security: { en: 'Security', da: 'Sikkerhed' },
  cs: { en: 'Computer science', da: 'Datalogi' },
  ai: { en: 'AI', da: 'AI' },
  platform: { en: 'Platform', da: 'Platform' },
};

export const CLUSTER_LABELS: Record<string, Record<Lang, string>> = {
  fundamentals: { en: 'Fundamentals', da: 'Grundbegreber' },
  awareness: { en: 'People, culture & awareness', da: 'Mennesker, kultur og awareness' },
  controls: { en: 'Controls & technical basics', da: 'Kontroller og tekniske grundbegreber' },
  'risk-management': { en: 'Risk management', da: 'Risikostyring' },
  compliance: { en: 'Compliance & regulation', da: 'Compliance, styring og lovgivning' },
  'incident-response': { en: 'Incidents & continuity', da: 'Beredskab og hændelser' },
  networking: { en: 'Networking', da: 'Netværk' },
  os: { en: 'Operating systems', da: 'Styresystemer' },
  identity: { en: 'Identity & access', da: 'Identitet og adgang' },
  cryptography: { en: 'Cryptography', da: 'Kryptografi' },
};
