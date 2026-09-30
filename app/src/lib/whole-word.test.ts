import { describe, expect, it } from 'vitest';
import { containsWord, escapeRegExp } from './whole-word';

describe('containsWord', () => {
  it('matches a whole word in any case', () => {
    expect(containsWord('Hashing a password', 'hashing')).toBe(true);
    expect(containsWord('what is a HASH?', 'hash')).toBe(true);
    expect(containsWord('rehashing', 'hash')).toBe(false);
    expect(containsWord('hash2', 'hash')).toBe(false);
    expect(containsWord('æblehash', 'hash')).toBe(false);
  });

  it('treats metacharacters in the word literally', () => {
    expect(containsWord('we use C++ here', 'C++')).toBe(true);
    expect(containsWord('we use CCC here', 'C++')).toBe(false);
    expect(containsWord('node.js runs it', 'node.js')).toBe(true);
    expect(containsWord('nodexjs runs it', 'node.js')).toBe(false);
    expect(escapeRegExp('a.b*(c)')).toBe('a\\.b\\*\\(c\\)');
  });
});
