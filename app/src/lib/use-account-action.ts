import { useEffect, useState } from 'preact/hooks';
import { redirectError } from './account-view';

/** Run an account action: resolves to an error message, or nothing when it worked. */
export type Run = (
  fn: () => Promise<string | null | void>,
  done?: string,
  failed?: string,
) => Promise<void>;

/**
 * One account action at a time (A44): `busy` while it runs, then `message` says how it
 * went — `done`, or `failed` / `authError` with `{msg}` filled in. On mount the message
 * starts as any auth error handed back in the redirect URL.
 */
export function useAccountAction(authError: string) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const error = redirectError(location.search, location.hash);
    if (error) setMessage(authError.replace('{msg}', error));
  }, []);

  const run: Run = async (fn, done = '', failed = authError) => {
    setBusy(true);
    setMessage('');
    try {
      const error = await fn();
      setMessage(error ? failed.replace('{msg}', error) : done);
    } catch (e) {
      setMessage(authError.replace('{msg}', e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, run };
}
