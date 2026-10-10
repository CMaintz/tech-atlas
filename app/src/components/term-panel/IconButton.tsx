import type { JSX, Ref } from 'preact';

export const ARROW_LEFT = 'M19 12H5m6-6-6 6 6 6';
export const ARROW_RIGHT = 'M5 12h14m-6-6 6 6-6 6';
export const CHEVRON_LEFT = 'm15 6-6 6 6 6';
export const CHEVRON_RIGHT = 'm9 6 6 6-6 6';
export const EXPAND = 'M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7';
export const COLLAPSE = 'M20 10h-6V4M4 14h6v6M14 10l7-7M10 14l-7 7';
export const CLOSE = 'M6 6l12 12M18 6 6 18';

const ICON_BTN =
  'grid h-7 w-7 shrink-0 place-items-center rounded text-fg-soft hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)';

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

type IconButtonProps = Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'label'> & {
  icon: string;
  label: string;
  extraClass?: string;
  buttonRef?: Ref<HTMLButtonElement>;
};

export function IconButton({ icon, label, extraClass, buttonRef, ...rest }: IconButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      class={extraClass ? `${ICON_BTN} ${extraClass}` : ICON_BTN}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon d={icon} />
    </button>
  );
}
