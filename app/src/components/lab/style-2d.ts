/** The 2D map's stylesheet with the visual lab's rules laid over the Explorer's. */
import type cytoscape from 'cytoscape';
import { EXPLORER } from '../../lib/explorer-config';
import { FADE_TRANSITIONS } from '../../lib/graph-cytoscape';
import { FLOW_DASH, MAP_INK, type MapTheme } from '../../lib/graph-style';
import { rules2D, stateRules, toneActive, toneRules, type Lab2D } from '../../lib/explorer-lab';

type Rule = ReturnType<typeof rules2D>[number];

/** A base stylesheet entry, re-laid as a lab rule. */
const asRule = (r: { selector: string }) => r as Rule;

/**
 * The base stylesheet, then the cream map's tone (light theme, when changed), then the
 * toggles (emphasis wins over tone), the old fades, and — when emphasis or tone is on —
 * the base's hover, selection and route states again, so those still win.
 */
export function labStylesheet(base: unknown[], s: Lab2D, theme: MapTheme) {
  const toned = theme === 'light' && toneActive(s);
  const extra = [...(toned ? creamTone(s) : []), ...rules2D(s, FLOW_DASH)];
  if (s.hover === 'old') extra.push(...(FADE_TRANSITIONS as unknown as typeof extra));
  if (s.emph !== 'off' || toned)
    extra.push(...stateRules(base as { selector: string }[]).map(asRule));
  return [...base, ...extra] as cytoscape.StylesheetJson;
}

/** The cream map's tone rules at the Explorer's resting edge opacities. */
function creamTone(s: Lab2D): Rule[] {
  const alpha = {
    rest: EXPLORER.edges.restAlpha,
    cross: EXPLORER.edges.crossAlpha,
    all: EXPLORER.edges.allAlpha,
  };
  return toneRules(s, alpha, MAP_INK.light.underlayAlpha).map(asRule);
}
