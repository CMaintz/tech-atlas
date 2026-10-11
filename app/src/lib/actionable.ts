import { bareName } from './collisions';

type RawEdge = string | { to: string };

export type ActionableInput = {
  id: string;
  domain: readonly string[];
  cluster: string;
  layer?: string;
  status?: string;
  actionable?: boolean;
  howTo?: unknown;
  edges?: Partial<Record<string, RawEdge[] | undefined>>;
};

export const ACTIONABLE_PARENTS = [
  'control',
  'security-framework',
  'risk-treatment',
  'risk-assessment',
] as const;

export const AI_PRACTICE_CLUSTERS = ['ai-risk', 'agents', 'ai-coding'] as const;

const refs = (t: ActionableInput, type: string) =>
  (t.edges?.[type] ?? []).map((e) => bareName(typeof e === 'string' ? e : e.to));

export function actionableReason(t: ActionableInput): string | null {
  if (t.actionable !== undefined) return t.actionable ? 'explicit' : null;
  if (t.howTo) return 'has howTo';
  if (t.status === 'legacy') return null; // a repealed law or retired practice
  return edgeReason(t) ?? placeReason(t) ?? mitigatesReason(t);
}

function edgeReason(t: ActionableInput): string | null {
  if (refs(t, 'mandates').length) return 'mandates';
  const parent = refs(t, 'kind-of').find((p) =>
    (ACTIONABLE_PARENTS as readonly string[]).includes(p),
  );
  return parent ? `kind-of ${parent}` : null;
}

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
