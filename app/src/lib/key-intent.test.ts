import { describe, expect, it } from 'vitest';
import { arrowDir, isField, isTyping, tabKeyTarget } from './key-intent';

describe('arrowDir', () => {
  it('maps ←/→ to a direction and anything else to 0', () => {
    expect(arrowDir('ArrowRight')).toBe(1);
    expect(arrowDir('ArrowLeft')).toBe(-1);
    expect(arrowDir('ArrowUp')).toBe(0);
    expect(arrowDir('a')).toBe(0);
  });
});

describe('isField / isTyping', () => {
  it('treats inputs, textareas and selects as fields', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) expect(isField({ tagName })).toBe(true);
    expect(isField({ tagName: 'BUTTON' })).toBe(false);
    expect(isField(null)).toBe(false);
  });
  it('counts editable content as typing, but not as a field', () => {
    const editable = { tagName: 'DIV', isContentEditable: true };
    expect(isField(editable)).toBe(false);
    expect(isTyping(editable)).toBe(true);
    expect(isTyping({ tagName: 'INPUT' })).toBe(true);
    expect(isTyping({ tagName: 'DIV', isContentEditable: false })).toBe(false);
    expect(isTyping(undefined)).toBe(false);
  });
});

describe('tabKeyTarget', () => {
  it('wraps ←/→ through the tabs', () => {
    expect(tabKeyTarget('ArrowRight', 0, 4)).toBe(1);
    expect(tabKeyTarget('ArrowRight', 3, 4)).toBe(0);
    expect(tabKeyTarget('ArrowLeft', 0, 4)).toBe(3);
  });
  it('jumps to the ends with Home/End', () => {
    expect(tabKeyTarget('Home', 2, 4)).toBe(0);
    expect(tabKeyTarget('End', 0, 4)).toBe(3);
  });
  it('ignores other keys', () => {
    expect(tabKeyTarget('Enter', 1, 4)).toBeNull();
  });
});
