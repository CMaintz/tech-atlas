/**
 * The Explorer's controls, layouts and route finder.
 * A slice of `UI` (site.ts), which merges every area into one table per language.
 */
export const UI_EXPLORER = {
  en: {
    view: 'View',
    colourBy: 'Colour by',
    byCluster: 'Cluster',
    byKnowledge: 'My knowledge',
    neighbourhood: 'Neighbourhood',
    expand: 'Expand +1',
    wholeMap: 'Whole map',
    controls: 'Controls',
    mapControls: 'Map controls',
    mapActions: 'On the map',
    autoRotate: 'Auto-rotate',
    findTerm: 'Find a term',
    routeShort: 'Route',
    /** The bar's Relationships button (the popover keeps the full heading). */
    linksShort: 'Links',
    explorerIntro:
      'The whole map. Click a term to open it in the side panel; expand the panel to read it in full.',
    layoutForce: 'Force',
    layoutDepth: 'By depth',
    depthNote:
      'Height = depth: foundations at the bottom, advanced terms on top. One lane per domain.',
    galaxyNote:
      'Each domain is a galaxy of its clusters; a term shared by two domains glows in the other’s colour. Foundations lie lower, advanced terms higher.',
    layoutTime: 'By time',
    timeNote: 'Left to right = the year a term entered use; one lane per domain.',
    domains: 'Domains',
    relationshipTypes: 'Relationships',
    route: 'Route between two terms',
    from: 'From',
    to: 'To',
    findRoute: 'Find route',
    noRoute: 'No route found.',
    showPrerequisites: 'Show prerequisites',
    clear: 'Clear',
  },
  da: {
    view: 'Visning',
    colourBy: 'Farv efter',
    byCluster: 'Klynge',
    byKnowledge: 'Min viden',
    neighbourhood: 'Nabolag',
    expand: 'Udvid +1',
    wholeMap: 'Hele kortet',
    controls: 'Kontroller',
    mapControls: 'Kortkontroller',
    mapActions: 'På kortet',
    autoRotate: 'Roter automatisk',
    findTerm: 'Find et begreb',
    routeShort: 'Rute',
    linksShort: 'Relationer',
    explorerIntro:
      'Hele kortet. Klik på et begreb for at åbne det i sidepanelet; udvid panelet for at læse det hele.',
    layoutForce: 'Kraft',
    layoutDepth: 'Efter dybde',
    depthNote: 'Højde = dybde: grundlaget nederst, avancerede begreber øverst. Én bane pr. domæne.',
    galaxyNote:
      'Hvert domæne er en galakse af sine klynger; et begreb, som to domæner deler, gløder i det andets farve. Grundlaget ligger lavere, avancerede begreber højere.',
    layoutTime: 'Efter tid',
    timeNote: 'Fra venstre mod højre = året, et begreb kom i brug; én bane pr. domæne.',
    domains: 'Domæner',
    relationshipTypes: 'Relationer',
    route: 'Vej mellem to begreber',
    from: 'Fra',
    to: 'Til',
    findRoute: 'Find vej',
    noRoute: 'Ingen vej fundet.',
    showPrerequisites: 'Vis forudsætninger',
    clear: 'Ryd',
  },
} as const;

/** Graph legend and canvas controls (Explorer + term-page graph). */
export const GRAPH_UI = {
  en: {
    legend: 'Legend',
    nodes: 'Terms - colour = domain, shade = cluster',
    ring: 'Ring: the term also belongs to another domain, in that domain’s colour',
    edges: 'Relationships - colour = family',
    oneWay:
      'One-way: the arrow (and the moving flow) point from a term to what it requires, mitigates, causes …',
    twoWay: 'Two-way: contrasts, alternatives and “used with” - no arrow',
    crossDomain: 'Fades between two domain colours: crosses domains',
    showAll: 'Show all relationships',
    overview:
      'The overview draws each term’s strongest links; faint ribbons bundle the links between clusters. Click a term for all its relationships.',
    typesNote:
      'The overview starts with structure, prerequisites, attacks & defences, regulation and lineage; tick contrasts or “used together” to add them. A selected term always shows all its relationships.',
    mapLabel: 'Map. Use W A S D or the arrow keys to move',
    keys2d:
      'Keys: W A S D or arrows pan, Q / E or - / + zoom, Shift for faster (click the map first).',
    keys3d:
      'Keys: W / S forward and back, A / D sideways, Q / E down and up, arrows orbit, Shift for faster (click the map first).',
  },
  da: {
    legend: 'Forklaring',
    nodes: 'Begreber - farve = domæne, nuance = klynge',
    ring: 'Ring: begrebet hører også til et andet domæne, i det domænes farve',
    edges: 'Relationer - farve = familie',
    oneWay:
      'Envejs: pilen (og den bevægelige strøm) peger fra et begreb mod det, det forudsætter, afbøder, forårsager …',
    twoWay: 'Tovejs: kontraster, alternativer og “bruges sammen med” - ingen pil',
    crossDomain: 'Glider mellem to domænefarver: krydser domæner',
    showAll: 'Vis alle relationer',
    overview:
      'Overblikket viser hvert begrebs stærkeste forbindelser; svage bånd samler forbindelserne mellem klynger. Klik på et begreb for at se alle dets relationer.',
    typesNote:
      'Overblikket starter med struktur, forudsætninger, angreb og forsvar, regulering og afstamning; sæt flueben ved kontraster eller “bruges sammen” for at tilføje dem. Et valgt begreb viser altid alle sine relationer.',
    mapLabel: 'Kort. Brug W A S D eller piletasterne til at bevæge dig',
    keys2d:
      'Taster: W A S D eller pile flytter, Q / E eller - / + zoomer, Shift for hurtigere (klik først på kortet).',
    keys3d:
      'Taster: W / S frem og tilbage, A / D til siden, Q / E ned og op, pile drejer, Shift for hurtigere (klik først på kortet).',
  },
} as const;
