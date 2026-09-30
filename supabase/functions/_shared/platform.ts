/**
 * What a function handler is given instead of Deno's globals, so the app's Vitest
 * suite can drive it: a fetch, an environment reader, and the Supabase RPC call
 * built on them.
 */

export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
export type EnvReader = (name: string) => string | undefined;

/** Every named variable, or null when any is unset or empty. */
export function requireEnv<K extends string>(
  env: EnvReader,
  names: readonly K[],
): Record<K, string> | null {
  const out = {} as Record<K, string>;
  for (const name of names) {
    const value = env(name);
    if (!value) return null;
    out[name] = value;
  }
  return out;
}

/** Where to call the database, and the deadline the call runs under. */
export type RpcTarget = {
  fetch: FetchLike;
  supabaseUrl: string;
  signal: AbortSignal;
};

/** The project's database, called under a deadline of `deadlineMs` from now. */
export const rpcTarget = (
  fetch: FetchLike,
  supabaseUrl: string,
  deadlineMs: number,
): RpcTarget => ({
  fetch,
  supabaseUrl,
  signal: AbortSignal.timeout(deadlineMs),
});

/** POST a PostgREST RPC (`/rest/v1/rpc/<fn>`), `key` as both apikey and bearer. */
export function supabaseRpc(
  target: RpcTarget,
  fn: string,
  key: string,
  args: unknown,
): Promise<Response> {
  return target.fetch(`${target.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    signal: target.signal,
  });
}
