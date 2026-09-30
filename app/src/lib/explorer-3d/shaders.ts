/**
 * The 3D map's two point-cloud materials: the glow (a soft halo per term, each its own
 * size) and the comets (a bright core, sized in scene units but clamped on screen).
 * Both fog with distance, add light on the night map and multiply on the cream one.
 */
import { EXPLORER } from '../explorer-config';
import type { Three } from './types';

const GLOW_VERTEX = `
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
      }`;

const GLOW_FRAGMENT = `
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
      }`;

const FLOW_VERTEX = `
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
      }`;

const FLOW_FRAGMENT = `
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
      }`;

/** A white radial falloff: the shape of every glow. */
function glowTexture(THREE: Three) {
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
}

const blend = (THREE: Three) =>
  ({
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    depthWrite: false,
    transparent: true,
  }) as const;

/** PointsMaterial has one size for all points; this shader gives each its own. */
export function glowMaterial(THREE: Three, height: number) {
  const cfg = EXPLORER.three;
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: glowTexture(THREE) },
      opacity: { value: cfg.glowOpacity },
      light: { value: 0 },
      scale: { value: height / 2 },
      fogDensity: { value: cfg.fogDensity },
    },
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    ...blend(THREE),
  });
}

/** Comets sized in scene units (nearer is bigger), clamped to a legible pixel range. */
export function flowMaterial(THREE: Three, height: number) {
  const { flow, fogDensity } = EXPLORER.three;
  return new THREE.ShaderMaterial({
    uniforms: {
      scale: { value: height / 2 },
      minPx: { value: flow.minPx },
      maxPx: { value: flow.maxPx },
      fogDensity: { value: fogDensity },
      light: { value: 0 },
    },
    vertexShader: FLOW_VERTEX,
    fragmentShader: FLOW_FRAGMENT,
    ...blend(THREE),
  });
}

export type PointsMaterial3 = ReturnType<typeof glowMaterial>;
