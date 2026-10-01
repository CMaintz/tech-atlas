import { describe, expect, it } from 'vitest';
import { ICON_SVG, frameAttrs, tabAttrs } from './attrs';

describe('frameAttrs', () => {
  it('docked: a complementary landmark, not modal', () => {
    expect(frameAttrs(false, 'cs/api')).toEqual({
      role: 'complementary',
      'aria-modal': undefined,
      'aria-labelledby': 'tp-title',
      'data-term-panel': 'cs/api',
      'data-expanded': undefined,
    });
  });
  it('expanded: a modal dialog, marked expanded', () => {
    const a = frameAttrs(true, 'cs/api');
    expect(a.role).toBe('dialog');
    expect(a['aria-modal']).toBe(true);
    expect(a['data-expanded']).toBe('');
  });
  it('keeps the markup order of the attributes', () => {
    expect(Object.keys(frameAttrs(true, 'x'))).toEqual([
      'role',
      'aria-modal',
      'aria-labelledby',
      'data-term-panel',
      'data-expanded',
    ]);
  });
});

describe('tabAttrs', () => {
  it('names the tab after its facet and points it at the facet panel', () => {
    expect(tabAttrs('plain', true)).toEqual({
      role: 'tab',
      id: 'tp-tab-plain',
      'aria-selected': true,
      'aria-controls': 'tp-facet',
      tabIndex: 0,
    });
  });
  it('takes an unselected tab out of the Tab order', () => {
    const a = tabAttrs('formal', false);
    expect(a['aria-selected']).toBe(false);
    expect(a.tabIndex).toBe(-1);
  });
});

describe('ICON_SVG', () => {
  it('is a 16px icon on a 24-unit grid, hidden from assistive technology', () => {
    expect(ICON_SVG.viewBox).toBe('0 0 24 24');
    expect(ICON_SVG.width).toBe('16');
    expect(ICON_SVG['aria-hidden']).toBe('true');
  });
});
