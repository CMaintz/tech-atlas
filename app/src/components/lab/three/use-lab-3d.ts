/** Build the visual lab's (A96) 3D runtime for each 3D map and apply the toggles to it. */
import { useEffect, useRef } from 'preact/hooks';
import type { Map3D } from '../../../lib/explorer-3d';
import type { MapTheme } from '../../../lib/graph-style';
import type { Lab3D } from '../../../lib/explorer-lab';
import { setup3D, type Lab3DRuntime } from './runtime';

export function useLab3D(
  map3d: Map3D | null,
  clusterLabels: Record<string, string>,
  s3: Lab3D,
  theme: MapTheme,
) {
  const three = useRef<Lab3DRuntime | null>(null);
  useEffect(() => {
    if (!map3d) return;
    let cancelled = false;
    void setup3D(map3d, clusterLabels).then((rt) => {
      if (cancelled) return rt.dispose();
      three.current = rt;
      rt.apply(s3, theme);
    });
    return () => {
      cancelled = true;
      three.current?.dispose();
      three.current = null;
    };
  }, [map3d]);
  useEffect(() => three.current?.apply(s3, theme), [s3, theme]);
}
