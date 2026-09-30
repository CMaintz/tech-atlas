/**
 * The timeline page's heading and notes; the island's own controls are TIMELINE_UI below.
 * A slice of `UI` (site.ts), which merges every area into one table per language.
 */
export const UI_TIMELINE = {
  en: {
    timelineIntro:
      'Terms by the year they entered use, one lane per domain. Larger dots are hub terms; hover or tap a term for its summary.',
    undatedNote: '{n} terms have no year yet and are not shown.',
    undatedNoteOne: '1 term has no year yet and is not shown.',
    noDated: 'No terms have a year yet.',
    allDomains: 'All',
    decade: '{d}s',
  },
  da: {
    timelineIntro:
      'Begreber efter det år, de kom i brug, med ét spor pr. domæne. Større prikker er centrale begreber; hold musen over eller tryk på et begreb for at se resuméet.',
    undatedNote: '{n} begreber har endnu intet årstal og vises ikke.',
    undatedNoteOne: '1 begreb har endnu intet årstal og vises ikke.',
    noDated: 'Ingen begreber har et årstal endnu.',
    allDomains: 'Alle',
    decade: "{d}'erne",
  },
} as const;

/** Timeline v2 controls, era bands and legend (swim-lane timeline). */
export const TIMELINE_UI = {
  en: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoom: 'Zoom',
    filter: 'Show domains',
    lanes: 'Lanes by domain',
    milestone: 'Hub term (many connections)',
    otherDomain: 'Ringed dot: also in a second domain (ring in its colour)',
    moreHint: 'More terms here: hover or click, or zoom in',
    moreLabel: '{n} more terms',
    openTerm: 'Open term',
    close: 'Close',
    listView: 'List view (every dated term by decade)',
    mobileHint: 'Pick a single domain to read full names; tap a term for its summary.',
    chart: 'Timeline chart',
    eras: {
      mainframe: 'Mainframes & time-sharing',
      networks: 'PCs & networks',
      web: 'The web',
      cloud: 'Cloud & mobile',
      ai: 'AI & agents',
    },
  },
  da: {
    zoomIn: 'Zoom ind',
    zoomOut: 'Zoom ud',
    zoom: 'Zoom',
    filter: 'Vis domæner',
    lanes: 'Spor pr. domæne',
    milestone: 'Centralt begreb (mange forbindelser)',
    otherDomain: 'Prik med ring: hører også til et andet domæne (ringen i dets farve)',
    moreHint: 'Flere begreber her: hold musen over, klik eller zoom ind',
    moreLabel: '{n} begreber mere',
    openTerm: 'Åbn begrebet',
    close: 'Luk',
    listView: 'Listevisning (alle daterede begreber efter årti)',
    mobileHint: 'Vælg ét domæne for at læse hele navnene; tryk på et begreb for at se resuméet.',
    chart: 'Tidslinjediagram',
    eras: {
      mainframe: 'Mainframes og tidsdeling',
      networks: "Pc'er og netværk",
      web: 'Webben',
      cloud: 'Cloud og mobil',
      ai: 'AI og agenter',
    },
  },
} as const;
