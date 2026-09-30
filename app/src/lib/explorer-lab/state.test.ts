import { describe, expect, it } from 'vitest';
import { DEFAULT_2D, DEFAULT_3D, toneActive, toneChanged } from './state';
import { benchReport } from './frames';
import { emphasisChannels } from './emphasis';
import { tone } from './colour';

describe('visual lab: tone', () => {
  it('is active only when a tone value differs from today', () => {
    expect(toneActive(DEFAULT_2D)).toBe(false);
    expect(toneActive(DEFAULT_3D)).toBe(false);
    expect(toneActive({ ...DEFAULT_2D, labelHalo: 3 })).toBe(true);
    expect(toneActive({ ...DEFAULT_3D, shadow: 2 })).toBe(true);
  });
  it('notices a change in any shared tone value', () => {
    expect(toneChanged(DEFAULT_3D, { ...DEFAULT_3D, bloom: true })).toBe(false);
    expect(toneChanged(DEFAULT_3D, { ...DEFAULT_3D, edgeDark: 0.1 })).toBe(true);
  });
  it('tones hex colours only, and leaves them alone at 1 × / + 0', () => {
    expect(tone('#3366cc', 1, 0)).toBe('#3366cc');
    expect(tone('rgba(1,2,3,0.5)', 2, 0.1)).toBe('rgba(1,2,3,0.5)');
    expect(tone('#808080', 1, 0.1)).toBe('#9a9a9a');
  });
});

describe('visual lab: emphasis channels', () => {
  it('maps each mode to the channels it drives', () => {
    expect(emphasisChannels('off')).toEqual({ alpha: false, colour: false, width: false });
    expect(emphasisChannels('colour')).toEqual({ alpha: false, colour: true, width: false });
    expect(emphasisChannels('combined')).toEqual({ alpha: true, colour: true, width: true });
  });
});

describe('visual lab: benchmark report', () => {
  it('reports the view, average fps, 1% low, longest frame and the toggles', () => {
    const times = Array.from({ length: 61 }, (_, i) => i * (1000 / 60));
    expect(benchReport('2d', times, [])).toEqual({
      view: '2d',
      fps: 60,
      low: 60,
      longest: 17,
      toggles: 'defaults',
    });
    expect(benchReport('3d', times, ['bloom=true', 'fog=false']).toggles).toBe(
      'bloom=true fog=false',
    );
  });
});
