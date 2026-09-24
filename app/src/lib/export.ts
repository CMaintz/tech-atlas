/**
 * Open-data exports (A65): every Term as JSON, CSV and Anki import text. Pure — no
 * Astro imports — so the endpoints stay thin and this is unit-tested.
 */
import type { EdgeType, TermData } from '../schema';
import { makeRefResolver } from './graph-model';

type Lang = 'en' | 'da';
const LANGS: Lang[] = ['en', 'da'];

/** The content licence (CONTENT-LICENSE.md, A62). Carried inside every data file. */
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
    .map(({ id, data: d, depth }) => {
      const edges: ExportEdge[] = [];
      for (const [type, list] of Object.entries(d.edges ?? {}) as [
        EdgeType,
        TermData['edges'][EdgeType],
      ][]) {
        for (const e of list ?? []) {
          const ref = typeof e === 'string' ? e : e.to;
          const to = resolve(ref, id);
          if (!to) continue;
          edges.push(
            typeof e === 'string'
              ? { type, to, confidence: 'high', strength: 'normal' }
              : {
                  type,
                  to,
                  ...(e.why ? { why: e.why } : {}),
                  confidence: e.confidence,
                  strength: e.strength,
                },
          );
        }
      }
      return {
        id,
        url: Object.fromEntries(LANGS.map((l) => [l, `${siteUrl}${l}/terms/${id}/`])) as Record<
          Lang,
          string
        >,
        term: d.term,
        aka: d.aka,
        domain: d.domain,
        cluster: d.cluster,
        ...(d.layer ? { layer: d.layer } : {}),
        status: d.status,
        ...(d.era !== undefined ? { era: d.era } : {}),
        summary: d.summary,
        body: d.body,
        edges,
        depth,
        sources: d.sources,
        draft: d.draft,
      };
    });
}

/** RFC 4180 field: quoted when it holds a comma, quote or line break. */
export const csvField = (v: string | number | boolean | undefined) => {
  const s = v === undefined ? '' : String(v);
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
  const rows = terms.map((t) =>
    [
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
    ]
      .map(csvField)
      .join(','),
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** A tab or line break would split an Anki field or note. */
const oneLine = (s: string) => s.replace(/[\t\r\n]+/g, ' ');

/**
 * Anki's plain-text import (File → Import), one note per Term: front = the name,
 * back = summary + plain-language facet + a link back. The header lines tell Anki the
 * separator, that fields are HTML, the deck, and the tags column, so no import
 * settings need touching. Each note carries a stable id (column 4), so re-importing a
 * newer file updates the notes instead of duplicating them.
 */
export function toAnki(terms: ExportTerm[], lang: Lang, deck: string): string {
  const lines = [
    '#separator:tab',
    '#html:true',
    '#notetype:Basic',
    `#deck:${deck}`,
    '#tags column:3',
    '#guid column:4',
  ];
  for (const t of terms) {
    const front = escapeHtml(oneLine(t.term[lang]));
    const back = [
      `<b>${escapeHtml(oneLine(t.summary[lang]))}</b>`,
      escapeHtml(oneLine(t.body.plain[lang])),
      `<a href="${escapeHtml(t.url[lang])}">${escapeHtml(t.url[lang])}</a>`,
    ].join('<br><br>');
    const tags = ['atlas', ...t.domain, t.cluster].map((x) => x.replace(/\s+/g, '_')).join(' ');
    lines.push([front, back, tags, `atlas-${lang}-${t.id}`].join('\t'));
  }
  return lines.join('\n') + '\n';
}
