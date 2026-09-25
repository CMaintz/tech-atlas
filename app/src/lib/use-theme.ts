import { useEffect, useState } from 'preact/hooks';
import type { MapTheme } from './graph-style';
import { currentTheme, watchTheme } from './graph-cytoscape';

/**
 * The page's resolved theme, kept live (A92): the header menu or the OS switching it
 * re-renders the island, so maps and panels restyle without a reload.
 */
export function useTheme(): MapTheme {
  const [theme, setTheme] = useState<MapTheme>(currentTheme);
  useEffect(() => watchTheme(setTheme), []);
  return theme;
}
