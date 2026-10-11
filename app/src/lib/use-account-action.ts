import { useEffect, useState } from 'preact/hooks';
import { redirectError } from './account-view';

export type Run = (
  fn: () => Promise<string | null | void>,
  done?: string,
  failed?: string,
) => Promise<void>;

type RunDeps = {
  authError: string;
  setBusy: (busy: boolean) => void;
  setMessage: (message: string) => void;
};

function makeRun({ authError, setBusy, setMessage }: RunDeps): Run {
  return async (fn, done = '', failed = authError) => {
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
}

export function useAccountAction(authError: string) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const error = redirectError(location.search, location.hash);
    if (error) setMessage(authError.replace('{msg}', error));
  }, []);
  const run = makeRun({ authError, setBusy, setMessage });
  return { busy, message, run };
}
