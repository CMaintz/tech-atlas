import { describe, expect, it } from 'vitest';
import { EXPLORER } from './explorer-config';
import { beyondSlop, orbitDragKind, ringBox, ringPaint } from './drag-feedback';

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

describe('the drag ring', () => {
  it('is a hidden circle centred on the pointer, letting it through', () => {
    const box = ringBox(30);
    expect(box).toMatchObject({ width: '30px', height: '30px', borderRadius: '50%' });
    expect(box).toMatchObject({ marginLeft: '-15px', marginTop: '-15px' });
    expect(box).toMatchObject({ pointerEvents: 'none', opacity: '0', visibility: 'hidden' });
  });
  it('takes its colours from the page theme, with the config as fallback', () => {
    const paint = ringPaint(EXPLORER.drag);
    expect(paint.border).toBe(`1.5px solid var(--drag-ring, ${EXPLORER.drag.ringColour})`);
    expect(paint.boxShadow).toContain(`var(--drag-outline, ${EXPLORER.drag.ringOutline})`);
    expect(paint.background.match(/linear-gradient/g)).toHaveLength(2);
  });
});
