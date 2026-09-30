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

export type MountOptions = { reduced?: boolean; theme?: MapTheme; reserveRight?: number };

export async function mountMap3D({ reduced = false, theme, reserveRight = 0 }: MountOptions = {}) {
  const dom = installFakeDom(reduced);
  const el = fakeContainer();
  const calls = { select: vi.fn(), hover: vi.fn(), point: vi.fn() };
  const map = await createMap3D({
    container: el,
    graph,
    lang: 'en',
    onSelect: calls.select,
    onHover: calls.hover,
    onPoint: calls.point,
    reserveRight: () => reserveRight,
    theme,
    domainLabels,
    relationNames,
  });
  return { map, fg: built[built.length - 1], dom, el, calls };
}
