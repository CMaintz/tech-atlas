import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEARNER_KEY, learnerExport } from './learner';
import { LANG_SUGGEST_KEY, RECENT_KEY, THEME_KEY } from './prefs';
import { CONTROLLER, DATA, PRIVACY_UI, PROCESSORS, STORAGE } from './privacy';
import { TOUR_DONE_KEY, TOUR_KEY, TOUR_SNOOZE_KEY } from './tour';

const listed = new Set(STORAGE.map((s) => s.key));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx|astro)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

describe('privacy page: browser storage inventory', () => {
  it('lists every exported storage key', () => {
    for (const key of [
      LEARNER_KEY,
      RECENT_KEY,
      LANG_SUGGEST_KEY,
      THEME_KEY,
      TOUR_KEY,
      TOUR_DONE_KEY,
      TOUR_SNOOZE_KEY,
    ]) {
      expect(listed, key).toContain(key);
    }
  });

  it('lists every storage key used anywhere in the source', () => {
    // A string literal on a line that defines a *_KEY constant or calls Web Storage.
    const storageLine = /(_KEY\s*=|Storage\.|getItem\(|setItem\(|removeItem\()/;
    const literal = /['"`](atlas[.:][\w.:-]+)['"`]/g;
    const found = new Set<string>();
    for (const file of sources(join(__dirname, '..'))) {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        if (!storageLine.test(line)) continue;
        for (const m of line.matchAll(literal)) found.add(m[1]);
      }
    }
    expect(found.size).toBeGreaterThan(5);
    for (const key of found) expect(listed, `${key} is not on the privacy page`).toContain(key);
  });

  it('lists the Supabase session keys', () => {
    expect(listed).toContain('sb-<project>-auth-token');
    expect([...listed].some((k) => k.endsWith('code-verifier'))).toBe(true);
  });
});

describe('privacy page: content', () => {
  it('names the data controller', () => {
    expect(CONTROLLER).toEqual({
      name: 'Christoffer Maintz Andersen',
      email: 'cmaintz@outlook.com',
    });
  });

  it('is complete in both languages', () => {
    const texts = [
      ...STORAGE.map((s) => s.purpose),
      ...PROCESSORS.map((p) => p.role),
      ...DATA.flatMap((d) => [d.title, d.what, d.why, d.where, d.basis, d.retention]),
    ];
    for (const t of texts) {
      expect(t.en.trim()).not.toBe('');
      expect(t.da.trim()).not.toBe('');
    }
    expect(Object.keys(PRIVACY_UI.da).sort()).toEqual(Object.keys(PRIVACY_UI.en).sort());
    expect(PRIVACY_UI.da.rights).toHaveLength(PRIVACY_UI.en.rights.length);
    expect(PRIVACY_UI.en.controller).toContain('{name}');
    expect(PRIVACY_UI.da.controller).toContain('{name}');
  });

  it('gives every processing activity a GDPR Art. 6 basis', () => {
    for (const d of DATA) {
      expect(d.basis.en).toMatch(/6\(1\)\([a-f]\)/);
      expect(d.basis.da).toMatch(/art\. 6, stk\. 1, litra [a-f]/);
    }
  });
});

describe('learnerExport', () => {
  it('is the stored progress, labelled and dated', () => {
    const l = { terms: { 'security/mfa': { box: 2, due: 5, right: 3, wrong: 1 } } };
    const out = JSON.parse(learnerExport(l, Date.UTC(2026, 8, 25)));
    expect(out).toEqual({
      format: LEARNER_KEY,
      exportedAt: '2026-09-25T00:00:00.000Z',
      terms: l.terms,
    });
  });
});
