import { describe, expect, it } from 'vitest';
import { orThrow } from './or-throw';

describe('orThrow', () => {
  it('keeps falsy values that are present', () => {
    expect(orThrow(0, 'count')).toBe(0);
    expect(orThrow('', 'label')).toBe('');
  });

  it('throws on null as well as undefined, naming what is missing', () => {
    expect(() => orThrow(null, 'The map container')).toThrow('The map container is missing');
    expect(() => orThrow(undefined, 'term x')).toThrow('term x is missing');
  });
});
