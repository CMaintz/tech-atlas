import type { ComponentProps } from 'preact';
import Explorer from './Explorer';
import LabPanel from './lab/LabPanel';
import { useVisualLab } from './lab/use-visual-lab';

type Props = Omit<ComponentProps<typeof Explorer>, 'lab'> & { view: '2d' | '3d' };

/**
 * The hidden visual lab (A96): the real Explorer, plus a floating panel that swaps in
 * old visual effects live (restyle, never relayout), a frame meter and a scripted
 * benchmark. Toggles start from the address (`?curve=bezier&bench=1`); nothing is stored.
 */
export default function ExplorerLab(props: Props) {
  const lab = useVisualLab(props);
  const all = props.view === '2d' ? lab.s2.all : lab.s3.all;
  return (
    <>
      <Explorer
        {...props}
        lab={{ mode: props.view, showAll: all, onMaps: (m) => lab.setMaps({ ...m }) }}
      />
      <LabPanel lab={lab} />
    </>
  );
}
