/**
 * Which ways to sign in the account page offers (A87). Pure, so it is unit-tested;
 * `site.ts` applies it to the build's environment.
 */

/**
 * Email magic-link sign-in. Off until the site has a mail setup of its own (Supabase's
 * built-in mailer only reaches the project's own members) — flip to `true` to bring the
 * email field back; everything behind it (account.ts `signInWithEmail`) still works.
 */
export const EMAIL_SIGNIN = false;

/** OAuth providers the site knows how to offer, in the order their buttons appear. */
export const KNOWN_PROVIDERS = ['github', 'linkedin_oidc'] as const;
export type AuthProvider = (typeof KNOWN_PROVIDERS)[number];

/** Offered when the build sets nothing: GitHub is the provider every setup starts with. */
export const DEFAULT_PROVIDERS: readonly AuthProvider[] = ['github'];

/**
 * Parse `PUBLIC_AUTH_PROVIDERS` (comma-separated, e.g. `github,linkedin_oidc`). Unknown
 * names are ignored, so a typo never shows a broken button; unset, empty or nothing
 * recognised → the default. Returned in the fixed order of KNOWN_PROVIDERS.
 */
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

/** What the signed-out account view shows: the email form or not, and one button per provider. */
export function signInOptions(opts: { emailSignin: boolean; providers: readonly AuthProvider[] }): {
  email: boolean;
  providers: AuthProvider[];
  /** An "or" between the email form and the buttons — only when both are shown. */
  divider: boolean;
} {
  const providers = [...opts.providers];
  return {
    email: opts.emailSignin,
    providers,
    divider: opts.emailSignin && providers.length > 0,
  };
}
