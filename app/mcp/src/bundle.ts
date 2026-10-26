import type { EdgeType, Source } from '../../src/schema';
import type { ClientQuestion } from '../../src/lib/question-rules';
import type { SearchDoc } from '../../src/lib/search';

export type Lang = 'en' | 'da';
export const LANGS: readonly Lang[] = ['en', 'da'];
type Localized = Record<Lang, string>;

export type BundleTerm = {
  id: string;
  url: Localized;
  term: Localized;
  aka: Record<Lang, string[]>;
  domain: string[];
  cluster: string;
  summary: Localized;
  body: Record<string, Localized>;
  sources: Source[];
  depth: number;
};

export type BundleLink = { source: string; target: string; type: EdgeType };

export type AtlasBundle = {
  terms: BundleTerm[];
  links: BundleLink[];
  search: SearchDoc[];
  questions: Record<Lang, ClientQuestion[]>;
};
