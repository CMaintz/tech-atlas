import { describe, expect, it } from 'vitest';
import { beyondSlop, orbitDragKind } from './drag-feedback';

describe('orbitDragKind (A95)', () => {
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

describe('beyondSlop', () => {
  it('treats a tiny wobble as a click and a real move as a drag', () => {
    expect(beyondSlop(1, 1, 3)).toBe(false);
    expect(beyondSlop(3, 0, 3)).toBe(false);
    expect(beyondSlop(3, 1, 3)).toBe(true);
  });
});
