import type cytoscape from 'cytoscape';
import { EXPLORER } from '../../lib/explorer-config';
import { FADE_TRANSITIONS } from '../../lib/graph-cytoscape';
import { FLOW_DASH, MAP_INK, type MapTheme } from '../../lib/graph-style';
import { rules2D, stateRules, toneActive, toneRules, type Lab2D } from '../../lib/explorer-lab';

type Rule = ReturnType<typeof rules2D>[number];

const asRule = (r: { selector: string }) => r as Rule;

export function labStylesheet(base: unknown[], s: Lab2D, theme: MapTheme) {
  const toned = theme === 'light' && toneActive(s);
  const extra = [...(toned ? creamTone(s) : []), ...rules2D(s, FLOW_DASH)];
  if (s.hover === 'old') extra.push(...(FADE_TRANSITIONS as unknown as typeof extra));
  if (s.emph !== 'off' || toned)
    extra.push(...stateRules(base as { selector: string }[]).map(asRule));
  return [...base, ...extra] as cytoscape.StylesheetJson;
}

function creamTone(s: Lab2D): Rule[] {
  const alpha = {
    rest: EXPLORER.edges.restAlpha,
    cross: EXPLORER.edges.crossAlpha,
    all: EXPLORER.edges.allAlpha,
  };
  return toneRules(s, alpha, MAP_INK.light.underlayAlpha).map(asRule);
}
