import type { ComponentChildren } from 'preact';
import ConnectionBar from './term-panel/ConnectionBar';
import { panelKeyHandler } from './term-panel/panel-keys';
import PanelBody from './term-panel/PanelBody';
import PanelToolbar from './term-panel/PanelToolbar';
import type { PanelProps, PartProps } from './term-panel/types';
import { usePanel } from './term-panel/use-panel';

export type { PanelConfig } from './term-panel/types';
export { prefetchTerm } from './term-panel/term-cache';

function DockedOrModalPanelFrame({ panel, children }: PartProps & { children: ComponentChildren }) {
  const { expanded } = panel;
  return (
    <div
      ref={panel.refs.root}
      role={expanded ? 'dialog' : 'complementary'}
      aria-modal={expanded ? true : undefined}
      aria-labelledby="tp-title"
      data-term-panel={panel.props.id}
      data-expanded={expanded ? '' : undefined}
      onKeyDown={panelKeyHandler(panel)}
      class={`absolute top-0 right-0 bottom-0 z-20 flex w-full flex-col border-l border-border bg-bg/97 shadow-2xl shadow-black/20 dark:shadow-black/60 backdrop-blur transition-[width] duration-300 ease-out motion-reduce:transition-none ${expanded ? '' : 'lg:w-[26rem]'}`}
    >
      {children}
    </div>
  );
}

export default function TermPanel(props: PanelProps) {
  const panel = usePanel(props);
  if (!panel) return null;
  return (
    <DockedOrModalPanelFrame panel={panel}>
      <PanelToolbar panel={panel} />
      <ConnectionBar panel={panel} />
      <p class="sr-only" aria-live="polite" data-panel-announce>
        {panel.nav.announce}
      </p>
      <PanelBody panel={panel} />
    </DockedOrModalPanelFrame>
  );
}
