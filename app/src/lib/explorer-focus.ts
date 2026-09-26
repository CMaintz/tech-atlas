/**
 * What the Explorer's maps light up, as pure state (A99): a selection (or a route)
 * always wins over hover, hover is ignored while the map moves, and the relationship
 * labels on lit links. Shared by the 2D and 3D maps; no DOM, so it is unit-tested.
 */

export type FocusInput = {
  selected: string | null;
  /** A route is highlighted. */
  route: boolean;
  /** The term under the pointer. */
  hovered: string | null;
  /** The map is moving, or has not seen the pointer move since it stopped. */
  moving: boolean;
};

export type Focus = {
  /** Hover drives the look: this term's neighbourhood lit, the rest faded. */
  hood: string | null;
  /** Hovered while a selection or route holds the look: only this term brightens. */
  preview: string | null;
};

/** Selection wins: with a term selected (or a route shown) hover only adds a preview. */
export function effectiveFocus({ selected, route, hovered: h, moving }: FocusInput): Focus {
  const hovered = moving ? null : h;
  if (selected || route) return { hood: null, preview: hovered === selected ? null : hovered };
  return { hood: hovered, preview: null };
}

/**
 * Hover is off while the map moves (auto-rotate, a camera glide, a drag, the wheel,
 * keys) and stays off until the pointer itself moves again once it has stopped: a
 * resting pointer that terms drifted under is not a hover.
 */
export function createMotionGate() {
  let moving = false;
  let stale = false;
  return {
    /** Report whether the map is moving now. Returns true when motion just started. */
    motion(on: boolean) {
      const started = on && !moving;
      moving = on;
      if (on) stale = true;
      return started;
    },
    /** The pointer moved. */
    pointer() {
      if (!moving) stale = false;
    },
    get open() {
      return !moving && !stale;
    },
  };
}
export type MotionGate = ReturnType<typeof createMotionGate>;

/**
 * A relationship's name read from `pov`'s side, e.g. "requires" from its source and
 * "unlocks" from its target; lower-cased to sit on a line. `label` maps a type (or an
 * inverse type) to its text, `inverse` a type to its inverse type.
 */
export function relationLabel(
  link: { source: string; target: string; type: string },
  pov: string,
  label: Readonly<Record<string, string>>,
  inverse: Readonly<Record<string, string>>,
) {
  const type = link.source === pov ? link.type : (inverse[link.type] ?? link.type);
  const text = label[type] ?? type;
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}

/** Relationship names by type (and inverse type), and each type's inverse type. */
export type RelationNames = {
  label: Readonly<Record<string, string>>;
  inverse: Readonly<Record<string, string>>;
};

export type LabelBox = { id: string; x: number; y: number; w: number; h: number };

/** Greedy placement: boxes in priority order, each kept unless it overlaps a kept one. */
export function cullBoxes(boxes: readonly LabelBox[], pad = 2): Set<string> {
  const kept: LabelBox[] = [];
  for (const b of boxes) {
    const hit = kept.some(
      (k) => Math.abs(k.x - b.x) * 2 < k.w + b.w + pad && Math.abs(k.y - b.y) * 2 < k.h + b.h + pad,
    );
    if (!hit) kept.push(b);
  }
  return new Set(kept.map((k) => k.id));
}

/** The axis-aligned size of a w × h box rotated by `angle` (radians). */
export function rotatedSize(w: number, h: number, angle: number) {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return { w: w * c + h * s, h: w * s + h * c };
}

/**
 * Whose relationships are labelled: the selected term's, else a hovered term's when its
 * lit links are few (`hoverMax`), else nobody's (a route alone has none).
 */
export function labelPov(
  focus: Focus,
  selected: string | null,
  hoverLinks: number,
  hoverMax: number,
): string | null {
  if (selected) return selected;
  if (focus.hood && hoverLinks <= hoverMax) return focus.hood;
  return null;
}
