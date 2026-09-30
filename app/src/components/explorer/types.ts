import type { Map2D } from '../../lib/explorer-2d';
import type { Map3D } from '../../lib/explorer-3d';
import type { Mode } from '../../lib/explorer-view';
import type { PanelConfig } from '../TermPanel';

export type Lang = 'en' | 'da';
export type Dict = Record<string, string>;

export interface ExplorerProps {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  ui: Dict;
  clusterLabels: Dict;
  /** Legend and canvas-control strings (site.ts GRAPH_UI). */
  graphUi: Dict;
  familyLabels: Dict;
  familyColours: Dict;
  domainLabels: Dict;
  /** The term panel's strings and data locations (A80). */
  panel: PanelConfig;
  /** The hidden visual lab only (A96): opening view, "show all" and the built maps. */
  lab?: {
    mode: Mode;
    showAll: boolean;
    onMaps: (maps: { map2d: Map2D | null; map3d: Map3D | null }) => void;
  };
  /** The `semantic-search` Edge Function, or '' when none is configured (names only). */
  semanticUrl?: string;
}

/** The control bar's popovers; only one is open at a time ('sheet' = phones' Controls). */
export type Pop = 'links' | 'route' | 'sheet';
