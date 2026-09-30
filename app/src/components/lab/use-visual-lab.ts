/**
 * The visual lab (A96), wired: toggle state from the address, the built maps, the 2D
 * and 3D lab effects, the frame meter and the benchmark. Toggles start from the address
 * (`?curve=bezier&bench=1`); nothing is stored.
 */
import { useEffect, useState } from 'preact/hooks';
import type { Map2D } from '../../lib/explorer-2d';
import type { Map3D } from '../../lib/explorer-3d';
import type { Graph } from '../../lib/graph-model';
import { useTheme } from '../../lib/use-theme';
import {
  DEFAULT_2D,
  DEFAULT_3D,
  changed,
  fromQuery,
  type Lab2D,
  type Lab3D,
} from '../../lib/explorer-lab';
import { CHOICES_2D, CHOICES_3D } from './options';
import { TEXT } from './text';
import { useBenchmark, useFrameMeter } from './use-bench';
import { useLab2D } from './use-lab-2d';
import { useLab3D } from './three/use-lab-3d';

export type Maps = { map2d: Map2D | null; map3d: Map3D | null };
export type VisualLab = ReturnType<typeof useVisualLab>;

type LabProps = {
  view: '2d' | '3d';
  lang: 'en' | 'da';
  graphUrl: string;
  clusterLabels: Record<string, string>;
};

export function useVisualLab({ view, lang, graphUrl, clusterLabels }: LabProps) {
  const t = TEXT[lang];
  // The maps follow the page theme (A92) through their own `retheme`; the lab re-reads
  // the restyled base stylesheet and lays its rules over it again.
  const theme = useTheme();
  const state = useToggles(view);
  const [maps, setMaps] = useState<Maps>({ map2d: null, map3d: null });
  const { meter, bench } = useFrameMeter(t);
  const graph = useGraph(graphUrl);
  useLab2D(maps, graph, state.s2, view, theme);
  useLab3D(maps.map3d, clusterLabels, state.s3, theme);
  const ready = view === '2d' ? !!maps.map2d?.cy && !!graph : !!maps.map3d;
  const run = useBenchmark({ view, maps, ready, active: state.active, bench });
  return { ...state, t, view, maps, setMaps, meter, ready, bench: run };
}

/** 2D and 3D toggles from the address, and this view's differences from today. */
function useToggles(view: '2d' | '3d') {
  const [s2, setS2] = useState<Lab2D>(() =>
    fromQuery(window.location.search, DEFAULT_2D, CHOICES_2D),
  );
  const [s3, setS3] = useState<Lab3D>(() =>
    fromQuery(window.location.search, DEFAULT_3D, CHOICES_3D),
  );
  const active = view === '2d' ? changed(s2, DEFAULT_2D) : changed(s3, DEFAULT_3D);
  return { s2, setS2, s3, setS3, active };
}

/** The graph (for domain colours and importance). */
function useGraph(url: string) {
  const [graph, setGraph] = useState<Graph | null>(null);
  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setGraph);
  }, [url]);
  return graph;
}
