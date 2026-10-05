/**
 * Which terms are "actionable": something you do or implement (a process,
 * control, practice, framework, law you must comply with, tool or technique), so the
 * term should say how to put it into practice (`howTo`). Pure, so the lint (W11), the
 * follow-up report and the tests share one definition. The rules are documented in
 * content/AUTHORING.md ("How to put it into practice").
 */

type RawEdge = string | { to: string };

export type ActionableInput = {
  /** `domain/id`, e.g. `security/mfa`. */
  id: string;
  domain: readonly string[];
  cluster: string;
  layer?: string;
  status?: string;
  actionable?: boolean;
  howTo?: unknown;
  edges?: Partial<Record<string, RawEdge[] | undefined>>;
};

/** `kind-of` parents that make a term actionable: it is a control, framework, treatment or assessment. */
export const ACTIONABLE_PARENTS = [
  'control',
  'security-framework',
  'risk-treatment',
  'risk-assessment',
] as const;

/** AI clusters whose `mitigates` terms are practices (not modelling techniques). */
export const AI_PRACTICE_CLUSTERS = ['ai-risk', 'agents', 'ai-coding'] as const;

const bare = (ref: string) => ref.split('/').pop()!;
const refs = (t: ActionableInput, type: string) =>
  (t.edges?.[type] ?? []).map((e) => bare(typeof e === 'string' ? e : e.to));

/**
 * Why a term counts as actionable, or null when it does not. In order: the explicit
 * `actionable` field; an authored `howTo`; not when `status: legacy`; a `mandates` edge (a law, standard or
 * framework to comply with); `kind-of` a control, framework, treatment or assessment;
 * the security `controls` cluster; security `incident-response` plans and exercises
 * (layer governance or people); platform delivery and process practices; a `mitigates`
 * edge (in AI only for the risk, agent and coding clusters).
 */
export function actionableReason(t: ActionableInput): string | null {
  if (t.actionable !== undefined) return t.actionable ? 'explicit' : null;
  if (t.howTo) return 'has howTo';
  if (t.status === 'legacy') return null; // a repealed law or retired practice
  return edgeReason(t) ?? placeReason(t) ?? mitigatesReason(t);
}

/** A `mandates` edge, or `kind-of` one of the actionable parents. */
function edgeReason(t: ActionableInput): string | null {
  if (refs(t, 'mandates').length) return 'mandates';
  const parent = refs(t, 'kind-of').find((p) =>
    (ACTIONABLE_PARENTS as readonly string[]).includes(p),
  );
  return parent ? `kind-of ${parent}` : null;
}

/** Where the term sits: its domain folder, cluster and layer. */
function placeReason(t: ActionableInput): string | null {
  const folder = t.id.split('/')[0];
  if (folder === 'security' && t.cluster === 'controls') return 'controls cluster';
  if (
    folder === 'security' &&
    t.cluster === 'incident-response' &&
    (t.layer === 'governance' || t.layer === 'people')
  )
    return 'incident-response plan or exercise';
  if (folder === 'platform' && (t.layer === 'delivery' || t.layer === 'process'))
    return 'platform practice';
  return null;
}

/** A `mitigates` edge; in AI only for the practice clusters. */
function mitigatesReason(t: ActionableInput): string | null {
  if (!refs(t, 'mitigates').length) return null;
  const ai = t.id.split('/')[0] === 'ai';
  return !ai || (AI_PRACTICE_CLUSTERS as readonly string[]).includes(t.cluster)
    ? 'mitigates'
    : null;
}

export const isActionable = (t: ActionableInput) => actionableReason(t) !== null;

type List = { en: string[]; da: string[] };
export type HowToShape = {
  steps: List;
  pitfalls?: List;
  guides: { url: string }[];
};

/**
 * E13: what the schema cannot see in a `howTo` (its counts, lengths and URLs are
 * E10): blank items and a guide listed twice.
 */
export function howToIssues(h: HowToShape): string[] {
  return [...blankItems(h), ...repeatedGuides(h)];
}

function blankItems(h: HowToShape): string[] {
  const out: string[] = [];
  for (const [name, list] of [
    ['steps', h.steps],
    ['pitfalls', h.pitfalls],
  ] as const) {
    for (const lang of ['en', 'da'] as const) {
      (list?.[lang] ?? []).forEach((s, i) => {
        if (!s.trim()) out.push(`${name}.${lang}[${i}] is blank`);
      });
    }
  }
  return out;
}

function repeatedGuides(h: HowToShape): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of h.guides) {
    const key = g.url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) out.push(`guide listed twice: ${g.url}`);
    seen.add(key);
  }
  return out;
}
