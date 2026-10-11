import { Chip } from '../ui/Chip';
import type { Graph } from '../../lib/graph-model';
import type { Route } from '../../lib/use-explorer-state';
import { BAR_FIELD } from './styles';
import type { Dict, Lang } from './types';

export function TermOptions({ graph, lang }: { graph: Graph | null; lang: Lang }) {
  return (
    <datalist id="atlas-terms">
      {(graph?.nodes ?? []).map((n) => (
        <option value={n.term[lang]} />
      ))}
    </datalist>
  );
}

function RouteEnd(props: { label: string; value: string; onInput: (v: string) => void }) {
  return (
    <input
      list="atlas-terms"
      placeholder={props.label}
      aria-label={props.label}
      value={props.value}
      onInput={(e) => props.onInput((e.target as HTMLInputElement).value)}
      class={BAR_FIELD}
    />
  );
}

type Props = { ui: Dict; route: Route; onFind: () => void };

export function RouteForm({ ui, route, onFind }: Props) {
  const { from, setFrom, to, setTo } = route.fields;
  const submit = (e: Event) => {
    e.preventDefault();
    onFind();
  };
  return (
    <form class="space-y-2" onSubmit={submit}>
      <RouteEnd label={ui.from} value={from} onInput={setFrom} />
      <RouteEnd label={ui.to} value={to} onInput={setTo} />
      <RouteActions ui={ui} onClear={route.clear} />
      {route.message && <RouteMessage text={route.message} />}
    </form>
  );
}

function RouteActions({ ui, onClear }: { ui: Dict; onClear: () => void }) {
  return (
    <div class="flex gap-2">
      <Chip type="submit" active>
        {ui.findRoute}
      </Chip>
      <Chip onClick={onClear}>{ui.clear}</Chip>
    </div>
  );
}

function RouteMessage({ text }: { text: string }) {
  return (
    <p class="text-fg-soft" aria-live="polite">
      {text}
    </p>
  );
}
