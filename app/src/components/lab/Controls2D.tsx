import type { Lab2D } from '../../lib/explorer-lab';
import { Note, PickList, Slider, Toggle, binder } from './controls';
import { CURVES, FLOWS_2D, HOVERS, LABELS, labelled } from './options';
import {
  EmphasisControls,
  LayoutControls,
  ToneControls,
  type ControlProps,
} from './SharedControls';

type P = ControlProps<Lab2D>;

export default function Controls2D(p: P) {
  const { s, set, t } = p;
  return (
    <>
      <EdgeControls {...p} />
      <MapControls {...p} />
      <EmphasisControls s={s} set={set} t={t} />
      <Toggle label={t.texture} {...binder(s, set)('texture')} />
      <Note text={t.textureNote} />
      <LayoutControls s={s} set={set} t={t} />
      <ToneControls s={s} set={set} t={t}>
        <LabelTone {...p} />
      </ToneControls>
    </>
  );
}

function EdgeControls({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <PickList label={t.curve} {...b('curve')} options={labelled(t, CURVES)} />
      <Slider label={t.strength} {...b('strength')} min={0} max={4} step={0.1} />
      <Toggle label={t.gradient} {...b('gradient')} />
      <PickList label={t.flow} {...b('flow')} options={labelled(t, FLOWS_2D)} />
      <Slider label={t.speed} {...b('speed')} min={0} max={4} step={0.1} />
    </>
  );
}

function MapControls({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <PickList label={t.hover} {...b('hover')} options={labelled(t, HOVERS)} />
      <PickList label={t.labels} {...b('labels')} options={labelled(t, LABELS)} />
      <Toggle label={t.glow} {...b('glow')} />
      <Toggle label={t.all} {...b('all')} />
    </>
  );
}

function LabelTone({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <Slider label={t.labelWeight} {...b('labelWeight')} min={3} max={8} step={1} />
      <Slider label={t.labelHalo} {...b('labelHalo')} min={0} max={5} step={0.5} />
    </>
  );
}
