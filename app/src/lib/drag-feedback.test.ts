import { describe, expect, it } from 'vitest';
import { orbitDragKind } from './drag-feedback';

describe('orbitDragKind', () => {
  it('orbits on a plain left drag', () => {
    expect(orbitDragKind({ button: 0 })).toBe('orbit');
  });
  it('pans on a right drag or a left drag with Ctrl, Cmd or Shift', () => {
    expect(orbitDragKind({ button: 2 })).toBe('pan');
    expect(orbitDragKind({ button: 0, ctrlKey: true })).toBe('pan');
    expect(orbitDragKind({ button: 0, metaKey: true })).toBe('pan');
    expect(orbitDragKind({ button: 0, shiftKey: true })).toBe('pan');
  });
  it('shows nothing for the middle button (it zooms)', () => {
    expect(orbitDragKind({ button: 1 })).toBeNull();
  });
});
