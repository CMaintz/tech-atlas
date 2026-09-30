import { useCallback } from 'preact/hooks';
import AboutButton from './AboutButton';
import TermPanel from './TermPanel';
import Toolbar from './canvas-lab/Toolbar';
import Legend from './canvas-lab/Legend';
import { useCanvasLab, type CanvasLab, type CanvasLabProps } from './canvas-lab/use-canvas-lab';

/**
 * The canvas Explorer lab (A91): one <canvas>, a 2D context and "fake 3D" — every term
 * has x/y/z, projected each frame with yaw/pitch and a simple perspective, drawn back to
 * front. Flat = the front view with pan and zoom; Depth = orbit. One rAF loop that only
 * paints when something changed or is moving. Hidden page for comparison only.
 */
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

/** The one canvas the loop paints (a grab cursor in Flat, move in Depth). */
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

/** About "i": top-right of the map, moving left of the term panel when it opens. */
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

/** The selected term's panel (A80), as in the Explorer. */
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

/** The page's panel config, language, links and labels, as the term panel takes them. */
function panelProps(site: CanvasLabProps) {
  const { panel, lang, termBase, clusterLabels, domainLabels, familyLabels, graphUi } = site;
  return { ...panel, lang, termBase, clusterLabels, domainLabels, familyLabels, graphUi };
}
