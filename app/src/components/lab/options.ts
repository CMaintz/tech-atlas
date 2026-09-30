/**
 * The visual lab's choice lists: each option's value and its label's key in TEXT,
 * in menu order. The address accepts exactly these values (CHOICES_2D / CHOICES_3D).
 */
import { EMPHASES, type Emphasis, type Lab2D, type Lab3D } from '../../lib/explorer-lab';
import type { Text } from './text';

type Options<T extends string> = readonly (readonly [T, keyof Text])[];

export const CURVES: Options<Lab2D['curve']> = [
  ['haystack', 'haystack'],
  ['bezier', 'bezier'],
  ['unbundled', 'unbundled'],
];
export const FLOWS_2D: Options<Lab2D['flow']> = [
  ['dots', 'dots'],
  ['dashes', 'dashes'],
  ['none', 'none'],
];
export const HOVERS: Options<Lab2D['hover']> = [
  ['current', 'hoverNow'],
  ['old', 'hoverOld'],
];
export const LABELS: Options<Lab2D['labels']> = [
  ['none', 'labelsNone'],
  ['hubs', 'labelsHubs'],
  ['current', 'labelsNow'],
  ['all', 'labelsAll'],
];
export const EMPHASIS: Options<Emphasis> = [
  ['off', 'emphOff'],
  ['opacity', 'emphOpacity'],
  ['colour', 'emphColour'],
  ['width', 'emphWidth'],
  ['combined', 'emphCombined'],
];
export const LINKS: Options<Lab3D['links']> = [
  ['lines', 'lines'],
  ['tubes', 'tubes'],
];
export const FLOWS_3D: Options<Lab3D['flow']> = [
  ['comets', 'comets'],
  ['particles', 'particles'],
  ['none', 'none'],
];
export const GLOWS: Options<Lab3D['glow']> = [
  ['cloud', 'cloud'],
  ['sprites', 'sprites'],
];

/** An option list with its labels in the reader's language. */
export const labelled = <T extends string>(t: Text, options: Options<T>) =>
  options.map(([v, key]) => [v, t[key]] as const);

const values = <T extends string>(options: Options<T>) => options.map(([v]) => v);

/** The values each 2D / 3D choice may take in the address. */
export const CHOICES_2D = {
  curve: values(CURVES),
  flow: values(FLOWS_2D),
  hover: values(HOVERS),
  labels: values(LABELS),
  emph: EMPHASES,
};
export const CHOICES_3D = {
  links: values(LINKS),
  flow: values(FLOWS_3D),
  glow: values(GLOWS),
  emph: EMPHASES,
};
