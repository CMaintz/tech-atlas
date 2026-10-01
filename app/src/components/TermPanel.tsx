import type { ComponentChildren } from 'preact';
import { frameAttrs } from './term-panel/attrs';
import ConnectionBar from './term-panel/ConnectionBar';
import { panelKeyHandler } from './term-panel/panel-keys';
import PanelBody from './term-panel/PanelBody';
import PanelToolbar from './term-panel/PanelToolbar';
import type { PanelProps, PartProps } from './term-panel/types';
import { usePanel } from './term-panel/use-panel';

export type { PanelConfig } from './term-panel/types';
export { prefetchTerm } from './term-panel/term-cache';

/** The panel's box: docked beside the map, or expanded over the page as a modal dialog. */
function PanelFrame({ panel, children }: PartProps & { children: ComponentChildren }) {
  const { expanded } = panel;
  return (
    <div
      ref={panel.refs.root}
      {...frameAttrs(expanded, panel.props.id)}
      onKeyDown={panelKeyHandler(panel)}
      class={`absolute top-0 right-0 bottom-0 z-20 flex w-full flex-col border-l border-border bg-bg/97 shadow-2xl shadow-black/20 dark:shadow-black/60 backdrop-blur transition-[width] duration-300 ease-out motion-reduce:transition-none ${expanded ? '' : 'lg:w-[26rem]'}`}
    >
      {children}
    </div>
  );
}

/**
 * The Explorer's term panel (A80): a term's essentials beside the map, in the site's
 * language: facets, what to learn first, relationships (which re-focus the map, never navigate),
 * self-assessment and a quick quiz. Expand fills the page below the header, with the
 * term's neighbourhood graph; "Read more", at the end of the panel, opens the full entry page.
 */
export default function TermPanel(props: PanelProps) {
  const panel = usePanel(props);
  if (!panel) return null;
  return (
    <PanelFrame panel={panel}>
      <PanelToolbar panel={panel} />
      <ConnectionBar panel={panel} />
      <p class="sr-only" aria-live="polite" data-panel-announce>
        {panel.nav.announce}
      </p>
      <PanelBody panel={panel} />
    </PanelFrame>
  );
}
