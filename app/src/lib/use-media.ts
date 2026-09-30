import { useEffect, useState } from 'preact/hooks';

/** Whether a media query matches now (false during the static build). */
export const matchesMedia = (q: string) =>
  typeof window !== 'undefined' && window.matchMedia(q).matches;

/** Whether a media query matches, kept live as it changes. */
export function useMedia(q: string): boolean {
  const [on, setOn] = useState(() => matchesMedia(q));
  useEffect(() => {
    const mq = window.matchMedia(q);
    const change = () => setOn(mq.matches);
    mq.addEventListener('change', change);
    return () => mq.removeEventListener('change', change);
  }, []);
  return on;
}
