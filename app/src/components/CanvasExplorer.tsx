import { useCallback } from 'preact/hooks';
import AboutButton from './AboutButton';
import TermPanel from './TermPanel';
import Toolbar from './canvas-lab/Toolbar';
import Legend from './canvas-lab/Legend';
import { useCanvasLab, type CanvasLab, type CanvasLabProps } from './canvas-lab/use-canvas-lab';

export default function CanvasExplorer(props: CanvasLabProps) {
  const lab = useCanvasLab(props);
  const { t } = lab.chrome;
  return (
    <div class="map-surface relative h-[calc(100vh-4.25rem)] overflow-hidden">
      <h1 class="sr-only">{t.title}</h1>
      {!lab.graph && <p class="p-6 pt-20 text-subtle">{props.ui.loading}</p>}
      <LabCanvas lab={lab} />
      <Toolbar lab={lab} />
      <Legend chrome={lab.chrome} mode={lab.ui.mode} />
      <AboutCorner lab={lab} />
      <LabTermPanel lab={lab} />
    </div>
  );
}

function LabCanvas({ lab }: { lab: CanvasLab }) {
  const { t } = lab.chrome;
  return (
    <canvas
      ref={lab.refs.canvas}
      data-lab-canvas
      class="absolute inset-0 h-full w-full touch-none"
      style={{ cursor: lab.ui.mode === 'flat' ? 'grab' : 'move' }}
      aria-label={t.title}
    />
  );
}

function AboutCorner({ lab }: { lab: CanvasLab }) {
  return (
    <div
      class={`absolute top-3 right-3 z-10 transition-[right] duration-300 motion-reduce:transition-none ${lab.sel ? 'lg:right-[calc(26rem+0.75rem)]' : ''}`}
      data-about-corner
    >
      <AboutButton {...lab.chrome.site.about} />
    </div>
  );
}

function LabTermPanel({ lab }: { lab: CanvasLab }) {
  const setSelected = lab.ui.setSelected;
  const closePanel = useCallback(() => setSelected(null), []);
  if (!lab.graph || !lab.sel) return null;
  return (
    <TermPanel
      {...panelProps(lab.chrome.site)}
      id={lab.sel.id}
      graph={lab.graph}
      onSelect={setSelected}
      onClose={closePanel}
    />
  );
}

function panelProps(site: CanvasLabProps) {
  const { panel, lang, termBase, clusterLabels, domainLabels, familyLabels, graphUi } = site;
  return { ...panel, lang, termBase, clusterLabels, domainLabels, familyLabels, graphUi };
}
