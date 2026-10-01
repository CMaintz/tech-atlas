import { useRef, useState } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import type { PanelView, TimelinePanel } from './types';

type PanelKit = { View: PanelView; graph: Graph };

/** TermPanel's code (with the graph renderer) and graph.json, fetched together. */
async function loadPanelKit(graphUrl: string): Promise<PanelKit> {
  const [m, graph] = await Promise.all([
    import('../TermPanel'),
    fetch(graphUrl).then((r) => {
      if (!r.ok) throw new Error(`${r.status} ${graphUrl}`);
      return r.json() as Promise<Graph>;
    }),
  ]);
  return { View: m.default as unknown as PanelView, graph };
}

/**
 * The Explorer's term panel (A80) on the timeline: its code and graph load on the first
 * click, so the page itself stays a small island. `open` shows a term; `onLoaded` runs
 * once the kit has arrived (a failed load leaves the popover, and a later click retries).
 */
export function useTermPanel(cfg: TimelinePanel | undefined, onLoaded: () => void) {
  const [id, setId] = useState<string | null>(null);
  const [kit, setKit] = useState<PanelKit | null>(null);
  const loading = useRef(false);
  const open = (termId: string) => {
    if (!cfg) return;
    setId(termId);
    if (kit || loading.current) return;
    loading.current = true;
    loadPanelKit(cfg.graphUrl).then(
      (k) => {
        setKit(k);
        onLoaded();
      },
      () => (loading.current = false),
    );
  };
  return { id, setId, kit, open };
}

/** The hosted panel's callbacks: picking a term shows it in the panel; closing hides it. */
export function panelCallbacks(setId: (id: string | null) => void) {
  return { onSelect: setId, onClose: () => setId(null) };
}
