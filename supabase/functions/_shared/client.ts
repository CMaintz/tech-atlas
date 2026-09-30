/** Who is calling: the client's IP, and the hashed key the database stores instead. */

/**
 * The caller's IP. `cf-connecting-ip` is set by the edge in front of Supabase and
 * overwrites any value the client sends; failing that, the **rightmost** X-Forwarded-For
 * hop (the one our proxy appended) — the leftmost is whatever the client claimed.
 */
export function clientIp(headers: {
  get(name: string): string | null;
}): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const hops = (headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return hops.at(-1) || "unknown";
}

/** A stable, non-reversible key for an IP (the rate-limit table never stores addresses). */
export async function ipKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`atlas:${ip}`),
  );
  return Array.from(new Uint8Array(digest).subarray(0, 12), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
