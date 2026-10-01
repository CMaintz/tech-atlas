import { dotShadow, inkVars, type Ink } from './ink';

/** The dot for one term: domain colour, larger for hubs, ringed when in a second domain. */
export function Dot({ colour, ring, hub }: { colour: Ink; ring: Ink | null; hub: boolean }) {
  const size = hub ? 12 : 8;
  const shadow = dotShadow(!!ring, hub);
  return (
    <span
      aria-hidden="true"
      class="map-ink inline-block shrink-0 rounded-full"
      style={`${inkVars(colour, ring)}width:${size}px;height:${size}px;background:var(--ink);${shadow ? `box-shadow:${shadow};` : ''}`}
    />
  );
}
