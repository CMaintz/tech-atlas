import { H_ZOOM } from '../../lib/timeline-layout';

/** The last zoom level (levels run from 0 to this). */
const MAX_ZOOM = H_ZOOM.length - 1;

/** Whether zooming `step` (-1 out, +1 in) from `zoom` stays within the zoom levels. */
export const canZoom = (zoom: number, step: number) => zoom + step >= 0 && zoom + step <= MAX_ZOOM;

/** The zoom level `step` away from `zoom`, held within the zoom levels. */
export const zoomBy = (zoom: number, step: number) => Math.min(MAX_ZOOM, Math.max(0, zoom + step));
