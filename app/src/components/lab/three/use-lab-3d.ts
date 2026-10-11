import { useEffect, useRef, type MutableRef } from 'preact/hooks';
import type { Map3D } from '../../../lib/explorer-3d';
import type { LabLook } from './context';
import { setup3D, type Lab3DRuntime } from './runtime';

type RuntimeSlot = { three: MutableRef<Lab3DRuntime | null>; look: LabLook };

export function useLab3D(
  map3d: Map3D | null,
  clusterLabels: Record<string, string>,
  look: LabLook,
) {
  const three = useRef<Lab3DRuntime | null>(null);
  const { s, theme } = look;
  useEffect(() => mountRuntime(map3d, clusterLabels, { three, look }), [map3d]);
  useEffect(() => three.current?.apply(s, theme), [s, theme]);
}

function mountRuntime(
  map3d: Map3D | null,
  clusterLabels: Record<string, string>,
  { three, look }: RuntimeSlot,
) {
  if (!map3d) return;
  let cancelled = false;
  void setup3D(map3d, clusterLabels).then((rt) => {
    if (cancelled) return rt.dispose();
    three.current = rt;
    rt.apply(look.s, look.theme);
  });
  return () => {
    cancelled = true;
    three.current?.dispose();
    three.current = null;
  };
}
