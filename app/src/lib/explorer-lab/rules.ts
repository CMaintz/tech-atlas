/**
 * The 2D stylesheet rules the visual lab's toggles lay over the Explorer's own
 * (later rules win): curves, gradients, the old dashes, glow and labels, emphasis by
 * importance, the cream map's tone, and the state rules laid again on top.
 */
import { emphasisChannels } from './emphasis';
import { tone } from './colour';
import type { Lab2D, Tone } from './state';

type Rule = { selector: string; style: Record<string, string | number | number[]> };

/** Stylesheet rules the 2D toggles add after the Explorer's own (later rules win). */
export function rules2D(s: Lab2D, dash: readonly [number, number]): Rule[] {
  return [
    ...curveRules(s),
    ...(s.gradient ? [gradientRule()] : []),
    ...(s.flow === 'dashes' ? [dashRule(dash)] : []),
    ...lookRules(s),
    ...emphasisRules(s),
  ];
}

/** Resting backbone edges as bezier or curved unbundled-bezier. */
function curveRules(s: Lab2D): Rule[] {
  if (s.curve === 'bezier')
    return [
      {
        selector: 'edge.bb',
        style: { 'curve-style': 'bezier', 'control-point-step-size': 30 * s.strength },
      },
    ];
  if (s.curve !== 'unbundled') return [];
  const style = {
    'curve-style': 'unbundled-bezier',
    'control-point-distances': 'data(labCurve)',
    'control-point-weights': 0.5,
  };
  return [{ selector: 'edge.bb', style }];
}

const gradientRule = (): Rule => ({
  selector: 'edge[labGradient]',
  style: {
    'line-fill': 'linear-gradient',
    'line-gradient-stop-colors': 'data(labGradient)',
    'line-gradient-stop-positions': '0 100',
  },
});

/** The old marching dashes on one-way edges. */
const dashRule = (dash: readonly [number, number]): Rule => ({
  selector: 'edge.labflow',
  style: { 'line-style': 'dashed', 'line-dash-pattern': [...dash] },
});

/** Node glow off, and which labels show (none, hubs only, or all overlapping). */
function lookRules(s: Lab2D): Rule[] {
  const out: Rule[] = [];
  if (!s.glow) out.push({ selector: 'node[size]', style: { 'underlay-opacity': 0 } });
  if (s.labels === 'none') out.push({ selector: 'node[size]', style: { 'text-opacity': 0 } });
  if (s.labels === 'hubs')
    out.push({ selector: 'node[size][farFont = 0]', style: { 'text-opacity': 0 } });
  if (s.labels === 'all')
    out.push({ selector: 'node[size]', style: { 'text-opacity': 1, 'min-zoomed-font-size': 0 } });
  return out;
}

/** Emphasis by importance: per-edge values the lab writes as data (see ExplorerLab). */
function emphasisRules(s: Lab2D): Rule[] {
  const { alpha, colour, width } = emphasisChannels(s.emph);
  return [
    ...(colour ? emphColour() : []),
    ...(width ? [{ selector: 'edge[labWidth]', style: { width: 'data(labWidth)' } }] : []),
    ...(alpha ? emphAlpha() : []),
  ];
}

const emphColour = (): Rule[] => [
  { selector: 'edge.bb[labTint]', style: { 'line-color': 'data(labTint)' } },
  {
    selector: 'edge.all[labColour], edge.lit[labColour], edge.focus[labColour]',
    style: { 'line-color': 'data(labColour)', 'target-arrow-color': 'data(labColour)' },
  },
];

const emphAlpha = (): Rule[] => [
  { selector: 'edge.bb[labAlpha]', style: { opacity: 'data(labAlpha)' } },
  { selector: 'edge.bb.xc[labAlphaXc]', style: { opacity: 'data(labAlphaXc)' } },
  { selector: 'edge.all[labAlphaAll]', style: { opacity: 'data(labAlphaAll)' } },
];

/**
 * The base stylesheet's state rules (hover fade, selection dim, focus, highlight, the
 * selected term and its neighbours), to lay again after the emphasis and tone rules so
 * those states still win.
 */
export function stateRules<T extends { selector: string }>(base: readonly T[]): T[] {
  return base.filter((r) => /(edge|node)[^,]*\.(faded|dim|lit|focus|hl|sel|nb)\b/.test(r.selector));
}

type ToneState = Tone & Pick<Lab2D, 'labelWeight' | 'labelHalo'>;
type El = { data(k: string): unknown };
type ToneRule = { selector: string; style: Record<string, unknown> };

/**
 * The cream map's tone rules (function values read each element's own colour), laid
 * after the Explorer's; `alpha` gives each edge class its resting opacity.
 */
export function toneRules(
  s: ToneState,
  alpha: { rest: number; cross: number; all: number },
  underlay: number,
): ToneRule[] {
  const fill = (e: El) => tone(String(e.data('colour')), s.nodeSat, s.nodeLight);
  const node = {
    'background-color': fill,
    'font-weight': s.labelWeight * 100,
    'text-outline-width': s.labelHalo,
    'underlay-opacity': Math.min(1, underlay * s.shadow),
  };
  return [{ selector: 'node[size]', style: node }, ...edgeToneRules(s, alpha)];
}

/** Edges on the cream map: darker ink, and each class's opacity scaled. */
function edgeToneRules(s: ToneState, alpha: { rest: number; cross: number; all: number }) {
  const ink = (key: string) => (e: El) => tone(String(e.data(key)), 1, -s.edgeDark);
  const a = (v: number) => Math.min(1, v * s.edgeAlpha);
  return [
    { selector: 'edge.bb', style: { 'line-color': ink('tint'), opacity: a(alpha.rest) } },
    { selector: 'edge.bb.xc', style: { opacity: a(alpha.cross) } },
    {
      selector: 'edge.all, edge.lit, edge.focus',
      style: { 'line-color': ink('colour'), 'target-arrow-color': ink('colour') },
    },
    { selector: 'edge.all', style: { opacity: a(alpha.all) } },
  ];
}
