/**
 * What every map island (the Explorer and its labs) is given by its page: the graph and
 * term URLs, the UI strings, labels and colours in the page language, and the term
 * panel's tables (A80) — so no island bundles the schema. Build-time only.
 */
import { localise, panelConfig } from './panel-config';
import {
  CLUSTER_LABELS,
  DOMAIN_LABELS,
  FAMILY_COLOURS,
  FAMILY_LABELS,
  GRAPH_UI,
  UI,
  url,
  type Lang,
} from './site';

export const mapIslandProps = (lang: Lang) => ({
  graphUrl: url('graph.json'),
  termBase: url(`${lang}/terms/`),
  ui: { ...UI[lang] },
  clusterLabels: localise(CLUSTER_LABELS, lang),
  graphUi: { ...GRAPH_UI[lang] },
  familyLabels: localise(FAMILY_LABELS, lang),
  familyColours: FAMILY_COLOURS,
  domainLabels: localise(DOMAIN_LABELS, lang),
  panel: panelConfig(lang),
});
