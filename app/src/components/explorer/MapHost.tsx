import type { Section } from './use-explorer';

/** The map host: focusable, so the keyboard can move the map (A97). Both maps live here. */
export function MapHost({ p, x }: Section) {
  const { onPoint } = x.maps;
  return (
    <div
      ref={x.maps.host}
      tabIndex={0}
      role="application"
      aria-label={p.graphUi.mapLabel}
      data-map-keys
      class="absolute inset-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus)"
      onPointerDown={() => onPoint(null)}
      onWheel={() => onPoint(null)}
    >
      <MapBoxes p={p} x={x} />
    </div>
  );
}

/** The 2D and 3D maps' boxes, the hidden one kept (invisible) so it keeps its state. */
function MapBoxes({ p, x }: Section) {
  const mode = x.controls.mode;
  return (
    <>
      {/* Cytoscape forces its container to position: relative, so it fills a wrapper. */}
      <div class={`absolute inset-0 ${mode === '2d' ? '' : 'invisible'}`}>
        <div ref={x.maps.box2d} class="h-full w-full">
          {!x.graph && <p class="p-6 pt-20 text-subtle">{p.ui.loading}</p>}
        </div>
      </div>
      <div class={`absolute inset-0 ${mode === '3d' ? '' : 'invisible'}`}>
        <div ref={x.maps.box3d} class="h-full w-full" />
      </div>
    </>
  );
}
