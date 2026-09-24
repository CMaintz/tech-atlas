import { describe, expect, it } from 'vitest';
import { shortNames, slugify } from './redirects';

const t = (id: string, en: string, da: string, akaEn: string[] = [], akaDa: string[] = []) => ({
  id,
  term: { en, da },
  aka: { en: akaEn, da: akaDa },
});

describe('slugify', () => {
  it('lower-cases, hyphenates and spells out Danish letters', () => {
    expect(slugify('Multi-factor Authentication')).toBe('multi-factor-authentication');
    expect(slugify('Kryptering på hvile')).toBe('kryptering-paa-hvile');
    expect(slugify('Sårbarhedsøkonomi Æ')).toBe('saarbarhedsoekonomi-ae');
    expect(slugify('TCP/IP')).toBe('tcp-ip');
    expect(slugify('  (2FA)  ')).toBe('2fa');
    expect(slugify('Déjà vu')).toBe('deja-vu');
  });
});

describe('shortNames', () => {
  const terms = [
    t('security/mfa', 'Multi-factor authentication', 'Multifaktorautentificering', ['MFA']),
    t('security/two-factor-authentication', 'Two-factor authentication', 'Tofaktor', ['2FA']),
    t('security/audit', 'Audit', 'Revision'),
    t('cs/audit', 'Audit logging', 'Revisionslogning'),
    t('cs/token', 'Token', 'Token', ['shared']),
    t('ai/prompt', 'Prompt', 'Prompt', ['shared']),
    t('cs/security', 'Security', 'Sikkerhed'),
  ];
  const map = shortNames(terms);

  it('maps a bare id to its one term', () => {
    expect(map.get('mfa')).toBe('security/mfa');
    expect(map.get('token')).toBe('cs/token');
  });

  it('maps display names and aliases in both languages', () => {
    expect(map.get('multi-factor-authentication')).toBe('security/mfa');
    expect(map.get('multifaktorautentificering')).toBe('security/mfa');
    expect(map.get('2fa')).toBe('security/two-factor-authentication');
    expect(map.get('audit-logging')).toBe('cs/audit');
  });

  it('never redirects a Collision, a folder name, or an ambiguous alias', () => {
    expect(map.has('audit')).toBe(false); // served by the Disambiguation page
    expect(map.has('security')).toBe(false); // a folder
    expect(map.has('shared')).toBe(false); // alias of two terms
  });

  it('lets a bare id win over another term’s alias', () => {
    const m = shortNames([
      t('cs/port', 'Port', 'Port'),
      t('cs/socket', 'Socket', 'Sokkel', ['port']),
    ]);
    expect(m.get('port')).toBe('cs/port');
  });
});
