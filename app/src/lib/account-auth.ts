import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthProvider } from './auth-config';
import { ACCOUNTS, SUPABASE_ANON_KEY, SUPABASE_URL, url, type Lang } from './site';

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  if (!ACCOUNTS) return null;
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

const accountReturnUrl = (lang: Lang) => new URL(url(`${lang}/account/`), location.origin).href;

export async function signInWithEmail(email: string, lang: Lang): Promise<string | null> {
  const c = getClient();
  if (!c) return 'Accounts are not configured.';
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: accountReturnUrl(lang), shouldCreateUser: true },
  });
  return error?.message ?? null;
}

export async function signInWith(provider: AuthProvider, lang: Lang): Promise<string | null> {
  const c = getClient();
  if (!c) return 'Accounts are not configured.';
  const { error } = await c.auth.signInWithOAuth({
    provider,
    options: { redirectTo: accountReturnUrl(lang) },
  });
  return error?.message ?? null;
}

export async function signOutEverywhere(c: SupabaseClient): Promise<string | null> {
  const { error } = await c.auth.signOut({ scope: 'global' });
  if (!error) return null;
  await c.auth.signOut({ scope: 'local' });
  return error.message;
}
