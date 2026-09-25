/**
 * UI strings for the open-data, feed, A–Z, 404 and "Continue learning" surfaces
 * (A68–A73). Kept apart from `UI` in site.ts so those pages don't churn the main
 * string table.
 */
import type { Lang } from './site';

export const UI_EXTRA = {
  en: {
    data: 'Data',
    dataTitle: 'Data & downloads',
    dataIntro:
      'Everything in Atlas is open data. Download the whole dictionary, a single term, or a study deck, and reuse it under the content licence.',
    dataLicence: 'Content licence',
    dataLicenceText:
      'The dictionary content is licensed CC BY-SA 4.0: reuse and adapt it freely, credit “Atlas” with a link, and share adaptations under the same licence. The code is MIT.',
    dataFormat: 'Format',
    dataWhat: 'What',
    dataAll: 'Every term, both languages, with edges, sources and depth',
    dataOne: 'One term: the same record for a single term, e.g.',
    dataCsv: 'Every term as a spreadsheet: names, aliases, summaries, links (both languages)',
    dataAnki:
      'A flash-card deck for Anki: the term on the front; summary, plain meaning and link on the back. In Anki: File → Import.',
    dataGraph: 'The derived graph: nodes with depth and cluster, typed links with visual weight',
    dataFeed: 'New terms as an RSS feed',
    dataThisTerm: 'This term as JSON',
    feedTitle: 'Atlas: new terms',
    feedDescription: 'Terms newly added to Atlas, the bilingual technical dictionary.',
    azTitle: 'All terms A–Z',
    azIntro: '{n} terms, alphabetically.',
    notFoundAz: 'Browse all terms A–Z',
    licenceFooter: 'Content CC BY-SA 4.0',
    tiers: {
      standard: 'Standards & official texts',
      'official-doc': 'Official documentation',
      'course-material': 'Course material',
      reference: 'Reference works',
      textbook: 'Textbooks',
      other: 'Other',
    },
  },
  da: {
    data: 'Data',
    dataTitle: 'Data og downloads',
    dataIntro:
      'Alt i Atlas er åbne data. Hent hele ordbogen, et enkelt begreb eller et studiesæt, og genbrug det under indholdslicensen.',
    dataLicence: 'Indholdslicens',
    dataLicenceText:
      'Ordbogens indhold er licenseret under CC BY-SA 4.0: du må frit genbruge og bearbejde det, når du krediterer “Atlas” med et link og deler bearbejdninger under samme licens. Koden er MIT.',
    dataFormat: 'Format',
    dataWhat: 'Indhold',
    dataAll: 'Alle begreber på begge sprog med relationer, kilder og dybde',
    dataOne: 'Ét begreb: samme post for et enkelt begreb, fx',
    dataCsv: 'Alle begreber som regneark: navne, synonymer, resuméer og links (begge sprog)',
    dataAnki:
      'Et kortsæt til Anki: begrebet på forsiden; resumé, forklaring og link på bagsiden. I Anki: Filer → Importér.',
    dataGraph: 'Den afledte graf: knuder med dybde og klynge, typede relationer med visuel vægt',
    dataFeed: 'Nye begreber som RSS-feed',
    dataThisTerm: 'Dette begreb som JSON',
    feedTitle: 'Atlas: nye begreber',
    feedDescription: 'Begreber, der er føjet til Atlas, den tosprogede tekniske ordbog.',
    azTitle: 'Alle begreber A–Å',
    azIntro: '{n} begreber i alfabetisk rækkefølge.',
    notFoundAz: 'Se alle begreber A–Å',
    licenceFooter: 'Indhold CC BY-SA 4.0',
    tiers: {
      standard: 'Standarder og officielle tekster',
      'official-doc': 'Officiel dokumentation',
      'course-material': 'Kursusmateriale',
      reference: 'Opslagsværker',
      textbook: 'Lærebøger',
      other: 'Andet',
    },
  },
} as const satisfies Record<Lang, unknown>;

/** Source tiers, best first (SPEC §5, D11) — the order "Continue learning" uses. */
export const TIER_ORDER = [
  'standard',
  'official-doc',
  'course-material',
  'reference',
  'textbook',
  'other',
] as const;
