/**
 * The Explorer's 3D map (A79): galaxies of terms, computed once (`galaxyLayout`) and
 * fixed — no live physics, so the GPU only draws. One scene for the life of the page:
 * filters, hover and selection re-evaluate accessors in place. Glow is a single
 * additive point cloud, hubs carry text sprites, and particles run only along the
 * hovered or selected term's one-way relationships. Browser-only.
 */
import type { Graph, GraphLink, GraphNode } from './graph-model';
import { EXPLORER } from './explorer-config';
import { FAMILY_COLOURS, clusterColour, homeDomain, isDirected } from './graph-style';
import { backbone, galaxyLayout, pageRank } from './graph-layout';
import { reducedMotion } from './graph-cytoscape';

export type View3D = {
  nodes: ReadonlySet<string>;
  families: ReadonlySet<string>;
  showAll: boolean;
  selected: string | null;
  highlight: ReadonlySet<string>;
  colour: (n: GraphNode) => string;
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

export async function createMap3D(opts: {
  container: HTMLElement;
  graph: Graph;
  lang: 'en' | 'da';
  onSelect: (id: string | null) => void;
  /** Pixels on the right covered by an overlay (the open legend). */
  reserveRight?: () => number;
}) {
  const [{ default: ForceGraph3D }, THREE] = await Promise.all([
    import('3d-force-graph'),
    import('three'),
  ]);
  const cfg = EXPLORER.three;
  const { graph, lang, container: el } = opts;
  const pos = galaxyLayout(graph.nodes, graph.links);
  const rank = pageRank(
    graph.nodes.map((n) => n.id),
    graph.links.map((l) => ({ ...l, directed: isDirected(l.type) })),
  );
  const spine = backbone(graph.nodes, graph.links);
  const nodes: Node3[] = graph.nodes.map((n) => {
    const p = pos.get(n.id)!;
    return { ...n, x: p.x, y: p.y, z: p.z, fx: p.x, fy: p.y, fz: p.z };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: Link3[] = graph.links.map((l, i) => ({ ...l, i, bb: spine.has(i) }));
  const neighbours = new Map<string, Set<string>>(nodes.map((n) => [n.id, new Set([n.id])]));
  for (const l of links) {
    neighbours.get(l.source)?.add(l.target);
    neighbours.get(l.target)?.add(l.source);
  }
  const radius = (n: GraphNode) => cfg.nodeRel * (1.2 + 5 * Math.sqrt(rank.get(n.id) ?? 0));

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
  const faded = (id: string) =>
    (hover && !hover.has(id)) || (!hover && !!view?.highlight.size && !view.highlight.has(id));
  const nodeColour = (n: GraphNode) =>
    n.id === view?.selected ? '#ffffff' : faded(n.id) ? 'rgba(70,74,90,0.25)' : view!.colour(n);
  const linkShown = (l: Link3) => {
    if (!view) return false;
    const s = endId(l.source);
    const t = endId(l.target);
    if (!view.nodes.has(s) || !view.nodes.has(t) || !view.families.has(l.family)) return false;
    return view.showAll || l.bb || focusOf(l);
  };
  const linkColour = (l: Link3) => {
    if (focusOf(l)) return rgba(FAMILY_COLOURS[l.family], 0.9);
    const s = byId.get(endId(l.source))!;
    if (faded(s.id) || faded(endId(l.target))) return 'rgba(60,64,80,0.03)';
    return rgba(
      clusterColour(s.cluster, homeDomain(s)),
      view?.showAll && !l.bb ? cfg.linkAlpha * 0.6 : cfg.linkAlpha,
    );
  };
  const motion = !reducedMotion();

  const fg = new ForceGraph3D(el, { controlType: 'orbit' })
    .width(el.clientWidth)
    .height(el.clientHeight)
    .backgroundColor(cfg.background)
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
    .linkCurvature((l: Link3) => (l.bb ? 0.12 : 0.25))
    .linkDirectionalArrowLength((l: Link3) => (focusOf(l) && isDirected(l.type) ? 5 : 0))
    .linkDirectionalArrowRelPos(1)
    .linkDirectionalParticles((l: Link3) => (motion && focusOf(l) && isDirected(l.type) ? 1 : 0))
    .linkDirectionalParticleSpeed(cfg.particleSpeed)
    .linkDirectionalParticleWidth(cfg.particleWidth)
    .linkDirectionalParticleColor((l: Link3) => FAMILY_COLOURS[l.family])
    .onNodeClick((n: GraphNode) => opts.onSelect(n.id))
    .onBackgroundClick(() => opts.onSelect(null));

  const scene = fg.scene();
  scene.fog = new THREE.FogExp2(cfg.background, cfg.fogDensity);

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
      scale: { value: el.clientHeight / 2 },
      fogColor: { value: new THREE.Color(cfg.background) },
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
      uniform float fogDensity;
      varying vec3 vColor;
      varying float vDepth;
      void main() {
        float fog = exp(-fogDensity * fogDensity * vDepth * vDepth);
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(vColor * t.a * opacity * fog, 1.0);
      }`,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const glow = new THREE.Points(glowGeo, glowMat);
  glow.frustumCulled = false;
  scene.add(glow);

  // ---- Hub labels: text sprites for the most central terms ---------------------------
  const hubs = [...nodes]
    .sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0))
    .slice(0, cfg.hubLabels);
  const labels = new Map<string, InstanceType<typeof THREE.Sprite>>();
  for (const n of hubs) {
    const text = n.term[lang];
    const c = document.createElement('canvas');
    const g = c.getContext('2d')!;
    const px = 44;
    g.font = `600 ${px}px system-ui, sans-serif`;
    c.width = Math.ceil(g.measureText(text).width) + 24;
    c.height = px + 20;
    g.font = `600 ${px}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,0.95)';
    g.shadowBlur = 10;
    g.fillStyle = '#e5e7eb';
    g.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: true }),
    );
    const h = cfg.hubLabelHeight;
    sprite.scale.set((h * c.width) / c.height, h, 1);
    sprite.position.set(n.x, n.y + radius(n) + h * 0.7, n.z);
    labels.set(n.id, sprite);
    scene.add(sprite);
  }

  const paintGlow = () => {
    const col = new THREE.Color();
    nodes.forEach((n, i) => {
      if (!view?.nodes.has(n.id)) col.setRGB(0, 0, 0);
      else if (faded(n.id)) col.setRGB(0.02, 0.02, 0.03);
      else col.set(n.id === view.selected ? '#ffffff' : view.colour(n));
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
  fg.onNodeHover((n: GraphNode | null) => {
    el.style.cursor = n ? 'pointer' : 'default';
    window.clearTimeout(hoverTimer);
    hoverTimer = window.setTimeout(() => {
      const next = n ? n.id : null;
      if (next === hoverId) return;
      hoverId = next;
      hover = n ? (neighbours.get(n.id) ?? new Set([n.id])) : null;
      refresh();
    }, EXPLORER.hoverDelayMs);
  });

  // ---- Camera: a slow swoop in from far out ------------------------------------------
  const centre = {
    x: nodes.reduce((s, n) => s + n.x, 0) / nodes.length,
    y: nodes.reduce((s, n) => s + n.y, 0) / nodes.length,
    z: nodes.reduce((s, n) => s + n.z, 0) / nodes.length,
  };
  const extent = Math.max(...nodes.map((n) => Math.hypot(n.x - centre.x, n.z - centre.z)));
  const rest = { x: centre.x, y: centre.y + extent * 0.7, z: centre.z + extent * 1.45 };
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
    // Centre the scene in the part of the canvas the legend leaves clear.
    const w = el.clientWidth;
    const h = el.clientHeight;
    const r = opts.reserveRight?.() ?? 0;
    const camera = fg.camera() as InstanceType<typeof THREE.PerspectiveCamera>;
    if (r && r < w / 2) camera.setViewOffset(w, h, r / 2, 0, w, h);
    else camera.clearViewOffset();
  };
  resize();
  window.addEventListener('resize', resize);

  return {
    apply(next: View3D) {
      const prev = view;
      view = next;
      const nodesChanged = !prev || prev.nodes !== next.nodes;
      if (nodesChanged) fg.nodeVisibility(fg.nodeVisibility());
      refresh();
      if (next.selected && next.selected !== prev?.selected) {
        const n = byId.get(next.selected);
        if (n && motion) {
          const d = 260;
          const r = Math.hypot(n.x, n.z) || 1;
          fg.cameraPosition(
            { x: n.x + (n.x / r) * d, y: n.y + d * 0.5, z: n.z + (n.z / r) * d },
            { x: n.x, y: n.y, z: n.z },
            1200,
          );
        }
      }
    },
    show(on: boolean) {
      if (on) {
        resize();
        fg.resumeAnimation();
      } else fg.pauseAnimation();
    },
    destroy() {
      window.clearTimeout(hoverTimer);
      window.removeEventListener('resize', resize);
      fg._destructor();
      el.innerHTML = '';
    },
  };
}

export type Map3D = Awaited<ReturnType<typeof createMap3D>>;
