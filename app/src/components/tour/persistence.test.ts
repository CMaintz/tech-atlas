import { describe, expect, it } from 'vitest';
import { pageHref } from './persistence';

describe('pageHref', () => {
  it('links to the page alone when storage keeps the step', () => {
    expect(pageHref('/en/', 'study/', { step: 4, storageOk: true })).toBe('/en/study/');
  });

  it('carries the step in the query when storage cannot', () => {
    expect(pageHref('/en/', 'study/', { step: 4, storageOk: false })).toBe('/en/study/?tour=4');
  });
});
