/**
 * Link geometry and flow in the visual lab's 3D map: today's merged lines and
 * comets, or the old tube and cone per link and per-link particles.
 */
import { FAMILY_COLOURS, familyColours, isDirected, type MapTheme } from '../../../lib/graph-style';
import { emphasise, emphasisChannels, widthGain, type Lab3D } from '../../../lib/explorer-lab';
import { endOf, type Acc, type Lab3, type LinkLike } from './context';
import type { Emphasis3D } from './emphasis';

/** Restyle the links for `s` (3d-force-graph re-evaluates each accessor it is given). */
export function styleLinks(ctx: Lab3, s: Lab3D, theme: MapTheme, emphasis: Emphasis3D) {
  const tubes = s.links === 'tubes';
  const wide = emphasisChannels(s.emph).width;
  ctx.L.web.visible = !tubes;
  ctx.fg
    .linkWidth(tubes ? (l) => 0.6 * (wide ? widthGain(emphasis.k(l)) : 1) : 0)
    .linkOpacity(tubes ? 0.5 : 1)
    .linkCurvature(s.curvature)
    .linkVisibility(perLink(s) ? (l) => ctx.drawn(l) || ctx.prod.vis(l) : ctx.prod.vis)
    .linkColor(linkColour(ctx, s, theme, emphasis))
    .linkDirectionalArrowLength(tubes ? (l) => (isDirected(l.type) ? 3.5 : 0) : ctx.prod.arrow);
  styleParticles(ctx, s);
  ctx.L.flow.visible = s.flow === 'comets';
  ctx.L.flowCfg.speed = ctx.cfg.flow.speed * s.speed;
}

/** Tubes or particles draw per link (3d-force-graph's own link objects). */
const perLink = (s: Lab3D) => s.links === 'tubes' || s.flow === 'particles';

/** The old particles on drawn or focused one-way links, then a reheat to apply it all. */
function styleParticles(ctx: Lab3, s: Lab3D) {
  const on = (l: LinkLike) => isDirected(l.type) && (ctx.drawn(l) || ctx.focusOf(l));
  ctx.fg
    .linkDirectionalParticles(s.flow === 'particles' ? (l) => (on(l) ? 1 : 0) : 0)
    .linkDirectionalParticleSpeed(0.006 * s.speed)
    .linkDirectionalParticleWidth(1.4)
    .linkDirectionalParticleColor((l) => FAMILY_COLOURS[l.family])
    .d3ReheatSimulation();
}

/**
 * Tubes: family colours (emphasised, faded beside a selection). Particles over today's
 * lines: only focused links keep a (transparent otherwise) colour. Else today's.
 */
function linkColour(ctx: Lab3, s: Lab3D, theme: MapTheme, emphasis: Emphasis3D): Acc<string> {
  if (s.links === 'tubes') return tubeColour(ctx, s, theme, emphasis);
  if (perLink(s)) return (l) => (ctx.focusOf(l) ? ctx.prod.colour(l) : 'rgba(0,0,0,0)');
  return ctx.prod.colour;
}

function tubeColour(ctx: Lab3, s: Lab3D, theme: MapTheme, emphasis: Emphasis3D): Acc<string> {
  const { colour } = emphasisChannels(s.emph);
  const fam = familyColours(theme);
  const faded = (l: LinkLike) => ctx.L.faded(endOf(l.source)) || ctx.L.faded(endOf(l.target));
  return (l) => {
    if (faded(l)) return 'rgba(82,82,82,0.08)';
    const c = fam[l.family];
    return colour ? emphasise(c, emphasis.k(l), theme === 'light') : c;
  };
}
