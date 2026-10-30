export type FocusInput = {
  selected: string | null;
  route: boolean;
  hovered: string | null;
  moving: boolean;
};

export type Focus = {
  hood: string | null;
  preview: string | null;
};

export function effectiveFocus({ selected, route, hovered: h, moving }: FocusInput): Focus {
  const hovered = moving ? null : h;
  if (selected || route) return { hood: null, preview: hovered === selected ? null : hovered };
  return { hood: hovered, preview: null };
}

export function createMotionGate() {
  let moving = false;
  let stale = false;
  return {
    motion(on: boolean) {
      const started = on && !moving;
      moving = on;
      if (on) stale = true;
      return started;
    },
    pointer() {
      if (!moving) stale = false;
    },
    get open() {
      return !moving && !stale;
    },
  };
}
export type MotionGate = ReturnType<typeof createMotionGate>;

export type RelationNames = {
  label: Readonly<Record<string, string>>;
  inverse: Readonly<Record<string, string>>;
};

export function relationLabel(
  link: { source: string; target: string; type: string },
  pov: string,
  { label, inverse }: RelationNames,
) {
  const type = link.source === pov ? link.type : (inverse[link.type] ?? link.type);
  const text = label[type] ?? type;
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}

export type LabelBox = { id: string; x: number; y: number; w: number; h: number };

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

export function rotatedSize(w: number, h: number, angle: number) {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return { w: w * c + h * s, h: w * s + h * c };
}

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
