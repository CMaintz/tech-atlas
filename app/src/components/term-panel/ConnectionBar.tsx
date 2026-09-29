import type { ComponentChildren } from 'preact';
import { CHEVRON_LEFT, CHEVRON_RIGHT, IconButton } from './IconButton';
import type { Dict, PartProps } from './types';

/** "↩ anchor": back to the term whose connections are being walked. */
function ReturnToAnchor({ panel }: PartProps) {
  const { nav } = panel;
  return (
    <button
      type="button"
      class="text-fg-soft underline hover:text-fg focus-visible:outline-2 focus-visible:outline-(--focus)"
      title={panel.props.text.returnTo.replace('{name}', nav.anchorName)}
      onClick={() => nav.go(nav.walk.anchor, { via: 'step', index: null })}
    >
      ↩ {nav.anchorName}
    </button>
  );
}

/** "{n} connections" (or the singular). */
const connectionCount = (text: Dict, n: number) =>
  n === 1 ? text.connectionCountOne : text.connectionCount.replace('{n}', String(n));

/** Where Previous/Next stand: the connection count, or the position and a way back. */
function CyclePosition({ panel }: PartProps) {
  const { nav } = panel;
  return (
    <p class="min-w-0 flex-1 truncate text-center text-muted" data-panel-position>
      {nav.atAnchor ? (
        connectionCount(panel.props.text, nav.cycle.length)
      ) : (
        <>
          {nav.positionOf(nav.walk.index)}
          {' · '}
          <ReturnToAnchor panel={panel} />
        </>
      )}
    </p>
  );
}

/** Previous (-1) or Next (1) through the anchor term's connections. */
function StepButton({ panel, dir }: PartProps & { dir: 1 | -1 }) {
  const { nav, props } = panel;
  const label = dir === 1 ? props.text.nextConnectionLabel : props.text.prevConnectionLabel;
  return (
    <IconButton
      icon={dir === 1 ? CHEVRON_RIGHT : CHEVRON_LEFT}
      label={label.replace('{name}', nav.anchorName)}
      data-panel-prev={dir === -1 || undefined}
      data-panel-next={dir === 1 || undefined}
      onClick={() => nav.step(dir)}
    />
  );
}

/** Previous / Next through the anchor term's connections, with the position between. */
function CycleNav({ panel }: PartProps) {
  const { nav, props, expanded } = panel;
  return (
    <div
      role="group"
      aria-label={props.text.connectionsOf.replace('{name}', nav.anchorName)}
      data-panel-cycle={nav.walk.anchor}
      class={`flex items-center gap-1 ${expanded ? 'w-full max-w-md' : ''}`}
    >
      <StepButton panel={panel} dir={-1} />
      <CyclePosition panel={panel} />
      <StepButton panel={panel} dir={1} />
    </div>
  );
}

/** The host's map actions for this term (Explorer: prerequisites, neighbourhood, whole map). */
function PanelActions({ label, children }: { label?: string; children: ComponentChildren }) {
  return (
    <div
      role="group"
      aria-label={label}
      data-panel-actions
      class="flex flex-wrap items-center gap-x-0.5 gap-y-1 [&>button]:border-transparent [&>button]:px-1.5 [&>button]:py-0.5 [&>button]:text-muted [&>button:hover]:bg-surface-2 [&>button:hover]:text-fg [&>button[aria-pressed=true]]:bg-surface-2 [&>button[aria-pressed=true]]:text-fg"
    >
      {label && (
        <span class="mr-1 text-subtle" aria-hidden="true">
          {label}:
        </span>
      )}
      {children}
    </div>
  );
}

/** The strip under the header: Previous/Next and the map actions; absent when both are. */
export default function ConnectionBar({ panel }: PartProps) {
  const { nav, props, expanded } = panel;
  if (nav.cycle.length === 0 && !props.actions) return null;
  const layout = expanded
    ? 'mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-1 sm:px-5'
    : 'space-y-1';
  return (
    <div class="shrink-0 border-b border-border px-3 py-1.5 text-xs">
      <div class={layout}>
        {nav.cycle.length > 0 && <CycleNav panel={panel} />}
        {props.actions && <PanelActions label={props.actionsLabel}>{props.actions}</PanelActions>}
      </div>
    </div>
  );
}
