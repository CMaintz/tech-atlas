/** The visual lab's (A96) 3D panel: links, flow, glow, scene, emphasis, layout, tone. */
import type { Lab3D } from '../../lib/explorer-lab';
import { Note, Pick, Slide, Toggle, binder } from './controls';
import { FLOWS_3D, GLOWS, LINKS, labelled } from './options';
import { Emph, LayoutControls, ToneControls, type ControlProps } from './SharedControls';

type P = ControlProps<Lab3D>;

export default function Controls3D(p: P) {
  const { s, set, t } = p;
  return (
    <>
      <LinkControls {...p} />
      <SceneControls {...p} />
      <Emph s={s} set={set} t={t} />
      <Note text={t.emphNote3d} when={s.emph !== 'off'} />
      <LayoutControls s={s} set={set} t={t} />
      <Toggle label={t.clabels} {...binder(s, set)('clabels')} />
      <ToneControls s={s} set={set} t={t} />
    </>
  );
}

/** Link geometry and curvature, one-way flow and its speed, glow, node spacing. */
function LinkControls({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <Pick label={t.links} {...b('links')} options={labelled(t, LINKS)} />
      <Slide label={t.curvature} {...b('curvature')} min={0} max={0.6} step={0.02} />
      <Pick label={t.flow} {...b('flow')} options={labelled(t, FLOWS_3D)} />
      <Slide label={t.speed} {...b('speed')} min={0} max={4} step={0.1} />
      <Pick label={t.glow3} {...b('glow')} options={labelled(t, GLOWS)} />
      <Slide label={t.spacing} {...b('spacing')} min={0.5} max={2} step={0.05} />
    </>
  );
}

/** Bloom (night map only), auto-rotate, fog and "show all relationships". */
function SceneControls({ s, set, t }: P) {
  const b = binder(s, set);
  return (
    <>
      <Toggle label={t.bloom} {...b('bloom')} />
      <Note text={t.bloomLight} when={s.bloom} />
      <Toggle label={t.spin} {...b('spin')} />
      <Toggle label={t.fog} {...b('fog')} />
      <Toggle label={t.all} {...b('all')} />
    </>
  );
}
