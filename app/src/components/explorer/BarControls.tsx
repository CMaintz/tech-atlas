import { familyColours } from '../../lib/graph-style';
import { DomainChips } from './DomainChips';
import { FindTerm } from './FindTerm';
import { RelationshipTypes } from './RelationshipTypes';
import { RouteForm } from './RouteForm';

import type { Section } from './use-explorer';

export function Domains({ p, x, compact, wrap }: Section & { compact: boolean; wrap?: boolean }) {
  return (
    <DomainChips
      domains={x.index.allDomains}
      enabled={x.filters.domains}
      onToggle={x.filters.toggleDomain}
      labels={p.domainLabels}
      groupLabel={p.ui.domains}
      theme={x.theme}
      compact={compact}
      wrap={wrap}
    />
  );
}

export function Relationships({ p, x }: Section) {
  return (
    <RelationshipTypes
      filters={x.filters}
      families={Object.keys(p.familyColours)}
      colours={familyColours(x.theme)}
      labels={p.familyLabels}
      graphUi={p.graphUi}
      legend={p.ui.relationshipTypes}
    />
  );
}

export function Route({ p, x }: Section) {
  return <RouteForm ui={p.ui} route={x.route} onFind={x.findRoute} />;
}

export function Find({ p, x }: Section) {
  return (
    <FindTerm
      ui={p.ui}
      name={x.index.name}
      search={x.search}
      field={x.bar.find}
      size={x.bar.size.size}
      sheet={x.bar.size.sheet}
      onPick={x.pick}
    />
  );
}
