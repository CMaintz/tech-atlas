/**
 * The panel's ARIA and data attributes, kept out of the markup (pure, so testable).
 * Keys are in the order the markup used to list them, so the rendered DOM is unchanged.
 */

/**
 * The panel box's semantics: a complementary landmark docked, a modal dialog expanded,
 * labelled by the term's name and tagged with its id.
 */
export function frameAttrs(expanded: boolean, id: string) {
  return {
    role: expanded ? ('dialog' as const) : ('complementary' as const),
    'aria-modal': expanded ? true : undefined,
    'aria-labelledby': 'tp-title',
    'data-term-panel': id,
    'data-expanded': expanded ? '' : undefined,
  };
}

/** A facet tab's WAI-ARIA tab semantics: only the selected tab is in the Tab order. */
export function tabAttrs(facet: string, selected: boolean) {
  return {
    role: 'tab' as const,
    id: `tp-tab-${facet}`,
    'aria-selected': selected,
    'aria-controls': 'tp-facet',
    tabIndex: selected ? 0 : -1,
  };
}

/** A 16×16 stroke icon on a 24-unit grid, hidden from assistive technology. */
export const ICON_SVG = {
  viewBox: '0 0 24 24',
  width: '16',
  height: '16',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
} as const;
