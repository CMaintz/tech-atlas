import { Chip } from '../ui/Chip';
import { SegmentedControl } from '../ui/SegmentedControl';
import type { Layout } from '../../lib/explorer-2d';
import type { Mode } from '../../lib/explorer-view';
import type { ColourMode, ViewControls } from '../../lib/use-explorer-view';
import type { Dict } from './types';

const MODES = [
  { value: '2d', label: '2D' },
  { value: '3d', label: '3D' },
] as const;

type Props = { ui: Dict; controls: ViewControls };

/** 2D or 3D. */
export function ModeSegment({ ui, controls }: Props) {
  return (
    <SegmentedControl<Mode>
      label={ui.view}
      options={MODES}
      value={controls.mode}
      onChange={controls.setMode}
    />
  );
}

/** The 2D layouts (force, depth, time), or in 3D the auto-rotate toggle. */
export function LayoutControl(props: Props) {
  return props.controls.mode === '3d' ? <SpinToggle {...props} /> : <LayoutSegment {...props} />;
}

/** The 3D galaxy's auto-rotate. */
function SpinToggle({ ui, controls }: Props) {
  const { spin, setSpin } = controls;
  return (
    <Chip active={spin} aria-pressed={spin} onClick={() => setSpin(!spin)}>
      <span aria-hidden="true">⟳</span> {ui.autoRotate}
    </Chip>
  );
}

function LayoutSegment({ ui, controls }: Props) {
  const layouts = [
    { value: 'force', label: ui.layoutForce },
    { value: 'depth', label: ui.layoutDepth },
    { value: 'time', label: ui.layoutTime },
  ] as const;
  const { layout, setLayout } = controls;
  return (
    <SegmentedControl<Layout>
      label={ui.view}
      options={layouts}
      value={layout}
      onChange={setLayout}
    />
  );
}

/** Colour the terms by cluster or by what the reader knows (SPEC §9). */
export function ColourSegment({ ui, controls }: Props) {
  const options = [
    { value: 'cluster', label: ui.byCluster },
    { value: 'knowledge', label: ui.byKnowledge },
  ] as const;
  return (
    <SegmentedControl<ColourMode>
      label={ui.colourBy}
      options={options}
      value={controls.colourMode}
      onChange={controls.setColourMode}
    />
  );
}
