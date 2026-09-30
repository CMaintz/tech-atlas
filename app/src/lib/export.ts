/**
 * Open-data exports (A69): every Term as JSON, CSV and Anki import text. Pure — no
 * Astro imports — so the endpoints stay thin and this is unit-tested.
 */
import type { EdgeType, TermData } from '../schema';
import { makeRefResolver } from './graph-model';

type Lang = 'en' | 'da';
const LANGS: Lang[] = ['en', 'da'];

/** The content licence (CONTENT-LICENSE.md, A66). Carried inside every data file. */
export const LICENCE = {
  name: 'CC BY-SA 4.0',
  spdx: 'CC-BY-SA-4.0',
  url: 'https://creativecommons.org/licenses/by-sa/4.0/',
  attribution: 'Atlas, a bilingual technical dictionary (https://cmaintz.github.io/tech-atlas/)',
} as const;

export type ExportInput = { id: string; data: TermData; depth: number };

export type ExportEdge = {
  type: EdgeType;
  to: string;
  why?: { en: string; da: string };
  confidence: string;
  strength: string;
};

export type ExportTerm = {
  id: string;
  url: Record<Lang, string>;
  term: { en: string; da: string };
  aka: { en: string[]; da: string[] };
  domain: string[];
  cluster: string;
  layer?: string;
  status: string;
  era?: number;
  summary: { en: string; da: string };
  body: TermData['body'];
  /** Optional long technical explanation, plain text, paragraphs split by blank lines. */
  deepDive?: { en: string; da: string };
  /** How to put it into practice (A101): steps, pitfalls and guides. */
  howTo?: TermData['howTo'];
  /** Authored edges, targets resolved to full ids. Inverses are left to the reader. */
  edges: ExportEdge[];
  /** Derived (ADR-0001): longest `requires` chain below this Term. */
  depth: number;
  sources: TermData['sources'];
  draft: boolean;
};

/**
 * One record per Term. `siteUrl` is the absolute site root ending in `/`
 * (e.g. https://cmaintz.github.io/tech-atlas/).
 */
export function exportTerms(terms: ExportInput[], siteUrl: string): ExportTerm[] {
  const resolve = makeRefResolver(terms.map((t) => t.id));
  return [...terms]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => exportTerm(t, siteUrl, exportEdges(t, resolve)));
}

type RefResolver = ReturnType<typeof makeRefResolver>;
type AuthoredEdge = NonNullable<TermData['edges'][EdgeType]>[number];

/** One authored edge; a bare-string edge gets the schema's defaults. */
function exportEdge(type: EdgeType, e: AuthoredEdge, to: string): ExportEdge {
  if (typeof e === 'string') return { type, to, confidence: 'high', strength: 'normal' };
  return {
    type,
    to,
    ...(e.why ? { why: e.why } : {}),
    confidence: e.confidence,
    strength: e.strength,
  };
}

/** A Term's authored edges with targets resolved to full ids; dangling ones dropped. */
function exportEdges({ id, data }: ExportInput, resolve: RefResolver): ExportEdge[] {
  const edges: ExportEdge[] = [];
  const lists = Object.entries(data.edges ?? {}) as [EdgeType, AuthoredEdge[] | undefined][];
  for (const [type, list] of lists) {
    for (const e of list ?? []) {
      const to = resolve(typeof e === 'string' ? e : e.to, id);
      if (to) edges.push(exportEdge(type, e, to));
    }
  }
  return edges;
}

function exportTerm(
  { id, data: d, depth }: ExportInput,
  siteUrl: string,
  edges: ExportEdge[],
): ExportTerm {
  const url = Object.fromEntries(LANGS.map((l) => [l, `${siteUrl}${l}/terms/${id}/`]));
  return {
    id,
    url: url as Record<Lang, string>,
    ...termContent(d),
    edges,
    depth,
    sources: d.sources,
    draft: d.draft,
  };
}

/** The authored description of a Term, optional fields only when present. */
function termContent(d: TermData) {
  return {
    term: d.term,
    aka: d.aka,
    domain: d.domain,
    cluster: d.cluster,
    ...(d.layer ? { layer: d.layer } : {}),
    status: d.status,
    ...(d.era !== undefined ? { era: d.era } : {}),
    summary: d.summary,
    body: d.body,
    ...(d.deepDive ? { deepDive: d.deepDive } : {}),
    ...(d.howTo ? { howTo: d.howTo } : {}),
  };
}

/**
 * RFC 4180 field: quoted when it holds a comma, quote or line break. A text cell that
 * starts with = + - @, a tab or a carriage return gets a leading ' so spreadsheets
 * read it as text, never as a formula (CSV injection). Numbers are left alone.
 */
export const csvField = (v: string | number | boolean | undefined) => {
  let s = v === undefined ? '' : String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_COLUMNS = [
  'id',
  'term_en',
  'term_da',
  'aka_en',
  'aka_da',
  'domain',
  'cluster',
  'layer',
  'status',
  'era',
  'depth',
  'summary_en',
  'summary_da',
  'url_en',
  'url_da',
  'draft',
] as const;

/** One row per Term, both languages; list fields joined with `; `. CRLF line ends. */
export function toCsv(terms: ExportTerm[]): string {
  const rows = terms.map((t) => csvCells(t).map(csvField).join(','));
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}

/** A Term's cells, in CSV_COLUMNS order. */
const csvCells = (t: ExportTerm) => [
  t.id,
  t.term.en,
  t.term.da,
  t.aka.en.join('; '),
  t.aka.da.join('; '),
  t.domain.join('; '),
  t.cluster,
  t.layer,
  t.status,
  t.era,
  t.depth,
  t.summary.en,
  t.summary.da,
  t.url.en,
  t.url.da,
  t.draft,
];

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** A tab or line break would split an Anki field or note. */
const oneLine = (s: string) => s.replace(/[\t\r\n]+/g, ' ');
/** Anki reads a line starting with # as a header or comment, so escape a leading #. */
const noHash = (s: string) => s.replace(/^#/, '&#35;');

/**
 * Anki's plain-text import (File → Import), one note per Term: front = the name,
 * back = summary + plain-language facet + a link back. The header lines tell Anki the
 * separator, that fields are HTML, the deck, and the tags column, so no import
 * settings need touching. Each note carries a stable id (column 4), so re-importing a
 * newer file updates the notes instead of duplicating them.
 */
export function toAnki(terms: ExportTerm[], lang: Lang, deck: string): string {
  const header = [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    `#deck:${deck}`,
    '#tags column:3',
    '#guid column:4',
  ];
  return [...header, ...terms.map((t) => ankiNote(t, lang))].join('\n') + '\n';
}

/** One note line: front, back, tags and the stable guid, tab-separated. */
function ankiNote(t: ExportTerm, lang: Lang): string {
  const front = noHash(escapeHtml(oneLine(t.term[lang])));
  const back = [
    `<b>${escapeHtml(oneLine(t.summary[lang]))}</b>`,
    escapeHtml(oneLine(t.body.plain[lang])),
    `<a href="${escapeHtml(t.url[lang])}">${escapeHtml(t.url[lang])}</a>`,
  ].join('<br><br>');
  const tags = ['atlas', ...t.domain, t.cluster].map((x) => x.replace(/\s+/g, '_')).join(' ');
  return [front, back, tags, `atlas-${lang}-${t.id}`].join('\t');
}
