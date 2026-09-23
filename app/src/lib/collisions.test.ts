import { describe, expect, it } from 'vitest';
import { bareName, collisionForQuery, collisionsOf } from './collisions';

describe('collisionsOf', () => {
  it('lists only bare names held by two or more terms, sorted', () => {
    const c = collisionsOf(['security/token', 'security/audit', 'cs/audit', 'cs/token', 'cs/port']);
    expect([...c.entries()]).toEqual([
      ['audit', ['cs/audit', 'security/audit']],
      ['token', ['cs/token', 'security/token']],
    ]);
  });

  it('is empty when every name is unique', () => {
    expect(collisionsOf(['cs/a', 'security/b']).size).toBe(0);
  });

  it('takes the last path segment as the bare name', () => {
    expect(bareName('security/audit')).toBe('audit');
    expect(bareName('audit')).toBe('audit');
  });
});

describe('collisionForQuery', () => {
  const c = collisionsOf(['cs/audit', 'security/audit', 'cs/access-token', 'ai/access-token']);

  it('matches a shared name exactly, ignoring case, spacing and hyphens', () => {
    expect(collisionForQuery('audit', c)).toBe('audit');
    expect(collisionForQuery('  Audit ', c)).toBe('audit');
    expect(collisionForQuery('access token', c)).toBe('access-token');
    expect(collisionForQuery('Access-Token', c)).toBe('access-token');
  });

  it('ignores partial and longer queries', () => {
    expect(collisionForQuery('aud', c)).toBeNull();
    expect(collisionForQuery('audit logging', c)).toBeNull();
    expect(collisionForQuery('', c)).toBeNull();
  });
});
