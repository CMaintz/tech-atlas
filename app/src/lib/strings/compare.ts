/**
 * The Compare pages ("Don't confuse these").
 * A slice of `UI` (site.ts), which merges every area into one table per language.
 */
export const UI_COMPARE = {
  en: {
    compareTitle: "Don't confuse these",
    compareIntro: 'Pairs that are easy to mix up, side by side.',
    compareAcross: 'Across domains',
    compareAcrossClusters: 'Across clusters',
    compareFilter: 'Filter pairs',
    compareNone: 'No pairs match.',
    whyDiffer: 'Why they differ',
    shared: 'Shared connections',
    versus: 'vs',
  },
  da: {
    compareTitle: 'Forveksl ikke disse',
    compareIntro: 'Begrebspar, der er lette at blande sammen, side om side.',
    compareAcross: 'På tværs af domæner',
    compareAcrossClusters: 'På tværs af klynger',
    compareFilter: 'Filtrér par',
    compareNone: 'Ingen par passer.',
    whyDiffer: 'Hvorfor de er forskellige',
    shared: 'Fælles forbindelser',
    versus: 'vs.',
  },
} as const;
