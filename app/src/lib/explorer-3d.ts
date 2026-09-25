/**
 * The Explorer's 3D map (A86): galaxies of terms, computed once (`galaxyLayout`) and
 * fixed — no live physics, so the GPU only draws. One scene for the life of the page:
 * filters, hover and selection re-evaluate accessors in place. Glow is a single
 * additive point cloud (a shared term's glow is its second domain's colour — a halo
 * round a sphere in its own), hubs carry text sprites, and one more point cloud carries
 * a small comet drifting along every visible one-way relationship. Browser-only.
 */
import type { Graph, GraphLink, GraphNode } from './graph-model';
import { EXPLORER } from './explorer-config';
import {
  MAP_INK,
  clusterColour,
  familyColours,
  homeDomain,
  isDirected,
  type MapTheme,
} from './graph-style';
import { backboneOf, galaxyLayout, pageRank, separate } from './graph-layout';
import { reducedMotion } from './graph-cytoscape';
import { createDragFeedback, orbitDragKind } from './drag-feedback';
import type { Axes } from './explorer-keys';

export type View3D = {
  nodes: ReadonlySet<string>;
  families: ReadonlySet<string>;
  showAll: boolean;
  selected: string | null;
  highlight: ReadonlySet<string>;
  colour: (n: GraphNode) => string;
  bands: (n: GraphNode) => string[];
};

type Node3 = GraphNode & { x: number; y: number; z: number; fx: number; fy: number; fz: number };
type Link3 = GraphLink & { i: number; bb: boolean };
// 3d-force-graph swaps link endpoints for node objects once it has run.
const endId = (x: unknown) => (typeof x === 'string' ? x : (x as { id: string }).id);

const hexRgb = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
};
const rgba = (hex: string, a: number) => `rgba(${hexRgb(hex).join(',')},${a})`;

/** Transparent draw order (three.js sorts by renderOrder before distance). */
const DRAW = { glow: -1, solid: 0, links: 1, receded: 2, flow: 3 } as const;
/** A 3d-force-graph object as the per-frame draw-order pass sees it. */
type Obj3 = {
  __graphObjType?: string;
  renderOrder: number;
  material?: { opacity: number; depthWrite: boolean };
};

export async function createMap3D(opts: {
  container: HTMLElement;
  graph: Graph;
  lang: 'en' | 'da';
  onSelect: (id: string | null) => void;
  /** Pixels on the right covered by an overlay (the open legend). */
  reserveRight?: () => number;
  /** A term is hovered (e.g. to prefetch its panel data). */
  onHover?: (id: string) => void;
  /** The pointer is over a term (screen position in the container), or left it (null). */
  onPoint?: (hit: { id: string; x: number; y: number } | null) => void;
  /** The scene's palette (A92); change it later with `retheme`. */
  theme?: MapTheme;
}) {
  const [{ default: ForceGraph3D }, THREE] = await Promise.all([
    import('3d-force-graph'),
    import('three'),
  ]);
  type Vec3 = InstanceType<typeof THREE.Vector3>;
  const cfg = EXPLORER.three;
  const { graph, lang, container: el } = opts;
  let theme: MapTheme = opts.theme ?? 'dark';
  const ink = () => MAP_INK[theme];
  const light = () => theme === 'light';
  const rank = pageRank(
    graph.nodes.map((n) => n.id),
    graph.links.map((l) => ({ ...l, directed: isDirected(l.type) })),
  );
  const radius = (n: GraphNode) => cfg.nodeRel * (1.2 + 5 * Math.sqrt(rank.get(n.id) ?? 0));
  const pos = galaxyLayout(graph.nodes, graph.links);
  // No two terms closer than a click target and a label apart (A86); galaxies grow.
  {
    const pts = graph.nodes.map((n) => ({ ...pos.get(n.id)! }));
    const r = graph.nodes.map(radius);
    separate(pts, (i, j) => (EXPLORER.spacing.factor * (r[i] + r[j])) / 2 + cfg.labelClearance, 60);
    graph.nodes.forEach((n, i) => pos.set(n.id, pts[i]));
  }
  const nodes: Node3[] = graph.nodes.map((n) => {
    const p = pos.get(n.id)!;
    return { ...n, x: p.x, y: p.y, z: p.z, fx: p.x, fy: p.y, fz: p.z };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: Link3[] = graph.links.map((l, i) => ({ ...l, i, bb: false }));
  const neighbours = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set([n.id])]));
  for (const l of links) {
    neighbours.get(l.source)?.add(l.target);
    neighbours.get(l.target)?.add(l.source);
  }

  let view: View3D | null = null;
  let hover: Set<string> | null = null;
  const focusOf = (l: Link3) => {
    if (!view) return false;
    const s = endId(l.source);
    const t = endId(l.target);
    if (hover) return hover.has(s) && hover.has(t) && (hoverId === s || hoverId === t);
    return (
      s === view.selected || t === view.selected || (view.highlight.has(s) && view.highlight.has(t))
    );
  };
  let hoverId: string | null = null;
  /**
   * Receded terms: outside the hovered neighbourhood, else outside a route, else —
   * with a term selected — everything not connected to it (A86).
   */
  const faded = (id: string) => {
    if (hover) return !hover.has(id);
    if (!view) return false;
    if (view.highlight.size) return !view.highlight.has(id);
    if (view.selected) return !neighbours.get(view.selected)?.has(id);
    return false;
  };
  const nodeColour = (n: GraphNode) =>
    n.id === view?.selected ? ink().selected : faded(n.id) ? ink().faded3d : view!.colour(n);
  /** The families filter the overview only: a selected term shows all its relationships. */
  const endsShown = (l: Link3) => {
    if (!view) return false;
    const s = endId(l.source);
    const t = endId(l.target);
    return (
      view.nodes.has(s) &&
      view.nodes.has(t) &&
      (view.families.has(l.family) || s === view.selected || t === view.selected)
    );
  };
  // Only the focused links are 3d-force-graph objects (arrows, particles); the resting
  // web is one merged line geometry below — a single draw call however many links.
  const linkShown = (l: Link3) => endsShown(l) && focusOf(l);
  const linkColour = (l: Link3) => rgba(familyColours(theme)[l.family], 0.9);
  const motion = !reducedMotion();
  const fg = new ForceGraph3D(el, { controlType: 'orbit' })
    .width(el.clientWidth)
    .height(el.clientHeight)
    .backgroundColor(ink().bg3d)
    .showNavInfo(false)
    .enableNodeDrag(false)
    .warmupTicks(0)
    .cooldownTicks(0)
    .graphData({ nodes, links })
    .nodeLabel((n: GraphNode) => n.term[lang])
    .nodeVal((n: GraphNode) => Math.pow(radius(n) / cfg.nodeRel, 3))
    .nodeRelSize(cfg.nodeRel)
    .nodeResolution(10)
    .nodeOpacity(0.95)
    .nodeColor(nodeColour)
    .nodeVisibility((n: GraphNode) => !!view?.nodes.has(n.id))
    .linkVisibility(linkShown)
    .linkColor(linkColour)
    .linkWidth(0)
    .linkOpacity(1)
    .linkCurvature(0.12)
    .linkDirectionalArrowLength((l: Link3) => (focusOf(l) && isDirected(l.type) ? 5 : 0))
    .linkDirectionalArrowRelPos(1)
    .onNodeClick((n: GraphNode) => opts.onSelect(n.id))
    .onBackgroundClick(() => opts.onSelect(null));

  // The wheel (and pinch) zooms towards the point under the cursor, not the orbit centre.
  (fg.controls() as { zoomToCursor?: boolean }).zoomToCursor = true;

  const scene = fg.scene();
  const fog = new THREE.FogExp2(ink().bg3d, cfg.fogDensity);
  scene.fog = fog;

  // ---- Draw order (A96): every sphere is transparent (nodeOpacity < 1), so three.js
  // sorted each against the one merged web by distance, and a receded sphere drawn
  // first wrote depth and erased every line behind it. A fixed order instead: glow, the
  // solid spheres (they write depth, so they still hide what is behind them), the
  // lines, the receded spheres (no depth write: the lines show through), the comets.
  // The sphere materials are 3d-force-graph's, swapped on its schedule: every frame.
  scene.onBeforeRender = () =>
    scene.traverse((obj) => {
      const o = obj as unknown as Obj3;
      if (o.__graphObjType === 'link') o.renderOrder = DRAW.links;
      if (o.__graphObjType !== 'node') return;
      const solid = (o.material?.opacity ?? 1) >= cfg.solidOpacity;
      if (o.material) o.material.depthWrite = solid;
      o.renderOrder = solid ? DRAW.solid : DRAW.receded;
    });

  // ---- Glow: one additive point cloud for every term ----------------------------------
  const glowTexture = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const glowGeo = new THREE.BufferGeometry();
  glowGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      nodes.flatMap((n) => [n.x, n.y, n.z]),
      3,
    ),
  );
  const glowColours = new THREE.Float32BufferAttribute(new Float32Array(nodes.length * 3), 3);
  glowGeo.setAttribute('color', glowColours);
  const glowSize = new THREE.Float32BufferAttribute(
    nodes.map((n) => radius(n) * cfg.glowScale),
    1,
  );
  glowGeo.setAttribute('size', glowSize);
  // PointsMaterial has one size for all points; a tiny shader gives each its own.
  const glowMat = new THREE.ShaderMaterial({
    uniforms: {
      map: { value: glowTexture },
      opacity: { value: cfg.glowOpacity },
      light: { value: 0 },
      scale: { value: el.clientHeight / 2 },

      fogDensity: { value: cfg.fogDensity },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vDepth;
      uniform float scale;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_PointSize = size * scale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map;
      uniform float opacity;
      uniform float light;
      uniform float fogDensity;
      varying vec3 vColor;
      varying float vDepth;
      void main() {
        float fog = exp(-fogDensity * fogDensity * vDepth * vDepth);
        vec4 t = texture2D(map, gl_PointCoord);
        float k = t.a * opacity * fog;
        // Night map: added light. Cream map: multiplied in, a soft tinted shadow.
        gl_FragColor = light > 0.5 ? vec4(mix(vec3(1.0), vColor, k), 1.0) : vec4(vColor * k, 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    transparent: true,
  });
  const glow = new THREE.Points(glowGeo, glowMat);
  glow.frustumCulled = false;
  glow.renderOrder = DRAW.glow;
  scene.add(glow);

  // ---- Hub labels: text sprites for the most central terms ---------------------------
  const hubs = [...nodes]
    .sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0))
    .slice(0, cfg.hubLabels);
  const labels = new Map<string, InstanceType<typeof THREE.Sprite>>();
  /** Each hub label's text, canvas and texture, redrawn when the theme changes. */
  const labelArt: { text: string; c: HTMLCanvasElement; tex: { needsUpdate: boolean } }[] = [];
  const px = 44;
  const drawLabel = (text: string, c: HTMLCanvasElement) => {
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    g.font = `600 ${px}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = ink().labelShadow3d;
    g.shadowBlur = 10;
    g.fillStyle = ink().label3d;
    g.fillText(text, c.width / 2, c.height / 2);
    // A second pass thickens the halo on the cream map, where a blur alone is faint.
    if (light()) g.fillText(text, c.width / 2, c.height / 2);
  };
  for (const n of hubs) {
    const text = n.term[lang];
    const c = document.createElement('canvas');
    const g = c.getContext('2d')!;
    g.font = `600 ${px}px system-ui, sans-serif`;
    c.width = Math.ceil(g.measureText(text).width) + 24;
    c.height = px + 20;
    drawLabel(text, c);
    const tex = new THREE.CanvasTexture(c);
    labelArt.push({ text, c, tex });
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }),
    );
    const h = cfg.hubLabelHeight;
    sprite.scale.set((h * c.width) / c.height, h, 1);
    sprite.position.set(n.x, n.y + radius(n) + h * 0.7, n.z);
    labels.set(n.id, sprite);
    scene.add(sprite);
  }

  // ---- The resting web: every link as a gently curved polyline in one geometry --------
  const SEG = 8;
  /** Each link's curve (start, bend, end), shared with the flow particles. */
  const curve = new Float32Array(links.length * 9);
  const webPos = new Float32Array(links.length * SEG * 2 * 3);
  const webCol = new Float32Array(links.length * SEG * 2 * 3);
  links.forEach((l, i) => {
    const a = byId.get(endId(l.source))!;
    const b = byId.get(endId(l.target))!;
    // A quadratic bend, sideways from the link (like 3d-force-graph's curvature).
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    let sx = -dz;
    let sz = dx;
    const sl = Math.hypot(sx, sz) || 1;
    sx = (sx / sl) * len * 0.12;
    sz = (sz / sl) * len * 0.12;
    const c = { x: (a.x + b.x) / 2 + sx, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 + sz };
    curve.set([a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z], i * 9);
    const at = (t: number) => {
      const u = 1 - t;
      return [
        u * u * a.x + 2 * u * t * c.x + t * t * b.x,
        u * u * a.y + 2 * u * t * c.y + t * t * b.y,
        u * u * a.z + 2 * u * t * c.z + t * t * b.z,
      ];
    };
    for (let k = 0; k < SEG; k++) {
      const o = (i * SEG + k) * 6;
      webPos.set(at(k / SEG), o);
      webPos.set(at((k + 1) / SEG), o + 3);
    }
  });
  const webGeo = new THREE.BufferGeometry();
  webGeo.setAttribute('position', new THREE.BufferAttribute(webPos, 3));
  const webColours = new THREE.BufferAttribute(webCol, 3);
  webGeo.setAttribute('color', webColours);
  const web = new THREE.LineSegments(
    webGeo,
    new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      transparent: true,
      depthWrite: false,
      fog: true,
    }),
  );
  web.frustumCulled = false;
  web.renderOrder = DRAW.links;
  scene.add(web);
  const tintsFor = () =>
    links.map((l) => {
      const s = byId.get(endId(l.source))!;
      return new THREE.Color(clusterColour(s.cluster, homeDomain(s), theme));
    });
  let tints = tintsFor();
  /**
   * Night map (additive): a colour's brightness is its opacity; black is invisible.
   * Cream map (multiply): a colour mixed towards white by its opacity; white is invisible.
   */
  const paintWeb = () => {
    links.forEach((l, i) => {
      let k = 0;
      if (view && endsShown(l) && (view.showAll || l.bb) && !focusOf(l)) {
        const dim = faded(endId(l.source)) || faded(endId(l.target));
        k = dim ? 0.02 : view.showAll && !l.bb ? cfg.linkAlpha * 0.6 : cfg.linkAlpha;
      }
      const c = tints[i];
      if (light()) k = Math.min(1, k * 1.5);
      for (let j = 0; j < SEG * 2; j++)
        webCol.set(
          light()
            ? [1 - (1 - c.r) * k, 1 - (1 - c.g) * k, 1 - (1 - c.b) * k]
            : [c.r * k, c.g * k, c.b * k],
          (i * SEG * 2 + j) * 3,
        );
    });
    webColours.needsUpdate = true;
  };

  // ---- Flow: a small comet drifting along every visible one-way link (A86) -----------
  // One THREE.Points for all of them: each comet is a head and a fading tail of points
  // (`cfg.flow.trail`), positions recomputed on the link's curve every frame for the
  // visible one-way links only (compacted to the front of the buffers, drawRange).
  const fl = cfg.flow;
  const TRAIL = fl.trail.length;
  const flowPos = new Float32Array(links.length * TRAIL * 3);
  const flowCol = new Float32Array(links.length * TRAIL * 3);
  const flowSz = new Float32Array(links.length * TRAIL);
  const flowGeo = new THREE.BufferGeometry();
  const flowPositions = new THREE.BufferAttribute(flowPos, 3);
  const flowColours = new THREE.BufferAttribute(flowCol, 3);
  const flowSizes = new THREE.BufferAttribute(flowSz, 1);
  flowGeo.setAttribute('position', flowPositions);
  flowGeo.setAttribute('color', flowColours);
  flowGeo.setAttribute('size', flowSizes);
  flowGeo.setDrawRange(0, 0);
  // Sized in scene units (so nearer comets are bigger), clamped to a legible pixel range.
  const flowMat = new THREE.ShaderMaterial({
    uniforms: {
      scale: { value: el.clientHeight / 2 },
      minPx: { value: fl.minPx },
      maxPx: { value: fl.maxPx },
      fogDensity: { value: cfg.fogDensity },
      light: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vDepth;
      uniform float scale;
      uniform float minPx;
      uniform float maxPx;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_PointSize = clamp(size * scale / -mv.z, minPx, maxPx);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float fogDensity;
      uniform float light;
      varying vec3 vColor;
      varying float vDepth;
      void main() {
        float fog = max(exp(-fogDensity * fogDensity * vDepth * vDepth), 0.35);
        // A bright core with a soft edge, legible even a few pixels wide.
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.45, d) + 0.6 * smoothstep(0.5, 0.0, d);
        gl_FragColor = light > 0.5
          ? vec4(mix(vec3(1.0), vColor, clamp(a * fog, 0.0, 1.0)), 1.0)
          : vec4(vColor * a * fog, 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    transparent: true,
  });
  const flow = new THREE.Points(flowGeo, flowMat);
  flow.frustumCulled = false;
  flow.renderOrder = DRAW.flow;
  flow.visible = motion;
  scene.add(flow);
  const directed = links.map((l) => isDirected(l.type));
  const linkLength = links.map((_, i) =>
    Math.hypot(
      curve[i * 9 + 6] - curve[i * 9],
      curve[i * 9 + 7] - curve[i * 9 + 1],
      curve[i * 9 + 8] - curve[i * 9 + 2],
    ),
  );
  // Comets start spread along their links, not in step.
  const phase = links.map((_, i) => ((i * 0.6180339887) % 1) * linkLength[i]);
  const familyColoursFor = () =>
    new Map(Object.entries(familyColours(theme)).map(([f, hex]) => [f, new THREE.Color(hex)]));
  let familyColour = familyColoursFor();
  /** Indices of the links carrying a comet, in buffer order. */
  let active: number[] = [];
  const moveFlow = (t: number) => {
    const travelled = (t / 1000) * fl.speed;
    for (let j = 0; j < active.length; j++) {
      const i = active[j];
      const len = linkLength[i] || 1;
      const o = i * 9;
      const head = (travelled + phase[i]) % len;
      for (let p = 0; p < TRAIL; p++) {
        // The tail trails the head, never past the link's start.
        const u = Math.max(0, head - p * fl.tailGap) / len;
        const v = 1 - u;
        const q = (j * TRAIL + p) * 3;
        for (let a = 0; a < 3; a++)
          flowPos[q + a] =
            v * v * curve[o + a] + 2 * v * u * curve[o + 3 + a] + u * u * curve[o + 6 + a];
      }
    }
    flowPositions.needsUpdate = true;
  };
  const paintFlow = () => {
    active = [];
    links.forEach((l, i) => {
      if (!view || !directed[i] || !endsShown(l)) return;
      const lit = focusOf(l);
      // Every drawn link carries a comet: the backbone (every link with "show all") and
      // the focused ones; outside the selection they dim with it.
      if (!lit && !view.showAll && !l.bb) return;
      const dim = !lit && (faded(endId(l.source)) || faded(endId(l.target)));
      const k = lit ? fl.litAlpha : dim ? fl.dimAlpha : fl.alpha;
      const c = familyColour.get(l.family) ?? new THREE.Color(ink().selected);
      const j = active.length;
      active.push(i);
      fl.trail.forEach((f, p) => {
        const m = k * f;
        flowCol.set(
          light()
            ? [
                1 - (1 - c.r) * Math.min(1, m),
                1 - (1 - c.g) * Math.min(1, m),
                1 - (1 - c.b) * Math.min(1, m),
              ]
            : [c.r * m, c.g * m, c.b * m],
          (j * TRAIL + p) * 3,
        );
        flowSz[j * TRAIL + p] = fl.size * (lit ? 1.3 : 1) * (0.5 + 0.5 * f);
      });
    });
    flowColours.needsUpdate = true;
    flowSizes.needsUpdate = true;
    flowGeo.setDrawRange(0, active.length * TRAIL);
    moveFlow(performance.now());
  };
  let flowRaf = 0;
  const tickFlow = (t: number) => {
    flowRaf = requestAnimationFrame(tickFlow);
    moveFlow(t);
  };
  const runFlow = (on: boolean) => {
    cancelAnimationFrame(flowRaf);
    flowRaf = 0;
    if (on && motion) flowRaf = requestAnimationFrame(tickFlow);
  };
  runFlow(true);

  /** Additive on the night map; multiplied into the cream map (a light on white is lost). */
  const setBlend = () => {
    const blending = light() ? THREE.MultiplyBlending : THREE.AdditiveBlending;
    for (const m of [glowMat, flowMat, web.material]) {
      m.blending = blending;
      m.needsUpdate = true;
    }
    glowMat.uniforms.light.value = +light();
    flowMat.uniforms.light.value = +light();
    glowMat.uniforms.opacity.value = cfg.glowOpacity * (light() ? 0.7 : 1);
  };
  setBlend();

  const paintGlow = () => {
    paintWeb();
    paintFlow();
    const col = new THREE.Color();
    nodes.forEach((n, i) => {
      // No glow: black added to the night map, white multiplied into the cream one.
      if (!view?.nodes.has(n.id) || (light() && faded(n.id)))
        col.setRGB(+light(), +light(), +light());
      else if (faded(n.id)) col.setRGB(0.02, 0.02, 0.03);
      else {
        // A shared term glows in its second domain's colour: a halo round its own.
        const ring = view.bands(n)[1];
        col.set(n.id === view.selected ? ink().selected : (ring ?? view.colour(n)));
      }
      glowColours.setXYZ(i, col.r, col.g, col.b);
    });
    glowColours.needsUpdate = true;
    for (const [id, s] of labels) {
      s.visible = !!view?.nodes.has(id);
      s.material.opacity = faded(id) ? 0.12 : 1;
    }
  };

  /** Re-evaluate the accessors (3d-force-graph's idiom) and land any new objects. */
  const refresh = (linksToo = true) => {
    fg.nodeColor(fg.nodeColor());
    if (linksToo)
      fg.linkVisibility(fg.linkVisibility())
        .linkColor(fg.linkColor())
        .linkDirectionalArrowLength(fg.linkDirectionalArrowLength())
        .linkDirectionalParticles(fg.linkDirectionalParticles());
    paintGlow();
    // New objects start at the origin until the (fixed-node) engine runs one tick.
    fg.d3ReheatSimulation();
  };

  let hoverTimer = 0;
  /** Auto-rotating: terms drift under a still pointer, so no hover card. */
  let spinning = false;
  fg.onNodeHover((n: GraphNode | null) => {
    el.style.cursor = n ? 'pointer' : 'grab';
    if (n) opts.onHover?.(n.id);
    const p = n && !spinning ? byId.get(n.id) : undefined;
    if (p) {
      const at = fg.graph2ScreenCoords(p.x, p.y, p.z);
      opts.onPoint?.({ id: p.id, x: at.x, y: at.y });
    } else opts.onPoint?.(null);
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      const next = n ? n.id : null;
      if (next === hoverId) return;
      hoverId = next;
      hover = n ? (neighbours.get(n.id) ?? new Set([n.id])) : null;
      refresh();
    }, EXPLORER.hoverDelayMs);
  });

  el.style.cursor = 'grab';
  const drag = createDragFeedback(el);
  let press: PointerEvent | null = null;
  const onPress = (e: PointerEvent) => void (press = e);
  const onRelease = () => void (press = null);
  el.addEventListener('pointerdown', onPress, true);
  window.addEventListener('pointerup', onRelease);

  // Orbiting, zooming or panning the camera hides the hover card.
  const controls = fg.controls() as unknown as {
    autoRotate: boolean;
    autoRotateSpeed: number;
    addEventListener: (type: string, fn: () => void) => void;
  };
  controls.addEventListener('start', () => {
    opts.onPoint?.(null);
    // A drag (not the wheel): a rotate cursor and a ring while orbiting, a closed hand
    // while panning (A95). The press is seen first, in the capture phase.
    const kind = press && orbitDragKind(press);
    if (press && kind) drag.start(kind, press);
  });
  controls.addEventListener('end', () => drag.end());

  // ---- Camera: a slow swoop in from far out ------------------------------------------
  const centre = {
    x: nodes.reduce((s, n) => s + n.x, 0) / nodes.length,
    y: nodes.reduce((s, n) => s + n.y, 0) / nodes.length,
    z: nodes.reduce((s, n) => s + n.z, 0) / nodes.length,
  };
  const extent = Math.max(...nodes.map((n) => Math.hypot(n.x - centre.x, n.z - centre.z)));
  const rest = { x: centre.x, y: centre.y + extent * 0.85, z: centre.z + extent * 1.75 };
  if (motion) {
    fg.cameraPosition(
      { x: centre.x + extent * 1.2, y: centre.y + extent * 2.6, z: centre.z + extent * 3.2 },
      centre,
    );
    window.setTimeout(() => fg.cameraPosition(rest, centre, cfg.introMs), 60);
  } else fg.cameraPosition(rest, centre);

  const resize = () => {
    fg.width(el.clientWidth).height(el.clientHeight);
    glowMat.uniforms.scale.value = el.clientHeight / 2;
    flowMat.uniforms.scale.value = el.clientHeight / 2;
    // Centre the scene in the part of the canvas the legend leaves clear and, in the
    // overview, widen the lens so the whole scene fits that part (none sits under it).
    const w = el.clientWidth;
    const h = el.clientHeight;
    const r = opts.reserveRight?.() ?? 0;
    const camera = fg.camera() as InstanceType<typeof THREE.PerspectiveCamera>;
    const clear = r && r < w / 2 ? w - r : w;
    camera.zoom = view?.selected ? 1 : clear / w;
    if (clear < w) camera.setViewOffset(w, h, r / 2, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  /** The camera glides to a term (a cut under reduced motion). */
  const flyTo = (id: string) => {
    const n = byId.get(id);
    if (!n) return;
    const d = 260;
    const r = Math.hypot(n.x, n.z) || 1;
    fg.cameraPosition(
      { x: n.x + (n.x / r) * d, y: n.y + d * 0.5, z: n.z + (n.z / r) * d },
      { x: n.x, y: n.y, z: n.z },
      motion ? 1200 : 0,
    );
  };

  return {
    apply(next: View3D) {
      const prev = view;
      view = next;
      if (prev?.families !== next.families) {
        const spine = backboneOf(graph.nodes, graph.links, next.families);
        for (const l of links) l.bb = spine.has(l.i);
      }
      const nodesChanged = !prev || prev.nodes !== next.nodes;
      if (nodesChanged) fg.nodeVisibility(fg.nodeVisibility());
      refresh();
      // Opening or closing the term panel changes the part of the canvas left clear.
      if (!!next.selected !== !!prev?.selected) resize();
      if (next.selected && next.selected !== prev?.selected) flyTo(next.selected);
    },
    /** Bring a term into view (Find a term, even when it is already selected). */
    focus: (id: string) => flyTo(id),
    /**
     * Keyboard navigation (A96), for dt seconds: fly (the orbit centre travels with the
     * camera, so a mouse orbit afterwards turns about what is in front) and orbit.
     */
    nudge(v: Axes, dt: number) {
      const k = EXPLORER.keys;
      const camera = fg.camera();
      const target = (fg.controls() as unknown as { target: Vec3 }).target;
      const offset = camera.position.clone().sub(target);
      if (v.yaw || v.pitch) {
        const s = new THREE.Spherical().setFromVector3(offset);
        s.theta += v.yaw * k.orbitRad * dt;
        s.phi = Math.min(Math.PI - 0.05, Math.max(0.05, s.phi - v.pitch * k.orbitRad * dt));
        offset.setFromSpherical(s);
        camera.position.copy(target).add(offset);
      }
      const dist = offset.length();
      const speed = Math.max(k.moveMin, dist * k.moveRel) * dt;
      const ahead = camera.getWorldDirection(new THREE.Vector3());
      const right = ahead.clone().cross(camera.up).normalize();
      // Sideways and up/down move camera and orbit centre together (a pan) ...
      const pan = right.multiplyScalar(v.x * speed).addScaledVector(camera.up, v.y * speed);
      camera.position.add(pan);
      target.add(pan);
      // ... forward closes in on the centre, and pushes it on ahead once near it.
      const fwd = v.z * speed;
      camera.position.addScaledVector(ahead, fwd);
      if (dist - fwd < k.near) target.addScaledVector(ahead, k.near - (dist - fwd));
      camera.lookAt(target);
    },
    /** Slow auto-rotation about the scene centre (off under reduced motion). */
    spin(on: boolean) {
      spinning = on && motion;
      controls.autoRotate = spinning;
      controls.autoRotateSpeed = cfg.spinSpeed;
      if (spinning) opts.onPoint?.(null);
    },
    /**
     * Switch palettes (A92) in place: background, fog, blending (additive glow on the
     * night map, a multiplied soft shadow on the cream one), labels and colours. Term
     * fills come from the View's `colour`, so the caller applies a new view as well.
     */
    retheme(next: MapTheme) {
      if (next === theme) return;
      theme = next;
      setBlend();
      fg.backgroundColor(ink().bg3d);
      fog.color.set(ink().bg3d);
      tints = tintsFor();
      familyColour = familyColoursFor();
      for (const a of labelArt) {
        drawLabel(a.text, a.c);
        a.tex.needsUpdate = true;
      }
      refresh();
    },
    /** Re-frame after the clear part of the canvas changed (e.g. the legend toggled). */
    reframe() {
      resize();
    },
    show(on: boolean) {
      if (on) {
        resize();
        fg.resumeAnimation();
      } else fg.pauseAnimation();
      runFlow(on);
    },
    destroy() {
      runFlow(false);
      window.clearTimeout(hoverTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerup', onRelease);
      el.removeEventListener('pointerdown', onPress, true);
      drag.destroy();
      fg._destructor();
      el.innerHTML = '';
    },
  };
}

export type Map3D = Awaited<ReturnType<typeof createMap3D>>;
