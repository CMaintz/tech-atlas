/**
 * Data behind a term's entry page (`/[lang]/terms/<id>/`): its relations in reading
 * order, the neighbourhood graph, sources by tier, the breadcrumb and the structured data.
 * Build-time only (it reads the content model); the Explorer's panel has its own, in
 * term-panel.ts.
 */
import { EDGE_TYPES, type EdgeType, type Source } from '../schema';
import { FAMILY } from './graph-model';
import { CLUSTER_LABELS, DOMAIN_LABELS, termUrl, url, type Lang } from './site';
import { EDGE_LABELS, RELATION_ORDER, type Relation, type TermEntry } from './terms';
import { TIER_ORDER } from './ui-extra';

/** Relations grouped by type, in a stable reading order; empty groups are left out. */
export const relationsByType = (relations: readonly Relation[]) =>
  RELATION_ORDER.map((type) => ({
    type,
    items: relations.filter((r) => r.type === type),
  })).filter((g) => g.items.length > 0);

/**
 * The authored type behind a relation: a generated inverse ("unlocks") is turned
 * back into the authored edge ("requires").
 */
export const authoredType = (r: Relation): EdgeType =>
  r.generated
    ? ((Object.entries(EDGE_TYPES).find(([, m]) => m.inverse === r.type)?.[0] ??
        r.type) as EdgeType)
    : (r.type as EdgeType);

/** A node of the neighbourhood graph (Graph.tsx); `focus` marks the page's own term. */
const graphNode = (t: TermEntry, focus: boolean, lang: Lang) => ({
  id: t.id,
  label: t.data.term[lang],
  focus,
  domain: t.data.domain,
  cluster: t.data.cluster,
});

/** An edge of the neighbourhood graph, drawn in its authored direction. */
function graphEdge(termId: string, r: Relation, lang: Lang) {
  const type = authoredType(r);
  return {
    source: r.generated ? r.target.id : termId,
    target: r.generated ? termId : r.target.id,
    type,
    family: FAMILY[type],
    label: EDGE_LABELS[type]?.[lang] ?? type,
  };
}

/** The neighbourhood graph: this term and every directly related term. */
export function termNeighbourhood(term: TermEntry, relations: readonly Relation[], lang: Lang) {
  const nodes = new Map([[term.id, graphNode(term, true, lang)]]);
  for (const r of relations) nodes.set(r.target.id, graphNode(r.target, false, lang));
  return {
    nodes: [...nodes.values()],
    edges: relations.map((r) => graphEdge(term.id, r, lang)),
  };
}

/** Continue learning (SPEC §7): sources grouped by tier, best tier first. */
export const sourcesByTier = (sources: readonly Source[]) =>
  TIER_ORDER.map((tier) => ({
    tier,
    items: sources.filter((s) => s.tier === tier),
  })).filter((g) => g.items.length > 0);

/** Breadcrumb: Index › primary domain (the folder) › cluster — anchors on the home index. */
export function termCrumbs(term: TermEntry, lang: Lang, indexLabel: string) {
  const primary = term.id.split('/')[0];
  const cluster = term.data.cluster;
  return [
    { href: url(`${lang}/`), label: indexLabel },
    { href: url(`${lang}/#domain-${primary}`), label: DOMAIN_LABELS[primary]?.[lang] ?? primary },
    {
      href: url(`${lang}/#cluster-${primary}-${cluster}`),
      label: CLUSTER_LABELS[cluster]?.[lang] ?? cluster,
    },
  ];
}

/** Structured data: a schema.org DefinedTerm in the Atlas DefinedTermSet. */
export function termJsonLd(term: TermEntry, lang: Lang, site: URL | undefined) {
  const d = term.data;
  const aka = d.aka[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': new URL(termUrl(lang, term.id), site).href,
    name: d.term[lang],
    ...(aka.length ? { alternateName: aka } : {}),
    description: d.summary[lang],
    inLanguage: lang,
    url: new URL(termUrl(lang, term.id), site).href,
    inDefinedTermSet: definedTermSet(lang, site),
    license: 'https://creativecommons.org/licenses/by-sa/4.0/',
  };
}

const definedTermSet = (lang: Lang, site: URL | undefined) => ({
  '@type': 'DefinedTermSet',
  name: 'Atlas',
  url: new URL(url(`${lang}/`), site).href,
});
