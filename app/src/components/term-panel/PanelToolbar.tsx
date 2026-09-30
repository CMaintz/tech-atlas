import { ARROW_LEFT, ARROW_RIGHT, CLOSE, COLLAPSE, EXPAND, IconButton } from './IconButton';
import type { PartProps } from './types';

/** Back (-1) or Forward (1) through the terms viewed in this panel. */
function HistoryButton({ panel, dir }: PartProps & { dir: 1 | -1 }) {
  const { nav, props } = panel;
  const atEnd = dir === -1 ? nav.trail.pos <= 0 : nav.trail.pos >= nav.trail.entries.length - 1;
  return (
    <IconButton
      icon={dir === -1 ? ARROW_LEFT : ARROW_RIGHT}
      label={dir === -1 ? props.text.historyBack : props.text.historyForward}
      extraClass="aria-disabled:opacity-40"
      aria-disabled={atEnd}
      data-panel-back={dir === -1 || undefined}
      data-panel-forward={dir === 1 || undefined}
      onClick={() => nav.move(dir)}
    />
  );
}

/** Expand over the page (with the neighbourhood graph) or dock beside the map again. */
function ExpandButton({ panel }: PartProps) {
  const { expanded, setExpanded, props } = panel;
  return (
    <IconButton
      buttonRef={panel.refs.expandBtn}
      icon={expanded ? COLLAPSE : EXPAND}
      label={expanded ? props.text.panelCollapseLabel : props.text.panelExpandLabel}
      extraClass="ml-auto"
      aria-expanded={expanded}
      data-panel-expand
      onClick={() => setExpanded(!expanded)}
    />
  );
}

/** The panel's header bar: Back/Forward, Expand/Collapse and Close. */
export default function PanelToolbar({ panel }: PartProps) {
  return (
    <div class="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
      <HistoryButton panel={panel} dir={-1} />
      <HistoryButton panel={panel} dir={1} />
      <ExpandButton panel={panel} />
      <IconButton
        icon={CLOSE}
        label={panel.props.text.panelClose}
        data-panel-close
        onClick={panel.props.onClose}
      />
    </div>
  );
}
