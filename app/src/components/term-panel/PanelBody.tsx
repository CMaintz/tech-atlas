import { neighbourhoodGraph } from '../../lib/term-panel';
import GraphView from '../Graph';
import CheckYourself from './CheckYourself';
import Facets from './Facets';
import HowToPreview from './HowToPreview';
import PanelHeading from './PanelHeading';
import { LearnFirst, Relationships } from './Relations';
import TermHeader from './TermHeader';
import type { PartProps } from './types';

/** "Read more", at the end of the panel: the full entry page. */
function ReadMore({ panel }: PartProps) {
  const { props } = panel;
  return (
    <a
      class="flex w-full items-center justify-center gap-2 rounded border border-border-strong px-3 py-2 text-sm font-medium text-fg hover:border-border-hover hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-(--focus)"
      href={`${props.termBase}${props.id}/`}
      title={props.text.readMoreLabel}
      data-panel-read-more
    >
      {props.text.readMore}
    </a>
  );
}

/** Expanded only: the term's neighbourhood graph beside the text. */
function Neighbourhood({ panel: { props } }: PartProps) {
  const mini = neighbourhoodGraph(props.graph, props.id, props.lang, props.edgeLabels);
  return (
    <aside aria-label={props.ui.connections} class="lg:sticky lg:top-0 lg:self-start">
      <PanelHeading spacing="mb-2">{props.ui.connections}</PanelHeading>
      <GraphView
        key={props.id}
        {...mini}
        termBase={props.termBase}
        familyLabels={props.familyLabels}
        domainLabels={props.domainLabels}
        clusterLabels={props.clusterLabels}
        text={props.graphUi}
        onSelect={props.onSelect}
      />
    </aside>
  );
}

/** The panel's sections, top to bottom. */
function PanelSections({ panel }: PartProps) {
  return (
    <div class="space-y-6">
      <TermHeader panel={panel} />
      <Facets panel={panel} />
      <HowToPreview panel={panel} />
      <LearnFirst panel={panel} />
      <Relationships panel={panel} />
      <CheckYourself key={panel.props.id} panel={panel} />
      <ReadMore panel={panel} />
    </div>
  );
}

/** The scrolling body: one column docked; text and graph side by side expanded. */
export default function PanelBody({ panel }: PartProps) {
  const layout = panel.expanded
    ? 'mx-auto grid max-w-page gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,48rem)_minmax(22rem,1fr)]'
    : 'px-4 py-4';
  return (
    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class={layout}>
        <PanelSections panel={panel} />
        {panel.expanded && <Neighbourhood panel={panel} />}
      </div>
    </div>
  );
}
