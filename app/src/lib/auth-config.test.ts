import { describe, expect, it } from 'vitest';
import { EMAIL_SIGNIN, parseAuthProviders, signInOptions } from './auth-config';

describe('parseAuthProviders', () => {
  it('defaults to GitHub when unset, empty or unrecognised', () => {
    expect(parseAuthProviders(undefined)).toEqual(['github']);
    expect(parseAuthProviders(null)).toEqual(['github']);
    expect(parseAuthProviders('')).toEqual(['github']);
    expect(parseAuthProviders(' , ')).toEqual(['github']);
    expect(parseAuthProviders('linkedin,facebook')).toEqual(['github']);
  });
  it('keeps known providers, trimmed, deduplicated, in a fixed order', () => {
    expect(parseAuthProviders('github,linkedin_oidc')).toEqual(['github', 'linkedin_oidc']);
    expect(parseAuthProviders(' linkedin_oidc , github ,github')).toEqual([
      'github',
      'linkedin_oidc',
    ]);
    expect(parseAuthProviders('LinkedIn_OIDC')).toEqual(['linkedin_oidc']);
  });
  it('drops unknown names next to known ones', () => {
    expect(parseAuthProviders('linkedin_oidc,google')).toEqual(['linkedin_oidc']);
  });
});

describe('signInOptions', () => {
  it('email sign-in is switched off for now', () => {
    expect(EMAIL_SIGNIN).toBe(false);
    const o = signInOptions({ emailSignin: EMAIL_SIGNIN, providers: ['github'] });
    expect(o.email).toBe(false);
    expect(o.divider).toBe(false);
    expect(o.providers).toEqual(['github']);
  });
  it('shows the "or" divider only between the email form and provider buttons', () => {
    expect(signInOptions({ emailSignin: true, providers: ['github'] }).divider).toBe(true);
    expect(signInOptions({ emailSignin: true, providers: [] }).divider).toBe(false);
  });
  it('offers one button per configured provider', () => {
    const o = signInOptions({ emailSignin: false, providers: ['github', 'linkedin_oidc'] });
    expect(o.providers).toEqual(['github', 'linkedin_oidc']);
  });
});
