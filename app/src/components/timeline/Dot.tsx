import { inkVars, type Ink } from './ink';

/** The dot for one term: domain colour, larger for hubs, ringed when in a second domain. */
export function Dot({ colour, ring, hub }: { colour: Ink; ring: Ink | null; hub: boolean }) {
  const size = hub ? 12 : 8;
  const shadow = [
    ring ? '0 0 0 1.5px var(--chart-bg), 0 0 0 3.5px var(--ink2)' : '',
    hub ? '0 0 10px var(--ink)' : '',
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <span
      aria-hidden="true"
      class="map-ink inline-block shrink-0 rounded-full"
      style={`${inkVars(colour, ring)}width:${size}px;height:${size}px;background:var(--ink);${shadow ? `box-shadow:${shadow};` : ''}`}
    />
  );
}

/** A decade's background: every other one faintly shaded. */
export const stripe = (i: number) =>
  i % 2 ? 'color-mix(in srgb, var(--fg) 4.5%, transparent)' : 'transparent';
