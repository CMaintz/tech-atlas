import { describe, expect, it } from 'vitest';
import { moveIndex, openIndex } from './dropdowns';
import { themeColour } from './theme-menu';

describe('openIndex', () => {
  it('focuses the first, the last, or the checked item', () => {
    expect(openIndex('first', 2, 3)).toBe(0);
    expect(openIndex('last', 0, 3)).toBe(2);
    expect(openIndex('current', 1, 3)).toBe(1);
  });

  it('falls back to the first item when none is checked', () => {
    expect(openIndex('current', -1, 3)).toBe(0);
  });
});

describe('moveIndex', () => {
  it('moves with the arrow keys and wraps at both ends', () => {
    expect(moveIndex('ArrowDown', 0, 3)).toBe(1);
    expect(moveIndex('ArrowDown', 2, 3)).toBe(0);
    expect(moveIndex('ArrowUp', 0, 3)).toBe(2);
  });

  it('jumps with Home and End', () => {
    expect(moveIndex('Home', 2, 3)).toBe(0);
    expect(moveIndex('End', 0, 3)).toBe(2);
  });

  it('ignores every other key', () => {
    expect(moveIndex('Escape', 0, 3)).toBeNull();
    expect(moveIndex('a', 0, 3)).toBeNull();
  });
});

describe('themeColour', () => {
  it('matches the page background of each theme', () => {
    expect(themeColour('light')).toBe('#ffffff');
    expect(themeColour('dark')).toBe('#0a0a0a');
  });
});
