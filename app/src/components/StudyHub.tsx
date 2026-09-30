import { useState } from 'preact/hooks';
import type { Graph } from '../lib/graph-model';
import { progressOf, recommendNext, type Learner } from '../lib/learner';
import type { Scope } from '../lib/quiz';
import { useGraph } from '../lib/use-graph';
import { useLearner } from '../lib/use-learner';
import Quiz from './Quiz';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;

interface Props {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  ui: Dict;
  clusterLabels: Dict;
  domainLabels: Dict;
}

function Stat({ label, value, total }: { label: string; value: number; total?: number }) {
  return (
    <div class="rounded border border-border p-3">
      <dt class="text-xs text-subtle">{label}</dt>
      <dd class="text-2xl font-semibold">
        {value}
        {total ? <span class="text-sm text-subtle"> / {total}</span> : null}
      </dd>
    </div>
  );
}

type ProgressProps = { progress: ReturnType<typeof progressOf>; total: number; ui: Dict };

function Progress({ progress: { practised, known, due }, total, ui }: ProgressProps) {
  return (
    <section>
      <h2 class="mb-3 text-xs tracking-widest text-subtle uppercase">{ui.progress}</h2>
      <dl class="grid grid-cols-3 gap-4">
        <Stat label={ui.practised} value={practised} />
        <Stat label={ui.known} value={known} total={total} />
        <Stat label={ui.dueNow} value={due} />
      </dl>
      <p class="mt-2 text-xs text-subtle">{ui.localNote}</p>
    </section>
  );
}

type RecommendedProps = {
  graph: Graph | null;
  learner: Learner;
  lang: Lang;
  termBase: string;
  ui: Dict;
};

function Recommended({ graph, learner, lang, termBase, ui }: RecommendedProps) {
  const next = graph ? recommendNext(graph, learner) : [];
  return (
    <section>
      <h2 class="mb-1 text-xs tracking-widest text-subtle uppercase">{ui.recommended}</h2>
      <p class="mb-3 text-sm text-subtle">{ui.recommendedIntro}</p>
      <ul class="flex flex-wrap gap-2">
        {next.map((n) => (
          <li>
            <a
              class="inline-flex min-h-11 items-center rounded border border-border-strong px-2 py-1 text-sm hover:border-border-hover sm:min-h-0"
              href={`${termBase}${n.id}/`}
            >
              {n.term[lang]}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One group of scopes (domains, or clusters): `<prefix>:<id>` per label. */
function ScopeGroup({ label, prefix, labels }: { label: string; prefix: string; labels: Dict }) {
  return (
    <optgroup label={label}>
      {Object.entries(labels).map(([id, name]) => (
        <option value={`${prefix}:${id}`}>{name}</option>
      ))}
    </optgroup>
  );
}

type ScopeSelectProps = Props & { scope: Scope; weak: number; onChange: (s: Scope) => void };

/** What to quiz on: everything, weak terms, one domain or one cluster. */
function ScopeSelect({ scope, weak, ui, domainLabels, clusterLabels, onChange }: ScopeSelectProps) {
  return (
    <select
      class="min-h-11 rounded border border-border-strong bg-surface px-2 py-1 text-base text-fg sm:min-h-0 sm:text-sm"
      value={scope}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value as Scope)}
    >
      <option value="all">{ui.everything}</option>
      <option value="weak">{ui.weakTerms.replace('{n}', String(weak))}</option>
      <ScopeGroup label={ui.domains} prefix="domain" labels={domainLabels} />
      <ScopeGroup label={ui.clusters} prefix="cluster" labels={clusterLabels} />
    </select>
  );
}

/** Pick a scope and quiz on it; each pick starts a fresh session. */
function Practise(props: Props & { weak: number }) {
  const [scope, setScope] = useState<Scope>('all');
  const [round, setRound] = useState(0);
  const choose = (s: Scope) => {
    setScope(s);
    setRound(round + 1);
  };
  return (
    <section>
      <h2 class="mb-3 text-xs tracking-widest text-subtle uppercase">{props.ui.practise}</h2>
      <label class="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        {props.ui.quizMeOn}
        <ScopeSelect {...props} scope={scope} onChange={choose} />
      </label>
      <Quiz key={`${scope}-${round}`} {...props} scope={scope} />
    </section>
  );
}

/** Progress, what to learn next, and a quiz session — all from local learner state. */
export default function StudyHub(props: Props) {
  const graph = useGraph(props.graphUrl);
  const learner = useLearner();
  const progress = progressOf(learner);
  return (
    <div class="space-y-10">
      <Progress progress={progress} total={graph?.nodes.length ?? 0} ui={props.ui} />
      <Recommended graph={graph} learner={learner} {...props} />
      <Practise {...props} weak={progress.weak} />
    </div>
  );
}
