import { parseAuthProviders } from './auth-config';
import { UI_ACCOUNT } from './strings/account';
import { UI_COMPARE } from './strings/compare';
import { UI_EXPLORER } from './strings/explorer';
import { UI_HOME } from './strings/home';
import { UI_LAYOUT } from './strings/layout';
import { UI_STUDY } from './strings/study';
import { UI_TERM } from './strings/term';
import { UI_TIMELINE } from './strings/timeline';
import { UI_TOUR } from './strings/tour';
import type { Lang } from './lang';

export { LANGS, type Bi, type Lang } from './lang';

const rawBase = import.meta.env.BASE_URL;
export const BASE = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export const url = (path = '') => BASE + path.replace(/^\//, '');

export const SUPABASE_URL: string = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '';
export const ACCOUNTS = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const AUTH_PROVIDERS = parseAuthProviders(import.meta.env.PUBLIC_AUTH_PROVIDERS);

export const SEMANTIC_SEARCH_URL: string = (import.meta.env.PUBLIC_SEMANTIC_SEARCH_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export const FEEDBACK_URL: string = (import.meta.env.PUBLIC_FEEDBACK_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

export const termUrl = (lang: Lang, id: string) => url(`${lang}/terms/${id}/`);

export const swapLang = (pathname: string, to: Lang) =>
  pathname.startsWith(BASE + 'en') || pathname.startsWith(BASE + 'da')
    ? BASE + to + pathname.slice(BASE.length + 2)
    : url(`${to}/`);

export const REPO = 'https://github.com/CMaintz/tech-atlas';

export const UI = {
  en: {
    ...UI_LAYOUT.en,
    ...UI_HOME.en,
    ...UI_STUDY.en,
    ...UI_EXPLORER.en,
    ...UI_TERM.en,
    ...UI_COMPARE.en,
    ...UI_TIMELINE.en,
    ...UI_ACCOUNT.en,
    ...UI_TOUR.en,
  },
  da: {
    ...UI_LAYOUT.da,
    ...UI_HOME.da,
    ...UI_STUDY.da,
    ...UI_EXPLORER.da,
    ...UI_TERM.da,
    ...UI_COMPARE.da,
    ...UI_TIMELINE.da,
    ...UI_ACCOUNT.da,
    ...UI_TOUR.da,
  },
} as const;

export {
  CLUSTER_LABELS,
  DOMAIN_LABELS,
  FAMILY_LABELS,
  clusterLabel,
  domainLabel,
} from './strings/taxonomy';
export { CLUSTER_COLOURS, FAMILY_COLOURS } from './graph-style';
export { GRAPH_UI } from './strings/explorer';
export { PANEL_UI } from './strings/panel';
export { DEEP_UI } from './strings/term';
export { TIMELINE_UI } from './strings/timeline';
export { TOUR_PAIR, TOUR_STEPS, TOUR_TERM } from './strings/tour';
export { ABOUT_LINKS, ABOUT_PEOPLE, ABOUT_UI, type AboutPerson } from './strings/about';
