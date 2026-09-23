import { describe, expect, it } from 'vitest';
import { parseIntent } from './intent';
import { pairSlugFromIds } from './slug';

describe('parseIntent', () => {
  it('reads comparisons', () => {
    expect(parseIntent('IDS vs IPS')).toEqual({ kind: 'compare', a: 'IDS', b: 'IPS' });
    expect(parseIntent('compare authentication and authorization')).toEqual({
      kind: 'compare',
      a: 'authentication',
      b: 'authorization',
    });
    expect(parseIntent('NIS2 mod GDPR')).toEqual({ kind: 'compare', a: 'NIS2', b: 'GDPR' });
  });

  it('reads routes', () => {
    expect(parseIntent('how are phishing and MFA related?')).toEqual({
      kind: 'route',
      a: 'phishing',
      b: 'MFA',
    });
    expect(parseIntent('from DNS to TLS')).toEqual({ kind: 'route', a: 'DNS', b: 'TLS' });
    expect(parseIntent('hvordan hænger NIS2 og backup sammen')).toEqual({
      kind: 'route',
      a: 'NIS2',
      b: 'backup',
    });
    expect(parseIntent('network -> firewall')).toEqual({ kind: 'route', a: 'network', b: 'firewall' });
  });

  it('reads prerequisite questions', () => {
    expect(parseIntent('what do I need before zero trust?')).toEqual({ kind: 'before', a: 'zero trust' });
    expect(parseIntent('før risikostyring')).toEqual({ kind: 'before', a: 'risikostyring' });
  });

  it('leaves ordinary queries alone', () => {
    expect(parseIntent('phishing')).toBeNull();
    expect(parseIntent('multi factor')).toBeNull();
  });
});

describe('pairSlugFromIds', () => {
  it('is order-independent and disambiguates same-name collisions', () => {
    expect(pairSlugFromIds('cs/authorization', 'cs/authentication')).toBe(
      'authentication-vs-authorization',
    );
    expect(pairSlugFromIds('security/audit', 'cs/audit')).toBe('cs.audit-vs-security.audit');
  });
});
