import { useRef, useState, type MutableRef } from 'preact/hooks';
import type { Graph } from '../../lib/graph-model';
import type { PanelView, TimelinePanel } from './types';

type PanelKit = { View: PanelView; graph: Graph };

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

export function useTermPanel(cfg: TimelinePanel | undefined, onLoaded: () => void) {
  const [id, setId] = useState<string | null>(null);
  const [kit, setKit] = useState<PanelKit | null>(null);
  const loading = useRef(false);
  const open = (termId: string) => {
    if (!cfg) return;
    setId(termId);
    if (kit || loading.current) return;
    loadKitOnce(cfg.graphUrl, loading, (k) => {
      setKit(k);
      onLoaded();
    });
  };
  return { id, setId, kit, open };
}

function loadKitOnce(graphUrl: string, loading: MutableRef<boolean>, onKit: (k: PanelKit) => void) {
  loading.current = true;
  loadPanelKit(graphUrl).then(onKit, () => (loading.current = false));
}
