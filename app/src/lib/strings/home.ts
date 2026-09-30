/**
 * The home page: hero, search box and browse-by-domain.
 * A slice of `UI` (site.ts), which merges every area into one table per language.
 */
export const UI_HOME = {
  en: {
    heroLead:
      'Look up a technical term and see where it sits: what it builds on, what it is easily confused with, and what it leads to. Every entry is written in plain language, in English and Danish.',
    freeForever: 'Free forever. No ads, no paywall, no tracking. Just a passion project.',
    search: 'Search terms, aliases, definitions…',
    searchHint: 'Tip: press / anywhere to search.',
    noResults: 'No matches',
    semanticByMeaning: 'by meaning',
    intentCompare: 'Compare {a} and {b}',
    intentRoute: 'Show the route from {a} to {b}',
    intentBefore: 'What to learn before {a}',
    searchDisambiguation: '“{name}” has {n} meanings - choose one',
    browseDomains: 'Browse by domain',
    termCount: '{n} terms',
    clusterCount: '{n} clusters',
    randomTerm: 'Random term',
    recentlyViewed: 'Recently viewed',
    clearRecent: 'Clear',
    indexTitle: 'All terms',
  },
  da: {
    heroLead:
      'Slå et teknisk begreb op, og se hvor det hører hjemme: hvad det bygger på, hvad det let forveksles med, og hvad det fører videre til. Alle opslag er skrevet i et enkelt sprog, på dansk og engelsk.',
    freeForever:
      'Gratis for altid. Ingen reklamer, ingen betalingsmur, ingen sporing. Bare et hjerteprojekt.',
    search: 'Søg i begreber, synonymer, definitioner…',
    searchHint: 'Tip: tryk / hvor som helst for at søge.',
    noResults: 'Ingen resultater',
    semanticByMeaning: 'efter betydning',
    intentCompare: 'Sammenlign {a} og {b}',
    intentRoute: 'Vis vejen fra {a} til {b}',
    intentBefore: 'Hvad du bør lære før {a}',
    searchDisambiguation: '“{name}” har {n} betydninger - vælg én',
    browseDomains: 'Gå på opdagelse efter domæne',
    termCount: '{n} begreber',
    clusterCount: '{n} klynger',
    randomTerm: 'Tilfældigt begreb',
    recentlyViewed: 'Senest set',
    clearRecent: 'Ryd',
    indexTitle: 'Alle begreber',
  },
} as const;
