import type { TourStep } from './tour';

export const LANGS = ['en', 'da'] as const;
export type Lang = (typeof LANGS)[number];

const rawBase = import.meta.env.BASE_URL;
/** Always ends in '/'. GitHub Pages serves the site under /tech-atlas/. */
export const BASE = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

/** Base-path-aware URL for an internal path. */
export const url = (path = '') => BASE + path.replace(/^\//, '');

/**
 * Accounts + synced progress (A44) exist only when the build is given a Supabase
 * project. Without these two public values every account surface is left out and
 * the site is exactly the local-only one.
 */
export const SUPABASE_URL: string = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
export const ACCOUNTS = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

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
    study: 'Study',
    studyIntro:
      'Questions generated from the map. Right answers come back later; wrong ones come back soon.',
    checkYourself: 'Check yourself',
    start: 'Start a session',
    next: 'Next',
    again: 'Another round',
    correct: 'Correct.',
    incorrect: 'Not quite — the answer is',
    score: 'You got {n} of {m} right.',
    noQuestions: 'No questions for this term yet.',
    practise: 'Practise',
    allTerms: 'All terms',
    progress: 'Your progress',
    practised: 'Practised',
    known: 'Known',
    dueNow: 'Due for review',
    localNote: 'Your progress is stored only in this browser.',
    recommended: 'Recommended next',
    recommendedIntro: 'Terms whose prerequisites you already know.',
    statusQuestion: 'How well do you know this?',
    status_know: 'I know it',
    status_familiar: 'Familiar',
    status_learning: 'Learning it',
    status_unknown: "Don't understand",
    colourBy: 'Colour by',
    byCluster: 'Cluster',
    byKnowledge: 'My knowledge',
    intentCompare: 'Compare {a} and {b}',
    intentRoute: 'Show the route from {a} to {b}',
    intentBefore: 'What to learn before {a}',
    review: 'Review queue',
    reviewIntro:
      'Every entry was drafted by an AI and stays marked as a draft until a person has checked it. To approve one, open it on GitHub and change draft: true to draft: false.',
    reviewed: 'reviewed',
    editOnGitHub: 'Edit on GitHub',
    sourceCode: 'Source',
    explorer: 'Explorer',
    neighbourhood: 'Neighbourhood',
    expand: 'Expand +1',
    wholeMap: 'Whole map',
    explorerIntro: 'The whole map. Click a term to see it; double-click to open its entry.',
    layoutForce: 'Force',
    layoutDepth: 'By depth',
    depthNote: 'Height = depth: foundations at the bottom, advanced terms on top.',
    domains: 'Domains',
    relationshipTypes: 'Relationships',
    route: 'Route between two terms',
    from: 'From',
    to: 'To',
    findRoute: 'Find route',
    noRoute: 'No route found.',
    showPrerequisites: 'Show prerequisites',
    openEntry: 'Open entry',
    clear: 'Clear',
    learnFirst: 'What to learn first',
    learnFirstIntro: 'Everything this builds on, foundations first.',
    openExplorer: 'Open in the explorer →',
    loading: 'Loading…',
    search: 'Search terms, aliases, definitions…',
    noResults: 'No matches',
    semanticEnable:
      'Search by meaning (downloads a ~135 MB language model from Hugging Face the first time)',
    semanticSource:
      "The model is fetched from huggingface.co and kept in your browser's cache; your searches stay in your browser.",
    semanticRetry: 'Try again',
    semanticOff: 'Turn off search by meaning',
    semanticLoading: 'Loading the language model… {p}',
    semanticByMeaning: 'by meaning',
    semanticFailed: 'Search by meaning is unavailable right now.',
    connections: 'Connections',
    relationships: 'Relationships',
    mentionedIn: 'Mentioned in',
    sources: 'Sources',
    aka: 'Also known as',
    readArticle: 'Read the full article →',
    backToTerm: '← Back to the entry',
    draft: 'Draft — this entry has not been reviewed yet.',
    disambiguationTitle: '“{name}” — several meanings',
    disambiguationIntro:
      '“{name}” names different things in different fields. Pick the one you mean.',
    otherMeanings: '“{name}” also means something else in another field — see every meaning →',
    searchDisambiguation: '“{name}” has {n} meanings — choose one',
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
    timeline: 'Timeline',
    timelineIntro:
      'Terms by the decade they entered use. Colour = cluster; click a term to open it.',
    undatedNote: '{n} terms have no year yet and are not shown.',
    undatedNoteOne: '1 term has no year yet and is not shown.',
    noDated: 'No terms have a year yet.',
    allDomains: 'All',
    decade: '{d}s',
    layoutTime: 'By time',
    timeNote: 'Left to right = the year a term entered use. Terms without a year sit on the left.',
    account: 'Account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    accountIntro:
      'Sign in to keep your progress in step across devices. Everything works without an account too.',
    accountsOff: 'Accounts are not enabled on this site. Your progress is stored in this browser.',
    emailLabel: 'Email',
    sendLink: 'Email me a sign-in link',
    linkSent: 'Check your inbox and open the link in this browser to finish signing in.',
    or: 'or',
    withGitHub: 'Sign in with GitHub',
    authError: 'Something went wrong: {msg}',
    signedInAs: 'Signed in as {email}',
    syncNow: 'Sync now',
    sync_syncing: 'Syncing…',
    sync_synced: 'Progress synced.',
    sync_offline: 'Offline — changes are kept here and sync when you are back online.',
    sync_error: 'Could not sync just now — your progress is safe in this browser.',
    lastSynced: 'Progress synced at {time}.',
    deleteData: 'Delete my synced data',
    deleteNote:
      'Deletes your synced progress from the server and signs you out; other devices are signed out at their next sync. Progress in this browser is kept.',
    deleteConfirm: 'Delete your synced progress from the server and sign out?',
    deleted: 'Your synced data has been deleted.',
    syncNote: 'Your progress is stored in this browser — sign in to sync it across devices.',
    stoppedNote:
      'Your synced data was deleted, so syncing is paused. Start again to upload the progress in this browser.',
    startAgain: 'Start syncing again',
    remoteDeleted:
      'You were signed out because your synced data was deleted on another device. Progress in this browser is kept.',
    dismiss: 'Dismiss',
    signOutFailed: 'Your data was deleted, but signing out other devices failed: {msg}',
    home: 'Home',
    menu: 'Menu',
    skipToContent: 'Skip to content',
    backToTop: 'Back to top',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    breadcrumb: 'Breadcrumb',
    heroLead:
      'Look up a technical term and see where it sits: what it builds on, what it is easily confused with, and what it leads to. Every entry is written in plain language, in English and Danish.',
    searchHint: 'Tip: press / anywhere to search.',
    browseDomains: 'Browse by domain',
    termCount: '{n} terms',
    clusterCount: '{n} clusters',
    randomTerm: 'Random term',
    recentlyViewed: 'Recently viewed',
    clearRecent: 'Clear',
    indexTitle: 'All terms',
    langSuggest: 'This page is available in English.',
    langSwitch: 'Switch to English',
    langKeep: 'No thanks',
    notFoundTitle: 'Page not found',
    notFoundBody: 'The page you asked for does not exist — it may have moved.',
    notFoundHome: 'Go to the English home page',
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
  },
  da: {
    tagline: 'En tosproget teknisk ordbog, der læses som en vidensgraf.',
    index: 'Indeks',
    compare: 'Sammenlign',
    study: 'Øv',
    studyIntro:
      'Spørgsmål genereret ud fra kortet. Rigtige svar vender tilbage senere; forkerte vender snart tilbage.',
    checkYourself: 'Test dig selv',
    start: 'Start en runde',
    next: 'Næste',
    again: 'En runde til',
    correct: 'Rigtigt.',
    incorrect: 'Ikke helt — svaret er',
    score: 'Du fik {n} af {m} rigtige.',
    noQuestions: 'Ingen spørgsmål til dette begreb endnu.',
    practise: 'Øv',
    allTerms: 'Alle begreber',
    progress: 'Dine fremskridt',
    practised: 'Øvet',
    known: 'Kendt',
    dueNow: 'Klar til repetition',
    localNote: 'Dine fremskridt gemmes kun i denne browser.',
    recommended: 'Anbefalet som det næste',
    recommendedIntro: 'Begreber, hvis forudsætninger du allerede kender.',
    statusQuestion: 'Hvor godt kender du dette?',
    status_know: 'Kender det',
    status_familiar: 'Bekendt',
    status_learning: 'Lærer det',
    status_unknown: 'Forstår det ikke',
    colourBy: 'Farv efter',
    byCluster: 'Klynge',
    byKnowledge: 'Min viden',
    intentCompare: 'Sammenlign {a} og {b}',
    intentRoute: 'Vis vejen fra {a} til {b}',
    intentBefore: 'Hvad du bør lære før {a}',
    review: 'Gennemgangskø',
    reviewIntro:
      'Alle opslag er udkast skrevet af en AI og forbliver markeret som kladde, indtil et menneske har tjekket dem. Godkend et opslag ved at åbne det på GitHub og ændre draft: true til draft: false.',
    reviewed: 'gennemgået',
    editOnGitHub: 'Redigér på GitHub',
    sourceCode: 'Kildekode',
    explorer: 'Udforsk',
    neighbourhood: 'Nabolag',
    expand: 'Udvid +1',
    wholeMap: 'Hele kortet',
    explorerIntro:
      'Hele kortet. Klik på et begreb for at se det; dobbeltklik for at åbne opslaget.',
    layoutForce: 'Kraft',
    layoutDepth: 'Efter dybde',
    depthNote: 'Højde = dybde: grundlaget nederst, avancerede begreber øverst.',
    domains: 'Domæner',
    relationshipTypes: 'Relationer',
    route: 'Vej mellem to begreber',
    from: 'Fra',
    to: 'Til',
    findRoute: 'Find vej',
    noRoute: 'Ingen vej fundet.',
    showPrerequisites: 'Vis forudsætninger',
    openEntry: 'Åbn opslag',
    clear: 'Ryd',
    learnFirst: 'Hvad du bør lære først',
    learnFirstIntro: 'Alt det, dette bygger på — grundlaget først.',
    openExplorer: 'Åbn i udforskeren →',
    loading: 'Indlæser…',
    search: 'Søg i begreber, synonymer, definitioner…',
    noResults: 'Ingen resultater',
    semanticEnable:
      'Søg efter betydning (henter første gang en sprogmodel på ca. 135 MB fra Hugging Face)',
    semanticSource:
      'Modellen hentes fra huggingface.co og gemmes i din browsers cache; dine søgninger bliver i din browser.',
    semanticRetry: 'Prøv igen',
    semanticOff: 'Slå søgning efter betydning fra',
    semanticLoading: 'Indlæser sprogmodellen… {p}',
    semanticByMeaning: 'efter betydning',
    semanticFailed: 'Søgning efter betydning er ikke tilgængelig lige nu.',
    connections: 'Forbindelser',
    relationships: 'Relationer',
    mentionedIn: 'Nævnt i',
    sources: 'Kilder',
    aka: 'Også kendt som',
    readArticle: 'Læs hele artiklen →',
    backToTerm: '← Tilbage til opslaget',
    draft: 'Kladde — dette opslag er endnu ikke gennemgået.',
    disambiguationTitle: '“{name}” — flere betydninger',
    disambiguationIntro:
      '“{name}” betyder forskellige ting inden for forskellige fagområder. Vælg den, du mener.',
    otherMeanings:
      '“{name}” betyder også noget andet inden for et andet fagområde — se alle betydninger →',
    searchDisambiguation: '“{name}” har {n} betydninger — vælg én',
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
    timeline: 'Tidslinje',
    timelineIntro:
      'Begreber efter det årti, de kom i brug. Farve = klynge; klik på et begreb for at åbne det.',
    undatedNote: '{n} begreber har endnu intet årstal og vises ikke.',
    undatedNoteOne: '1 begreb har endnu intet årstal og vises ikke.',
    noDated: 'Ingen begreber har et årstal endnu.',
    allDomains: 'Alle',
    decade: "{d}'erne",
    layoutTime: 'Efter tid',
    timeNote:
      'Fra venstre mod højre = året, et begreb kom i brug. Begreber uden årstal står til venstre.',
    account: 'Konto',
    signIn: 'Log ind',
    signOut: 'Log ud',
    accountIntro:
      'Log ind for at holde dine fremskridt ens på tværs af enheder. Alt virker også uden en konto.',
    accountsOff: 'Konti er ikke slået til på dette site. Dine fremskridt gemmes i denne browser.',
    emailLabel: 'E-mail',
    sendLink: 'Send mig et login-link',
    linkSent: 'Tjek din indbakke, og åbn linket i denne browser for at logge ind.',
    or: 'eller',
    withGitHub: 'Log ind med GitHub',
    authError: 'Noget gik galt: {msg}',
    signedInAs: 'Logget ind som {email}',
    syncNow: 'Synkronisér nu',
    sync_syncing: 'Synkroniserer …',
    sync_synced: 'Fremskridt synkroniseret.',
    sync_offline: 'Offline — ændringer gemmes her og synkroniseres, når du er online igen.',
    sync_error: 'Kunne ikke synkronisere lige nu — dine fremskridt er sikre i denne browser.',
    lastSynced: 'Fremskridt synkroniseret kl. {time}.',
    deleteData: 'Slet mine synkroniserede data',
    deleteNote:
      'Sletter dine synkroniserede fremskridt fra serveren og logger dig ud; andre enheder logges ud ved deres næste synkronisering. Fremskridt i denne browser bevares.',
    deleteConfirm: 'Slet dine synkroniserede fremskridt fra serveren og log ud?',
    deleted: 'Dine synkroniserede data er slettet.',
    syncNote:
      'Dine fremskridt gemmes i denne browser — log ind for at synkronisere dem på tværs af enheder.',
    stoppedNote:
      'Dine synkroniserede data er slettet, så synkroniseringen er sat på pause. Start igen for at uploade fremskridtene i denne browser.',
    startAgain: 'Start synkronisering igen',
    remoteDeleted:
      'Du blev logget ud, fordi dine synkroniserede data blev slettet på en anden enhed. Fremskridt i denne browser bevares.',
    dismiss: 'Luk',
    signOutFailed: 'Dine data er slettet, men det lykkedes ikke at logge andre enheder ud: {msg}',
    home: 'Forside',
    menu: 'Menu',
    skipToContent: 'Gå til indhold',
    backToTop: 'Til toppen',
    copyLink: 'Kopiér link',
    linkCopied: 'Link kopieret',
    breadcrumb: 'Brødkrummesti',
    heroLead:
      'Slå et teknisk begreb op, og se hvor det hører hjemme: hvad det bygger på, hvad det let forveksles med, og hvad det fører videre til. Alle opslag er skrevet i et enkelt sprog, på dansk og engelsk.',
    searchHint: 'Tip: tryk / hvor som helst for at søge.',
    browseDomains: 'Gå på opdagelse efter domæne',
    termCount: '{n} begreber',
    clusterCount: '{n} klynger',
    randomTerm: 'Tilfældigt begreb',
    recentlyViewed: 'Senest set',
    clearRecent: 'Ryd',
    indexTitle: 'Alle begreber',
    langSuggest: 'Denne side findes på dansk.',
    langSwitch: 'Skift til dansk',
    langKeep: 'Nej tak',
    notFoundTitle: 'Siden blev ikke fundet',
    notFoundBody: 'Siden, du bad om, findes ikke — den er måske flyttet.',
    notFoundHome: 'Gå til den danske forside',
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
  'application-security': { en: 'Application security', da: 'Applikationssikkerhed' },
  'security-operations': { en: 'Detection & response', da: 'Detektion og respons' },
  networking: { en: 'Networking', da: 'Netværk' },
  os: { en: 'Operating systems', da: 'Styresystemer' },
  identity: { en: 'Identity & access', da: 'Identitet og adgang' },
  cryptography: { en: 'Cryptography', da: 'Kryptografi' },
  web: { en: 'Web & data', da: 'Web og data' },
  'ml-fundamentals': { en: 'Machine learning basics', da: 'Grundlæggende maskinlæring' },
  llm: { en: 'Language models', da: 'Sprogmodeller' },
  'ai-risk': { en: 'AI risk & governance', da: 'AI-risiko og governance' },
  training: { en: 'Training & optimisation', da: 'Træning og optimering' },
  evaluation: { en: 'Evaluation & metrics', da: 'Evaluering og målinger' },
  'model-architecture': { en: 'Model architectures', da: 'Modelarkitekturer' },
  prompting: { en: 'Prompting & generation', da: 'Prompting og generering' },
  'ai-infrastructure': { en: 'AI hardware & serving', da: 'AI-hardware og drift' },
  retrieval: { en: 'Retrieval & search', da: 'Genfinding og søgning' },
  agents: { en: 'Agents & tools', da: 'Agenter og værktøjer' },
  'ai-coding': { en: 'AI-assisted coding', da: 'AI-assisteret kodning' },
  cloud: { en: 'Cloud', da: 'Cloud' },
  containers: { en: 'Containers & orchestration', da: 'Containere og orkestrering' },
  delivery: { en: 'Software delivery', da: 'Softwarelevering' },
  observability: { en: 'Observability', da: 'Observerbarhed' },
};

/** Cluster and relationship-family colours live with the rest of the graph style (A74). */
export { CLUSTER_COLOURS, FAMILY_COLOURS } from './graph-style';

export const FAMILY_LABELS: Record<string, Record<Lang, string>> = {
  structure: { en: 'Structure (kind of, part of)', da: 'Struktur (slags, del af)' },
  dependency: { en: 'Prerequisites', da: 'Forudsætninger' },
  contrast: { en: 'Contrasts & alternatives', da: 'Kontraster og alternativer' },
  security: { en: 'Attacks & defences', da: 'Angreb og forsvar' },
  regulation: { en: 'Regulation', da: 'Regulering' },
  lineage: { en: 'Lineage', da: 'Afstamning' },
  association: { en: 'Used together', da: 'Bruges sammen' },
};

/** Graph legend and canvas controls (Explorer + term-page graph, A74). */
export const GRAPH_UI = {
  en: {
    legend: 'Legend',
    nodes: 'Terms — colour = domain, shade = cluster',
    ring: 'Ring: the term belongs to a second domain',
    edges: 'Relationships — colour = family',
    oneWay:
      'One-way: the arrow (and moving dashes) point from a term to what it requires, mitigates, causes …',
    twoWay: 'Two-way: contrasts, alternatives and “used with” — no arrow',
    crossDomain: 'Fades between two domain colours: crosses domains',
    fit: 'Fit to view',
  },
  da: {
    legend: 'Forklaring',
    nodes: 'Begreber — farve = domæne, nuance = klynge',
    ring: 'Ring: begrebet hører også til et andet domæne',
    edges: 'Relationer — farve = familie',
    oneWay:
      'Envejs: pilen (og de bevægelige streger) peger fra et begreb mod det, det forudsætter, afbøder, forårsager …',
    twoWay: 'Tovejs: kontraster, alternativer og “bruges sammen med” — ingen pil',
    crossDomain: 'Glider mellem to domænefarver: krydser domæner',
    fit: 'Tilpas visning',
  },
} as const;

/** Where the source lives — used for 'Edit on GitHub' links in the review queue. */
export const REPO = 'https://github.com/CMaintz/tech-atlas';

/** The term and compare pair the guided tour walks through (A61). */
export const TOUR_TERM = 'security/risk';
export const TOUR_PAIR = 'risk-vs-threat';

type Bi = Record<Lang, string>;

/**
 * The guided tour (A61). Pages are relative to the language root; anchors are tried
 * in order and fall back to a centred card, so a step survives markup changes.
 */
export const TOUR_STEPS: TourStep<Bi>[] = [
  {
    page: null,
    anchors: [],
    title: { en: 'Welcome to Atlas', da: 'Velkommen til Atlas' },
    body: {
      en: 'Atlas is a technical dictionary that doubles as a map: every term is linked to the terms it builds on, is confused with, or leads to. This short tour shows you around — it takes about two minutes.',
      da: 'Atlas er en teknisk ordbog, der også er et kort: hvert begreb er forbundet med de begreber, det bygger på, forveksles med eller fører videre til. Denne korte rundvisning viser dig rundt — den tager cirka to minutter.',
    },
  },
  {
    page: '',
    anchors: ['#search'],
    title: { en: 'Search', da: 'Søg' },
    body: {
      en: 'Search names, abbreviations and synonyms in both languages at once — small typos are fine. Press / on any page to jump here.',
      da: 'Søg i navne, forkortelser og synonymer på begge sprog på én gang — små stavefejl gør ikke noget. Tryk / på en hvilken som helst side for at hoppe hertil.',
    },
  },
  {
    page: '',
    anchors: ['#search'],
    title: { en: 'Ask, don’t just search', da: 'Spørg — søg ikke bare' },
    body: {
      en: 'The search box understands intents: “risk vs threat” compares two terms, “before zero trust” lists what to learn first, and “from password to MFA” finds a route on the map. Whole questions — “how do I stop phishing?” — can be searched by meaning.',
      da: 'Søgefeltet forstår hensigter: “risiko vs trussel” sammenligner to begreber, “før zero trust” viser, hvad du bør lære først, og “fra adgangskode til MFA” finder en vej på kortet. Hele spørgsmål — “hvordan stopper jeg phishing?” — kan søges efter betydning.',
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
    title: { en: 'Four ways to explain one term', da: 'Fire måder at forklare ét begreb' },
    body: {
      en: 'Every entry has four facets: a formal definition, a plain-language one, what it looks like in practice, and why it matters. Underlined words are other entries — follow them.',
      da: 'Hvert opslag har fire facetter: en formel definition, en enkel forklaring, hvordan det ser ud i praksis, og hvorfor det betyder noget. Understregede ord er andre opslag — følg dem.',
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
    anchors: ['#mentions', '#relationships'],
    title: { en: 'Mentioned in', da: 'Nævnt i' },
    body: {
      en: 'Entries that use this term in their explanation without being directly linked to it — a quick way to see where it turns up.',
      da: 'Opslag, der bruger dette begreb i deres forklaring uden at være direkte forbundet med det — en hurtig måde at se, hvor det dukker op.',
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
    title: { en: 'Compare', da: 'Sammenlign' },
    body: {
      en: 'Terms that are easy to mix up get a side-by-side page: why they differ, each facet next to the other, and what they have in common. The Compare menu lists every pair.',
      da: 'Begreber, der er lette at blande sammen, får en side om side-visning: hvorfor de er forskellige, facetterne ved siden af hinanden, og hvad de har til fælles. Menuen Sammenlign viser alle par.',
    },
  },
  {
    page: 'explorer/',
    anchors: ['[data-tour="explorer-layouts"]', '#explorer aside', '#explorer'],
    title: { en: 'The explorer', da: 'Udforsk' },
    body: {
      en: 'The whole map at once. Switch between 2D and a 3D view you can fly around, and lay the map out by force, by depth (foundations at the bottom) or by time. Colour it by cluster or by what you already know.',
      da: 'Hele kortet på én gang. Skift mellem 2D og en 3D-visning, du kan flyve rundt i, og placér kortet efter kraft, efter dybde (grundlaget nederst) eller efter tid. Farv det efter klynge eller efter, hvad du allerede kan.',
    },
  },
  {
    page: 'explorer/',
    anchors: ['[data-tour="explorer-filters"]', '#explorer aside', '#explorer'],
    title: { en: 'Filters', da: 'Filtre' },
    body: {
      en: 'Show only some domains or kinds of relationship — for example just prerequisites, or just attacks and defences. Click a term to focus on its neighbourhood.',
      da: 'Vis kun nogle domæner eller slags relationer — for eksempel kun forudsætninger eller kun angreb og forsvar. Klik på et begreb for at fokusere på dets nabolag.',
    },
  },
  {
    page: 'explorer/',
    anchors: ['[data-tour="explorer-route"]', '#explorer aside', '#explorer'],
    title: { en: 'Route finder', da: 'Find vej' },
    body: {
      en: 'Pick two terms to see the shortest chain of links between them — handy for explaining how two ideas connect.',
      da: 'Vælg to begreber for at se den korteste kæde af forbindelser mellem dem — praktisk, når du skal forklare, hvordan to idéer hænger sammen.',
    },
  },
  {
    page: 'study/',
    anchors: ['#study'],
    title: { en: 'Study', da: 'Øv' },
    body: {
      en: 'Quizzes built from the map, with spaced repetition: right answers come back later, wrong ones soon. It also recommends terms whose prerequisites you already know.',
      da: 'Quizzer bygget ud fra kortet, med spredt repetition: rigtige svar vender tilbage senere, forkerte snart. Siden anbefaler også begreber, hvis forudsætninger du allerede kender.',
    },
  },
  {
    page: 'timeline/',
    anchors: ['#timeline'],
    title: { en: 'Timeline', da: 'Tidslinje' },
    body: {
      en: 'Terms by the decade they came into use — filter by domain to see how a field grew.',
      da: 'Begreber efter det årti, de kom i brug — filtrér efter domæne for at se, hvordan et fagområde voksede.',
    },
  },
  {
    page: 'timeline/',
    anchors: ['#lang-switch'],
    title: { en: 'English and Danish', da: 'Dansk og engelsk' },
    body: {
      en: 'Switch language here — you stay on the same page. That’s the tour; restart it any time from “Take the tour”.',
      da: 'Skift sprog her — du bliver på samme side. Det var rundvisningen; start den igen når som helst fra “Tag rundvisningen”.',
    },
  },
];
