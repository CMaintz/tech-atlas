import { useEffect, useState } from 'preact/hooks';
import type { MapTheme } from './graph-style';
import { currentTheme, watchTheme } from './graph-cytoscape';

export function useTheme(): MapTheme {
  const [theme, setTheme] = useState<MapTheme>(currentTheme);
  useEffect(() => watchTheme(setTheme), []);
  return theme;
}
