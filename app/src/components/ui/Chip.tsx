import type { JSX } from 'preact';

export const chipClass = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap focus-visible:outline-2 focus-visible:outline-(--focus) ${active ? 'border-border-hover bg-surface-2/80 text-fg' : 'border-border-strong text-muted hover:border-border-hover hover:text-fg-soft'}`;

type ChipProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class'> & {
  active?: boolean;
  extra?: string;
};

export function Chip({ active = false, extra, type = 'button', ...rest }: ChipProps) {
  const cls = extra ? `${chipClass(active)} ${extra}` : chipClass(active);
  return <button type={type} class={cls} {...rest} />;
}
