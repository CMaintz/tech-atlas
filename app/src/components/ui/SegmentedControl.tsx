import type { ComponentChildren } from 'preact';

/** The segmented control's frame: one rounded row of joined buttons. */
export const SEGMENT_GROUP =
  'flex w-fit shrink-0 overflow-hidden rounded-full border border-border-strong';

/** One segment's classes: inverted when it is the chosen option. */
export const segmentClass = (active: boolean) =>
  `px-2 py-1 text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus) ${active ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`;

export type Segment<T extends string> = { value: T; label: ComponentChildren };

interface Props<T extends string> {
  /** The group's accessible name. */
  label: string;
  options: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** A row of mutually exclusive options, each a pressed-or-not button. */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: Props<T>) {
  return (
    <div class={SEGMENT_GROUP} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          class={segmentClass(value === o.value)}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
