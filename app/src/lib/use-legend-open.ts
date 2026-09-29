import { useState } from 'preact/hooks';
import { useLatest } from './use-latest';

/** The legend's open/closed choice is remembered; it starts closed on a first visit. */
const LEGEND_KEY = 'atlas.explorer.legend';

function storedLegendOpen(): boolean {
  try {
    return localStorage.getItem(LEGEND_KEY) === 'open';
  } catch {
    return false;
  }
}

function storeLegendOpen(open: boolean) {
  try {
    localStorage.setItem(LEGEND_KEY, open ? 'open' : 'closed');
  } catch {
    // Storage blocked (private mode): the choice just isn't remembered.
  }
}

/** The Explorer legend's open state, remembered across visits. */
export function useLegendOpen() {
  const [open, setOpen] = useState(storedLegendOpen);
  const ref = useLatest(open);
  const toggle = (next: boolean) => {
    if (next === ref.current) return;
    ref.current = next;
    setOpen(next);
    storeLegendOpen(next);
  };
  return { open, toggle };
}
