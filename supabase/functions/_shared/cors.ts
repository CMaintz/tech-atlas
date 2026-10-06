/**
 * CORS for the Edge Functions: the deployed site and any local dev server may call
 * them from a browser; every other origin gets no Access-Control-* headers.
 */

/** The deployed site, plus any local dev server. */
export function allowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === "https://atlas.maintz.dev") return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const base: Record<string, string> = { Vary: "Origin" };
  if (!allowedOrigin(origin)) return base;
  return {
    ...base,
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "content-type, authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };
}
