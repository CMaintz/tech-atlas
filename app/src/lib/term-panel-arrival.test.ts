import { describe, expect, it } from 'vitest';
import { arrivalAnnouncement, focusesName } from './term-panel';

describe('focusesName', () => {
  it('moves focus to the name for a pick from elsewhere or a return to the anchor', () => {
    expect(focusesName({ via: 'other' })).toBe(true);
    expect(focusesName({ via: 'step', index: null })).toBe(true);
  });
  it('keeps focus on Previous/Next and Back/Forward', () => {
    expect(focusesName({ via: 'step', index: 2 })).toBe(false);
    expect(focusesName({ via: 'history' })).toBe(false);
  });
});

describe('arrivalAnnouncement', () => {
  it('is silent when focus moves to the name', () => {
    expect(arrivalAnnouncement('MFA', '2 of 5 · requires', true)).toBe('');
  });
  it('names the term, with its position when it has one', () => {
    expect(arrivalAnnouncement('MFA', '2 of 5 · requires', false)).toBe('MFA - 2 of 5 · requires');
    expect(arrivalAnnouncement('MFA', '', false)).toBe('MFA');
  });
});
