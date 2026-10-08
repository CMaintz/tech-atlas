import { existsSync, readFileSync } from 'node:fs';
import { globSync } from 'tinyglobby';
import { LAYERS } from '../src/schema';
import { actionableReason, howToIssues, isActionable } from '../src/lib/actionable';
import { forbiddenDashes } from '../src/lib/lint-rules';
import type { LintContext } from './lint-context';
import type { Term } from './load-terms';

const LEADING_ARTICLE = /^(a|an|the|en|et|den|det|de)\s+/;
const NAME_BOUNDARY = /^[\s,.:;\u2014-]/;

interface NameOwners {
  names: Map<string, string>;
  aliases: Map<string, string>;
}

function checkTautology(ctx: LintContext, id: string, t: Term) {
  for (const lang of ['en', 'da'] as const) {
    const name = t.term[lang].toLowerCase();
    const opening = t.summary[lang].toLowerCase().replace(LEADING_ARTICLE, '');
    if (opening.startsWith(name) && NAME_BOUNDARY.test(opening.slice(name.length) || ' ')) {
      ctx.errors.push(
        `E6 tautological summary (${lang}): ${id} starts by restating "${t.term[lang]}"`,
      );
    }
  }
}

function checkLayer(ctx: LintContext, id: string, t: Term) {
  const layer = t.layer;
  if (!layer || t.domain.some((d) => (LAYERS[d] as readonly string[]).includes(layer))) return;
  ctx.errors.push(`E8 layer "${layer}" does not belong to any of ${id}'s domains`);
}

function registerNames(names: Map<string, string>, id: string, t: Term) {
  for (const n of new Set([t.term.en, t.term.da].map((x) => x.toLowerCase()))) names.set(n, id);
  names.set(id.slice(id.lastIndexOf('/') + 1).replace(/-/g, ' '), id);
}

function checkTermAliases(ctx: LintContext, owners: NameOwners, [id, t]: [string, Term]) {
  for (const alias of new Set([...t.aka.en, ...t.aka.da].map((x) => x.toLowerCase()))) {
    const owner = owners.names.get(alias) ?? owners.names.get(alias.replace(/-/g, ' '));
    if (owner && owner !== id)
      ctx.errors.push(`E7 alias "${alias}" on ${id} is the name of ${owner}`);
    const other = owners.aliases.get(alias);
    if (other && other !== id) {
      ctx.errors.push(`E7 alias "${alias}" is claimed by both ${other} and ${id}`);
    }
    owners.aliases.set(alias, id);
  }
}

export function checkNames(ctx: LintContext) {
  const owners: NameOwners = { names: new Map(), aliases: new Map() };
  for (const [id, t] of ctx.terms) {
    checkTautology(ctx, id, t);
    checkLayer(ctx, id, t);
    registerNames(owners.names, id, t);
  }
  for (const entry of ctx.terms) checkTermAliases(ctx, owners, entry);
}

export function checkArticleFiles(ctx: LintContext) {
  for (const [id, t] of ctx.terms) {
    const paths = Object.values(t.article ?? {}).filter((path) => path && !existsSync(path));
    for (const path of paths) ctx.errors.push(`E9 ${id}: article file not found: ${path}`);
  }
}

export function checkForbiddenDashes(ctx: LintContext) {
  for (const path of globSync('src/content/**/*.{yaml,md}').sort()) {
    for (const f of forbiddenDashes(readFileSync(path, 'utf8'))) {
      ctx.errors.push(`E12 ${path}:${f.line}: ${f.char} dash, write "-" instead: "${f.excerpt}"`);
    }
  }
}

export interface HowToCoverage {
  withHowTo: number;
  actionable: number;
  actionableWithout: number;
}

export function checkHowTos(ctx: LintContext): HowToCoverage {
  const coverage: HowToCoverage = { withHowTo: 0, actionable: 0, actionableWithout: 0 };
  for (const t of ctx.list) {
    if (t.howTo) {
      coverage.withHowTo++;
      for (const issue of howToIssues(t.howTo)) ctx.errors.push(`E13 ${t.id}: howTo ${issue}`);
    }
    if (!isActionable(t)) continue;
    coverage.actionable++;
    if (t.howTo) continue;
    coverage.actionableWithout++;
    ctx.warnings.push(`W11 actionable but no howTo: ${t.id} (${actionableReason(t)})`);
  }
  return coverage;
}
