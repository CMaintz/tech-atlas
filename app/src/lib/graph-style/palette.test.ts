import { describe, expect, it } from 'vitest';
import { CLUSTER_LABELS } from '../site';
import {
  CLUSTER_DOMAIN,
  CLUSTER_HUE_SPREAD,
  CREAM,
  DOMAIN_HUES,
  FAMILY_COLOURS_LIGHT,
  MAP_INK,
  clusterColour,
  contrastRatio,
  domainColour,
  domainHue,
  edgePaint,
  hslToHex,
  hueDistance,
  legendDomains,
  nodePaint,
} from '../graph-style';
import { domainRank, rankIn } from './palette';

/** Hue (degrees) of a `#rrggbb` colour. */
const hueOf = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

describe('hslToHex', () => {
  it('converts primaries and greys', () => {
    expect(hslToHex(0, 100, 50)).toBe('#ff0000');
    expect(hslToHex(120, 100, 50)).toBe('#00ff00');
    expect(hslToHex(240, 100, 50)).toBe('#0000ff');
    expect(hslToHex(0, 0, 50)).toBe('#808080');
  });
  it('wraps hues outside 0–360', () => {
    expect(hslToHex(-120, 100, 50)).toBe(hslToHex(240, 100, 50));
    expect(hslToHex(480, 100, 50)).toBe(hslToHex(120, 100, 50));
  });
});

describe('domain colours', () => {
  it('keeps the listed domains well apart on the colour wheel', () => {
    const hues = Object.values(DOMAIN_HUES);
    for (let i = 0; i < hues.length; i++)
      for (let j = i + 1; j < hues.length; j++)
        expect(hueDistance(hues[i], hues[j])).toBeGreaterThanOrEqual(60);
  });
  it('gives a new domain a stable hue clear of every listed one', () => {
    for (const d of ['law', 'hardware', 'finance', 'robotics']) {
      const h = domainHue(d);
      expect(domainHue(d)).toBe(h);
      for (const t of Object.values(DOMAIN_HUES)) expect(hueDistance(h, t)).toBeGreaterThan(30);
    }
    expect(domainColour('law')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('domainRank / rankIn', () => {
  it('orders the listed domains first, in DOMAIN_HUES order, then any other', () => {
    const listed = Object.keys(DOMAIN_HUES);
    expect(listed.map(domainRank)).toEqual(listed.map((_, i) => i));
    expect(domainRank('law')).toBe(listed.length);
    expect(rankIn(['a', 'b'], 'b')).toBe(1);
    expect(rankIn(['a', 'b'], 'z')).toBe(2);
  });
});

describe('cluster colours', () => {
  it('maps every labelled cluster to a domain', () => {
    expect(Object.keys(CLUSTER_DOMAIN).sort()).toEqual(Object.keys(CLUSTER_LABELS).sort());
    for (const d of Object.values(CLUSTER_DOMAIN)) expect(DOMAIN_HUES).toHaveProperty(d);
  });
  it('shades each cluster within its domain hue band', () => {
    for (const [cluster, domain] of Object.entries(CLUSTER_DOMAIN)) {
      const drift = hueDistance(hueOf(clusterColour(cluster)), DOMAIN_HUES[domain]);
      expect(drift).toBeLessThanOrEqual(CLUSTER_HUE_SPREAD + 2);
    }
  });
  it('gives clusters of one domain distinct colours', () => {
    for (const domain of Object.keys(DOMAIN_HUES)) {
      const colours = Object.entries(CLUSTER_DOMAIN)
        .filter(([, d]) => d === domain)
        .map(([c]) => clusterColour(c));
      expect(new Set(colours).size).toBe(colours.length);
    }
  });
  it('falls back to the domain colour for an unlisted cluster', () => {
    expect(clusterColour('brand-new', 'cs')).toBe(domainColour('cs'));
    expect(clusterColour('brand-new')).toBe('#a3a3a3');
  });
});

describe('nodePaint', () => {
  it('fills by cluster and has no ring for a single-domain term', () => {
    expect(nodePaint({ domain: ['security'], cluster: 'controls' })).toEqual({
      fill: clusterColour('controls'),
      ring: null,
    });
  });
  it("rings a multi-domain term in the other domain's colour", () => {
    const p = nodePaint({ domain: ['security', 'cs'], cluster: 'identity' });
    expect(p.fill).toBe(clusterColour('identity'));
    expect(p.ring).toBe(domainColour('security'));
  });
});

describe('legendDomains', () => {
  it('lists present domains in a stable order with their clusters', () => {
    const legend = legendDomains([
      { domain: ['platform'], cluster: 'cloud' },
      { domain: ['security'], cluster: 'controls' },
      { domain: ['security'], cluster: 'fundamentals' },
      { domain: ['ai', 'security'], cluster: 'llm' },
    ]);
    expect(legend.map((l) => l.domain)).toEqual(['security', 'ai', 'platform']);
    expect(legend[0].clusters.map((c) => c.cluster)).toEqual(['fundamentals', 'controls']);
  });
});

describe('cream map palette (A92, light theme)', () => {
  const domains = [...Object.keys(DOMAIN_HUES), 'some-new-domain'];

  it('keeps the dark palette as the default', () => {
    for (const d of domains) expect(domainColour(d, 'dark')).toBe(domainColour(d));
    for (const c of Object.keys(CLUSTER_DOMAIN))
      expect(clusterColour(c, undefined, 'dark')).toBe(clusterColour(c));
  });

  it('gives domain colours text contrast (AA) on cream and on the light chart surface', () => {
    for (const d of domains) {
      expect(contrastRatio(domainColour(d, 'light'), CREAM)).toBeGreaterThanOrEqual(4.5);
      // The timeline chart and term-page graph sit on --surface (#f5f5f5), not cream.
      expect(contrastRatio(domainColour(d, 'light'), '#f5f5f5')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gives cluster shades and family colours 3:1 on cream (non-text contrast)', () => {
    for (const c of Object.keys(CLUSTER_DOMAIN))
      expect(contrastRatio(clusterColour(c, undefined, 'light'), CREAM)).toBeGreaterThanOrEqual(3);
    for (const hex of Object.values(FAMILY_COLOURS_LIGHT))
      expect(contrastRatio(hex, CREAM)).toBeGreaterThanOrEqual(3);
  });

  it('keeps map text legible on its background in both themes', () => {
    expect(contrastRatio(MAP_INK.light.label, CREAM)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(MAP_INK.light.tick, CREAM)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(MAP_INK.dark.label, '#0a0a0a')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(MAP_INK.dark.tick, '#0a0a0a')).toBeGreaterThanOrEqual(4.5);
  });

  it('paints nodes, legends and edges from the cream palette when asked', () => {
    const n = { domain: ['security', 'cs'], cluster: 'controls' };
    expect(nodePaint(n, 'light')).toEqual({
      fill: clusterColour('controls', 'security', 'light'),
      ring: domainColour('cs', 'light'),
    });
    expect(legendDomains([n], 'light')[0].colour).toBe(domainColour('security', 'light'));
    const other = { domain: ['ai'], cluster: 'llm' };
    const p = edgePaint({ type: 'requires', family: 'dependency' }, n, other, 'light');
    expect(p.colour).toBe(FAMILY_COLOURS_LIGHT.dependency);
    expect(p.gradient?.[0]).toBe(domainColour('security', 'light'));
  });
});
