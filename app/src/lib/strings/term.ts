import type { Lang } from '../lang';

/**
 * Term entries: the term page, disambiguation and the review queue.
 * A slice of `UI` (site.ts), which merges every area into one table per language.
 */
export const UI_TERM = {
  en: {
    learnFirst: 'What to learn first',
    learnFirstIntro: 'Everything this builds on, foundations first.',
    openExplorer: 'Open in the explorer →',
    connections: 'Connections',
    relationships: 'Relationships',
    mentionedIn: 'Mentioned in',
    sources: 'Sources',
    aka: 'Also known as',
    readArticle: 'Read the full article →',
    backToTerm: '← Back to the entry',
    draft: 'Draft - this entry has not been reviewed yet.',
    disambiguationTitle: '“{name}” - several meanings',
    disambiguationIntro:
      '“{name}” names different things in different fields. Pick the one you mean.',
    otherMeanings: '“{name}” also means something else in another field - see every meaning →',
    formal: 'Formal',
    plain: 'In plain English',
    inPractice: 'In practice',
    whyItMatters: 'Why it matters',
    terms: 'terms',
    review: 'Review queue',
    reviewIntro:
      'Every entry was drafted by an AI and stays marked as a draft until a person has checked it. To approve one, open it on GitHub and change draft: true to draft: false.',
    reviewed: 'reviewed',
    editOnGitHub: 'Edit on GitHub',
  },
  da: {
    learnFirst: 'Hvad du bør lære først',
    learnFirstIntro: 'Alt det, dette bygger på - grundlaget først.',
    openExplorer: 'Åbn i udforskeren →',
    connections: 'Forbindelser',
    relationships: 'Relationer',
    mentionedIn: 'Nævnt i',
    sources: 'Kilder',
    aka: 'Også kendt som',
    readArticle: 'Læs hele artiklen →',
    backToTerm: '← Tilbage til opslaget',
    draft: 'Kladde - dette opslag er endnu ikke gennemgået.',
    disambiguationTitle: '“{name}” - flere betydninger',
    disambiguationIntro:
      '“{name}” betyder forskellige ting inden for forskellige fagområder. Vælg den, du mener.',
    otherMeanings:
      '“{name}” betyder også noget andet inden for et andet fagområde - se alle betydninger →',
    formal: 'Formelt',
    plain: 'Forklaret enkelt',
    inPractice: 'I praksis',
    whyItMatters: 'Hvorfor det betyder noget',
    terms: 'begreber',
    review: 'Gennemgangskø',
    reviewIntro:
      'Alle opslag er udkast skrevet af en AI og forbliver markeret som kladde, indtil et menneske har tjekket dem. Godkend et opslag ved at åbne det på GitHub og ændre draft: true til draft: false.',
    reviewed: 'gennemgået',
    editOnGitHub: 'Redigér på GitHub',
  },
} as const;

/** The term page's deep dive and provenance note. `da` must carry every key `en` has. */
const DEEP_EN = {
  deepDive: 'Technical deep dive',
  sourcesFurther: 'Sources & further reading',
  provenanceTitle: 'Where this data comes from',
  provenanceDraft:
    'This entry was drafted by an AI from the sources above and has not yet been checked by a person. Treat it as a starting point, and check anything important against the sources.',
  provenanceReviewed:
    'This entry was drafted by an AI from the sources above and has since been reviewed by a person.',
  reviewQueue: 'See the review queue',
  suggestFix: 'Suggest a correction on GitHub',
  howTo: 'How to put it into practice',
  howToIntro: 'The usual steps, in order. Adapt them to your organisation.',
  pitfalls: 'Common pitfalls',
  guides: 'Good guides',
  opensNewTab: '(opens in a new tab)',
  guideOtherLang: 'in Danish',
} as const;

export const DEEP_UI: Record<Lang, Record<keyof typeof DEEP_EN, string>> = {
  en: DEEP_EN,
  da: {
    deepDive: 'Teknisk uddybning',
    sourcesFurther: 'Kilder og videre læsning',
    provenanceTitle: 'Hvor dataene kommer fra',
    provenanceDraft:
      'Dette opslag er skrevet af en AI ud fra kilderne ovenfor og er endnu ikke gennemgået af et menneske. Brug det som udgangspunkt, og tjek alt vigtigt mod kilderne.',
    provenanceReviewed:
      'Dette opslag er skrevet af en AI ud fra kilderne ovenfor og er siden gennemgået af et menneske.',
    reviewQueue: 'Se gennemgangskøen',
    suggestFix: 'Foreslå en rettelse på GitHub',
    howTo: 'Sådan kommer du i gang',
    howToIntro: 'De typiske trin i rækkefølge. Tilpas dem til jeres organisation.',
    pitfalls: 'Typiske faldgruber',
    guides: 'Gode vejledninger',
    opensNewTab: '(åbner i en ny fane)',
    guideOtherLang: 'på engelsk',
  },
};
