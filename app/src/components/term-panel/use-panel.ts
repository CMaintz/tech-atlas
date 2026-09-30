import { useMemo } from 'preact/hooks';
import { useTheme } from '../../lib/use-theme';
import { termCache } from './term-cache';
import type { Panel, PanelProps } from './types';
import { usePanelChrome } from './use-panel-chrome';
import { usePanelNav } from './use-panel-nav';
import { useTermRecord } from './use-term-record';

/**
 * Everything one open panel shares between its parts; null when the term is not on the
 * map (every hook has still run, so the hook order never changes).
 */
export function usePanel(props: PanelProps): Panel | null {
  const { graph, id, lang } = props;
  const theme = useTheme();
  const cache = termCache(props.apiBase);
  const term = useTermRecord(cache, graph, id);
  const chrome = usePanelChrome(props.onClose);
  const nameOf = (x: string) => graph.nodes.find((n) => n.id === x)?.term[lang] ?? x;
  const nav = usePanelNav({ ...props, nameOf }, chrome.refs.heading);
  const node = useMemo(() => graph.nodes.find((n) => n.id === id), [graph, id]);
  if (!node) return null;
  return { ...chrome, ...term, props, node, theme, cache, nav, nameOf };
}
