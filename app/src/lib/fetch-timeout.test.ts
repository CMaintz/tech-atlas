import { describe, expect, it } from 'vitest';
import { withTimeout } from './fetch-timeout';

/** Settles only when its signal aborts. */
const hang = (signal: AbortSignal) =>
  new Promise<never>((_, reject) =>
    signal.addEventListener('abort', () => reject(new Error('aborted'))),
  );

describe('withTimeout', () => {
  it('passes through the result of a request that finishes in time', async () => {
    await expect(withTimeout(1000, undefined, async () => 42)).resolves.toBe(42);
  });

  it('aborts after the deadline', async () => {
    await expect(withTimeout(10, undefined, hang)).rejects.toThrow('aborted');
  });

  it('aborts when the caller does', async () => {
    const ctrl = new AbortController();
    const pending = withTimeout(10_000, ctrl.signal, hang);
    ctrl.abort();
    await expect(pending).rejects.toThrow('aborted');
  });

  it('starts aborted when the caller already has', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    let seen: boolean | undefined;
    await withTimeout(10_000, ctrl.signal, async (s) => (seen = s.aborted));
    expect(seen).toBe(true);
  });

  it('stops listening to the caller once done', async () => {
    const ctrl = new AbortController();
    let inner: AbortSignal | undefined;
    await withTimeout(10_000, ctrl.signal, async (s) => (inner = s));
    ctrl.abort();
    expect(inner!.aborted).toBe(false);
  });

  it('propagates a failure from the request', async () => {
    const fail = async () => {
      throw new Error('boom');
    };
    await expect(withTimeout(1000, undefined, fail)).rejects.toThrow('boom');
  });
});
