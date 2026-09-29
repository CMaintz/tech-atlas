/**
 * The hidden visual lab (A96): the pure half. Toggle state read from the address (so a
 * headless run is a list of URLs, and nothing is stored), frame-time statistics for the
 * FPS meter, the 2D stylesheet rules each toggle adds over the Explorer's own, and
 * emphasis by importance. The parts live under explorer-lab/.
 */
export {
  DEFAULT_2D,
  DEFAULT_3D,
  changed,
  fromQuery,
  toneActive,
  toneChanged,
  toneValues,
  type Lab2D,
  type Lab3D,
  type Layout,
  type Tone,
} from './explorer-lab/state';
export { averageFps, benchReport, frameStats, type FrameStats } from './explorer-lab/frames';
export { rules2D, stateRules, toneRules } from './explorer-lab/rules';
export {
  EMPHASES,
  TYPE_IMPORTANCE,
  alphaGain,
  emphasisChannels,
  importance,
  intensity,
  widthGain,
  type Emphasis,
} from './explorer-lab/emphasis';
export { emphasise, tone } from './explorer-lab/colour';
