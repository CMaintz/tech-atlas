/** The visual lab's 2D panel: edges, flow, hover, labels, emphasis, layout, tone. */
import type { Lab2D } from '../../lib/explorer-lab';
import { Note, Pick, Slide, Toggle, binder } from './controls';
import { CURVES, FLOWS_2D, HOVERS, LABELS, labelled } from './options';
import { Emph, LayoutControls, ToneControls, type ControlProps } from './SharedControls';

type P = ControlProps<Lab2D>;

export default function Controls2D(p: P) {
  const { s, set, t } = p;
  return (
    <>
      <EdgeControls {...p} />
      <MapControls {...p} />
      <Emph s={s} set={set} t={t} />
      <Toggle label={t.texture} {...binder(s, set)('texture')} />
      <Note text={t.textureNote} />
      <LayoutControls s={s} set={set} t={t} />
      <ToneControls s={s} set={set} t={t}>
        <LabelTone {...p} />
      </ToneControls>
    </>
  );
}

/** Edge curve and strength, gradient edges, one-way flow and its speed. */
function EdgeControls({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <Pick label={t.curve} {...b('curve')} options={labelled(t, CURVES)} />
      <Slide label={t.strength} {...b('strength')} min={0} max={4} step={0.1} />
      <Toggle label={t.gradient} {...b('gradient')} />
      <Pick label={t.flow} {...b('flow')} options={labelled(t, FLOWS_2D)} />
      <Slide label={t.speed} {...b('speed')} min={0} max={4} step={0.1} />
    </>
  );
}

/** Hover restyle, labels, node glow and "show all relationships". */
function MapControls({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <Pick label={t.hover} {...b('hover')} options={labelled(t, HOVERS)} />
      <Pick label={t.labels} {...b('labels')} options={labelled(t, LABELS)} />
      <Toggle label={t.glow} {...b('glow')} />
      <Toggle label={t.all} {...b('all')} />
    </>
  );
}

/** The cream map's label weight and halo (2D only). */
function LabelTone({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <Slide label={t.labelWeight} {...b('labelWeight')} min={3} max={8} step={1} />
      <Slide label={t.labelHalo} {...b('labelHalo')} min={0} max={5} step={0.5} />
    </>
  );
}
