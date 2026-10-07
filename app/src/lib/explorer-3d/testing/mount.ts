/**
 * Mounts the real 3D map over the fakes (the test file mocks '3d-force-graph' with
 * `FakeForceGraph3D` and './drag-feedback'). Returns the map, its fake graph, the fake
 * browser and the callbacks it made.
 */
import { vi } from 'vitest';
import type { MapTheme } from '../../graph-style';
import { createMap3D } from '../../explorer-3d';
import { built } from './fake-force-graph';
import { fakeContainer, installFakeDom } from './fake-dom';
import { domainLabels, graph, relationNames } from './fixture';

export type MountOptions = {
  reduced?: boolean;
  theme?: MapTheme;
  reserveRight?: number;
  variant?: 'v2';
};

export async function mountMap3D(opts: MountOptions = {}) {
  const { reduced = false, theme, reserveRight = 0, variant } = opts;
  const dom = installFakeDom(reduced);
  const el = fakeContainer();
  const calls = { select: vi.fn(), hover: vi.fn(), point: vi.fn() };
  const hands = { onSelect: calls.select, onHover: calls.hover, onPoint: calls.point };
  const map = await createMap3D({
    ...hands,
    container: el,
    graph,
    lang: 'en',
    reserveRight: () => reserveRight,
    ...{ theme, domainLabels, relationNames, variant },
  });
  return { map, fg: built[built.length - 1], dom, el, calls };
}
