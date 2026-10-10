export const EMAIL_SIGNIN = false;

export const KNOWN_PROVIDERS = ['github', 'linkedin_oidc'] as const;
export type AuthProvider = (typeof KNOWN_PROVIDERS)[number];

export const DEFAULT_PROVIDERS: readonly AuthProvider[] = ['github'];

export function parseAuthProviders(raw: string | undefined | null): AuthProvider[] {
  const asked = new Set(
    (raw ?? '')
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean),
  );
  const found = KNOWN_PROVIDERS.filter((p) => asked.has(p));
  return found.length ? found : [...DEFAULT_PROVIDERS];
}

export function signInOptions(opts: { emailSignin: boolean; providers: readonly AuthProvider[] }): {
  email: boolean;
  providers: AuthProvider[];
  divider: boolean;
} {
  const providers = [...opts.providers];
  return {
    email: opts.emailSignin,
    providers,
    divider: opts.emailSignin && providers.length > 0,
  };
}
