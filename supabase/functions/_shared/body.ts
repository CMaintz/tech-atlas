/** Reading a request body without letting a large one through. */

/**
 * Read a request body as text, refusing more than `maxBytes` — counted while streaming,
 * so a lying or absent Content-Length can't make the function buffer a large body.
 */
export async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<{ ok: true; text: string } | { ok: false }> {
  if (!body) return { ok: true, text: "" };
  const chunks = await readChunks(body.getReader(), maxBytes);
  if (!chunks) return { ok: false };
  return { ok: true, text: new TextDecoder().decode(concat(chunks)) };
}

/** Every chunk, or null (and the stream cancelled) once they pass `maxBytes`. */
async function readChunks(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  maxBytes: number,
): Promise<Uint8Array[] | null> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return chunks;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const all = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return all;
}

/** A capped body parsed as JSON, or the status and error message to answer with. */
export type JsonBody =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413; error: string };

export async function readJsonBody(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<JsonBody> {
  const raw = await readCapped(body, maxBytes);
  if (!raw.ok) return { ok: false, status: 413, error: "request too large" };
  try {
    return { ok: true, value: JSON.parse(raw.text) };
  } catch {
    return { ok: false, status: 400, error: "expected a JSON body" };
  }
}
