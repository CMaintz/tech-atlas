import { describe, expect, it } from 'vitest';
import { H_ZOOM } from '../../lib/timeline-layout';
import { canZoom, zoomBy } from './zoom';

const max = H_ZOOM.length - 1;

describe('canZoom', () => {
  it('allows a step that stays within the zoom levels', () => {
    expect(canZoom(0, 1)).toBe(max >= 1);
    expect(canZoom(max, -1)).toBe(max >= 1);
  });
  it('refuses to step past either end', () => {
    expect(canZoom(0, -1)).toBe(false);
    expect(canZoom(max, 1)).toBe(false);
  });
});

describe('zoomBy', () => {
  it('moves one level in or out', () => {
    expect(zoomBy(0, 1)).toBe(Math.min(1, max));
    expect(zoomBy(max, -1)).toBe(Math.max(0, max - 1));
  });
  it('holds the level at either end', () => {
    expect(zoomBy(0, -1)).toBe(0);
    expect(zoomBy(max, 1)).toBe(max);
  });
});
