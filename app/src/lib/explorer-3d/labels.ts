/**
 * The 3D map's written names: text sprites above the most central terms (hub labels),
 * and each domain's name, large and faint above its galaxy. Sprites always face
 * the camera; they are not 3d-force-graph objects, so they never take a click or hover.
 */
import { EXPLORER } from '../explorer-config';
import { domainColour } from '../graph-style';
import { domainGroups, hubsOf, type DomainGroup } from './model';
import type { Ctx } from './context';
import type { CanvasTexture, Sprite } from './types';
import { domainCanvas, drawDomain, drawHub, hubCanvas, textSprite } from './text-art';

/** A sprite's text, canvas and texture: redrawn when the theme changes. */
type Art = { text: string; c: HTMLCanvasElement; tex: CanvasTexture };

function hubLabel(ctx: Ctx, n: Ctx['model']['nodes'][number]) {
  const text = n.term[ctx.opts.lang];
  const c = hubCanvas(text);
  drawHub(text, c, ctx.state.theme);
  const h = EXPLORER.three.hubLabelHeight;
  const { sprite, tex } = textSprite(ctx.THREE, c, h, true);
  sprite.position.set(n.x, n.y + ctx.model.radius(n) + h * 0.7, n.z);
  return { sprite, art: { text, c, tex } };
}

/** Text sprites for the most central terms; they recede with the terms they name. */
export function createHubLabels(ctx: Ctx) {
  const labels = new Map<string, Sprite>();
  const art: Art[] = [];
  // v2 names no term at rest (term-names.ts names the lit ones).
  const count = ctx.opts.variant === 'v2' ? 0 : EXPLORER.three.hubLabels;
  for (const n of hubsOf(ctx.model.nodes, ctx.model.rank, count)) {
    const made = hubLabel(ctx, n);
    art.push(made.art);
    labels.set(n.id, made.sprite);
    ctx.scene.add(made.sprite);
  }
  const paint = () => {
    for (const [id, s] of labels) {
      s.visible = !!ctx.state.view?.nodes.has(id);
      s.material.opacity = ctx.lens.faded(id) ? 0.12 : 1;
    }
  };
  const redraw = () => {
    for (const a of art) {
      drawHub(a.text, a.c, ctx.state.theme);
      a.tex.needsUpdate = true;
    }
  };
  return { labels, paint, redraw };
}

type DomainArt = Art & { domain: string; ids: string[]; sprite: Sprite };

function domainName(ctx: Ctx, g: DomainGroup): DomainArt {
  const text = ctx.opts.domainLabels?.[g.domain] ?? g.domain;
  const c = domainCanvas(text);
  drawDomain(text, c, domainColour(g.domain, ctx.state.theme));
  const h = EXPLORER.three.domainLabelHeight;
  const { sprite, tex } = textSprite(ctx.THREE, c, h, false);
  // Just above the galaxy, so the name labels its region without covering its terms.
  sprite.position.set(g.x, g.top + h * 0.5, g.z);
  sprite.renderOrder = -1;
  return { text, c, tex, sprite, domain: g.domain, ids: g.ids };
}

/** Each domain's name over its galaxy, like the 2D map. */
export function createDomainNames(ctx: Ctx) {
  const names = domainGroups(ctx.model.nodes).map((g) => domainName(ctx, g));
  for (const a of names) ctx.scene.add(a.sprite);
  /** A name shows while any of its own terms does; it recedes with a selection. */
  const paint = () => {
    const { view, fx, theme } = ctx.state;
    const quiet = !!(fx.hood || ctx.state.cluster || view?.selected || view?.highlight.size);
    for (const a of names) {
      a.sprite.visible = a.ids.some((id) => view?.nodes.has(id));
      a.sprite.material.opacity = EXPLORER.three.domainLabelAlpha[theme] * (quiet ? 0.35 : 1);
    }
  };
  const redraw = () => {
    for (const a of names) {
      drawDomain(a.text, a.c, domainColour(a.domain, ctx.state.theme));
      a.tex.needsUpdate = true;
    }
  };
  return { paint, redraw };
}
