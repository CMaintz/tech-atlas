import type { Bi } from '../lang';
import type { TourStep } from '../tour';

/**
 * The guided tour's buttons and bridges.
 * A slice of `UI` (site.ts), which merges every area into one table per language.
 */
export const UI_TOUR = {
  en: {
    tourStart: 'Take the tour',
    tourWelcomeStart: 'Start the tour',
    tourNotNow: 'Not now',
    tourDontShow: "Don't show this again",
    tourNext: 'Next',
    tourBack: 'Back',
    tourFinish: 'Finish',
    tourClose: 'Close the tour',
    tourStepOf: 'Step {n} of {m}',
    tourContinue: 'Continue the tour ({n}/{m})',
    tourEnd: 'End tour',
    tourBridgeLink: 'This link takes you there - follow it, or press Next.',
    tourBridgeMenu: 'It’s in the menu - open it and follow the link, or press Next.',
  },
  da: {
    tourStart: 'Tag rundvisningen',
    tourWelcomeStart: 'Start rundvisningen',
    tourNotNow: 'Ikke nu',
    tourDontShow: 'Vis ikke igen',
    tourNext: 'Næste',
    tourBack: 'Tilbage',
    tourFinish: 'Afslut',
    tourClose: 'Luk rundvisningen',
    tourStepOf: 'Trin {n} af {m}',
    tourContinue: 'Fortsæt rundvisningen ({n}/{m})',
    tourEnd: 'Afslut rundvisning',
    tourBridgeLink: 'Dette link fører dig derhen - følg det, eller tryk Næste.',
    tourBridgeMenu: 'Det ligger i menuen - åbn den og følg linket, eller tryk Næste.',
  },
} as const;

/** The term and compare pair the guided tour walks through. */
export const TOUR_TERM = 'security/risk';
export const TOUR_PAIR = 'risk-vs-threat';

/**
 * The guided tour. Pages are relative to the language root; anchors are
 * tried in order and fall back to a centred card, so a step survives markup changes.
 * A step on a new page carries `via`: the card that first points at the link there.
 */
export const TOUR_STEPS: TourStep<Bi>[] = [
  {
    page: null,
    anchors: [],
    title: { en: 'Welcome to Atlas', da: 'Velkommen til Atlas' },
    body: {
      en: 'Atlas is a technical dictionary that doubles as a map: every term is linked to the terms it builds on, is confused with, or leads to. This short tour shows you around - it takes about two minutes.',
      da: 'Atlas er en teknisk ordbog, der også er et kort: hvert begreb er forbundet med de begreber, det bygger på, forveksles med eller fører videre til. Denne korte rundvisning viser dig rundt - den tager cirka to minutter.',
    },
  },
  {
    page: '',
    anchors: ['#search'],
    via: { en: 'Next: the home page', da: 'Næste: forsiden' },
    title: { en: 'Search - or ask', da: 'Søg - eller spørg' },
    body: {
      en: 'Search names, abbreviations and synonyms in both languages; small typos are fine. It also understands intents - “risk vs threat” compares two terms, “before zero trust” lists what to learn first - and whole questions are searched by meaning. Press / anywhere to jump here.',
      da: 'Søg i navne, forkortelser og synonymer på begge sprog; små stavefejl gør ikke noget. Feltet forstår også hensigter - “risiko vs trussel” sammenligner to begreber, “før zero trust” viser, hvad du bør lære først - og hele spørgsmål søges efter betydning. Tryk / hvor som helst for at hoppe hertil.',
    },
  },
  {
    page: '',
    anchors: ['#browse'],
    title: { en: 'Browse by domain', da: 'Gå på opdagelse efter domæne' },
    body: {
      en: 'Prefer to wander? Start from a domain, pick a random term, or pick up where you left off under “Recently viewed”. The full index follows below.',
      da: 'Vil du hellere gå på opdagelse? Start fra et domæne, vælg et tilfældigt begreb, eller fortsæt, hvor du slap, under “Senest set”. Hele indekset følger nedenfor.',
    },
  },
  {
    page: `terms/${TOUR_TERM}/`,
    anchors: ['#facets'],
    via: { en: 'Next: an entry - Risk', da: 'Næste: et opslag - Risiko' },
    title: { en: 'Four ways to explain one term', da: 'Fire måder at forklare ét begreb' },
    body: {
      en: 'Every entry has four facets: a formal definition, a plain-language one, what it looks like in practice, and why it matters. Underlined words are other entries - follow them.',
      da: 'Hvert opslag har fire facetter: en formel definition, en enkel forklaring, hvordan det ser ud i praksis, og hvorfor det betyder noget. Understregede ord er andre opslag - følg dem.',
    },
  },
  {
    page: `terms/${TOUR_TERM}/`,
    anchors: ['#learn-first'],
    title: { en: 'What to learn first', da: 'Hvad du bør lære først' },
    body: {
      en: 'The chain of prerequisites, foundations first. If a term feels hard, start at the left.',
      da: 'Kæden af forudsætninger, grundlaget først. Hvis et begreb virker svært, så start fra venstre.',
    },
  },
  {
    page: `terms/${TOUR_TERM}/`,
    anchors: ['#relationships'],
    title: { en: 'Relationships', da: 'Relationer' },
    body: {
      en: 'Typed links to other terms: what this is a kind of, what it requires, what mitigates it, what it contrasts with. Hover a link to see why the two are connected; brighter borders are the strongest links.',
      da: 'Typede forbindelser til andre begreber: hvad det er en slags, hvad det kræver, hvad der afbøder det, og hvad det står i kontrast til. Hold musen over et link for at se, hvorfor de to hænger sammen; lysere kanter er de stærkeste forbindelser.',
    },
  },
  {
    page: `terms/${TOUR_TERM}/`,
    anchors: ['#check-yourself'],
    title: { en: 'Check yourself', da: 'Test dig selv' },
    body: {
      en: 'Mark how well you know the term and answer a few questions generated from the map. Your answers stay in this browser and shape what the study page suggests next.',
      da: 'Markér, hvor godt du kender begrebet, og besvar et par spørgsmål, der er genereret ud fra kortet. Dine svar bliver i denne browser og former, hvad øvesiden foreslår som det næste.',
    },
  },
  {
    page: `compare/${TOUR_PAIR}/`,
    anchors: ['#compare'],
    via: { en: 'Next: compare Risk and Threat', da: 'Næste: sammenlign Risiko og Trussel' },
    title: { en: 'Compare', da: 'Sammenlign' },
    body: {
      en: 'Terms that are easy to mix up get a side-by-side page: why they differ, each facet next to the other, and what they have in common. The Compare menu lists every pair.',
      da: 'Begreber, der er lette at blande sammen, får en side om side-visning: hvorfor de er forskellige, facetterne ved siden af hinanden, og hvad de har til fælles. Menuen Sammenlign viser alle par.',
    },
  },
  {
    page: 'explorer/',
    anchors: ['[data-tour="explorer-layouts"]', '[data-explorer-bar]', '#explorer'],
    via: { en: 'Next: the Explorer', da: 'Næste: Udforsk' },
    title: { en: 'The explorer', da: 'Udforsk' },
    body: {
      en: 'The whole map at once. Switch between 2D and a 3D view you can fly around, and lay the map out by force, by depth (foundations at the bottom) or by time. Colour it by cluster or by what you already know.',
      da: 'Hele kortet på én gang. Skift mellem 2D og en 3D-visning, du kan flyve rundt i, og placér kortet efter kraft, efter dybde (grundlaget nederst) eller efter tid. Farv det efter klynge eller efter, hvad du allerede kan.',
    },
  },
  {
    page: 'explorer/',
    anchors: ['[data-tour="explorer-filters"]', '[data-explorer-bar]', '#explorer'],
    title: { en: 'Filters', da: 'Filtre' },
    body: {
      en: 'Show only some domains or kinds of relationship - for example just prerequisites, or just attacks and defences. Click a term to focus on its neighbourhood.',
      da: 'Vis kun nogle domæner eller slags relationer - for eksempel kun forudsætninger eller kun angreb og forsvar. Klik på et begreb for at fokusere på dets nabolag.',
    },
  },
  {
    page: 'explorer/',
    anchors: ['[data-tour="explorer-route"]', '[data-explorer-bar]', '#explorer'],
    title: { en: 'Route finder', da: 'Find vej' },
    body: {
      en: 'Pick two terms to see the shortest chain of links between them - handy for explaining how two ideas connect.',
      da: 'Vælg to begreber for at se den korteste kæde af forbindelser mellem dem - praktisk, når du skal forklare, hvordan to idéer hænger sammen.',
    },
  },
  {
    page: 'study/',
    anchors: ['#study'],
    via: { en: 'Next: Study', da: 'Næste: Øv' },
    title: { en: 'Study', da: 'Øv' },
    body: {
      en: 'Quizzes built from the map, with spaced repetition: right answers come back later, wrong ones soon. It also recommends terms whose prerequisites you already know.',
      da: 'Quizzer bygget ud fra kortet, med spredt repetition: rigtige svar vender tilbage senere, forkerte snart. Siden anbefaler også begreber, hvis forudsætninger du allerede kender.',
    },
  },
  {
    page: 'timeline/',
    anchors: ['#timeline'],
    via: { en: 'Next: the timeline', da: 'Næste: tidslinjen' },
    title: { en: 'Timeline', da: 'Tidslinje' },
    body: {
      en: 'One lane per domain, each term placed at the year it came into use, with the eras behind them - the big dots are milestones. Click a term to read it.',
      da: 'Én bane pr. domæne, hvert begreb placeret i det år, det kom i brug, med tidsaldrene bagved - de store prikker er milepæle. Klik på et begreb for at læse det.',
    },
  },
  {
    page: 'timeline/',
    anchors: ['#lang-switch'],
    title: { en: 'English and Danish', da: 'Dansk og engelsk' },
    body: {
      en: 'Switch language here - you stay on the same page. That’s the tour; restart it any time from “Take the tour”.',
      da: 'Skift sprog her - du bliver på samme side. Det var rundvisningen; start den igen når som helst fra “Tag rundvisningen”.',
    },
  },
];
