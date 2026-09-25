/**
 * The term panel's page-rendered tables (A80), built once per page so the island never
 * bundles the schema. Shared by the Explorer and the Timeline (A81). Build-time only.
 */
import type { PanelConfig } from '../components/TermPanel';
import { EDGE_TYPES } from '../schema';
import { PANEL_UI, UI, url, type Lang } from './site';
import { EDGE_LABELS, RELATION_ORDER } from './terms';

/** `{ key: { en, da } }` → `{ key: text }` in one language. */
export const localise = (m: Record<string, Record<Lang, string>>, lang: Lang) =>
  Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v[lang]]));

export const panelConfig = (lang: Lang): PanelConfig => ({
  apiBase: url('api/terms/'),
  graphUrl: url('graph.json'),
  ui: { ...UI[lang] },
  text: { ...PANEL_UI[lang] },
  edgeLabels: localise(EDGE_LABELS, lang),
  edgeInverse: Object.fromEntries(Object.entries(EDGE_TYPES).map(([k, v]) => [k, v.inverse])),
  relationOrder: RELATION_ORDER,
});
