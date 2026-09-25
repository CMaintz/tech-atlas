/**
 * No en/em dashes in user-facing UI strings (A94; the content files are covered by lint
 * E12). Walks the exported values, not the file text, so code comments may keep theirs.
 */
import { describe, expect, it } from 'vitest';
import * as site from './site';
import * as privacy from './privacy';
import * as uiExtra from './ui-extra';
import * as about from './about';
import * as tour from './tour';
import { FORBIDDEN_DASHES } from './lint-rules';

/** Every string reachable from `value`, with its path. */
function strings(value: unknown, path: string, out: [string, string][] = []): [string, string][] {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out);
  return out;
}

const MODULES = { site, privacy, uiExtra, about, tour };

describe('user-facing strings', () => {
  it('scans a meaningful number of strings', () => {
    expect(strings(MODULES, '').length).toBeGreaterThan(500);
  });

  it.each(Object.entries(MODULES))('%s has no en/em dash (write "-")', (_, mod) => {
    const bad = strings(mod, '').filter(([, s]) => new RegExp(FORBIDDEN_DASHES).test(s));
    expect(bad).toEqual([]);
  });
});
