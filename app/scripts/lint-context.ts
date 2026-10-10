import { loadTerms, makeResolver, type Term } from './load-terms';

export type IdentifiedTerm = Term & { id: string };

export interface LintContext {
  terms: Map<string, Term>;
  list: IdentifiedTerm[];
  resolve: (ref: string, fromId?: string) => string | null;
  byName: Map<string, string[]>;
  errors: string[];
  warnings: string[];
}

export type RawEdge = string | { to: string };

export const refOf = (e: RawEdge) => (typeof e === 'string' ? e : e.to);

export function createLintContext(): LintContext {
  const { terms, errors } = loadTerms();
  const { resolve, byName } = makeResolver(terms);
  const list = [...terms.entries()].map(([id, t]) => ({ ...t, id }));
  return { terms, list, resolve, byName, errors, warnings: [] };
}

export function termOf(ctx: LintContext, id: string): Term {
  const term = ctx.terms.get(id);
  if (!term) throw new Error(`content lint: unknown term id ${id}`);
  return term;
}
