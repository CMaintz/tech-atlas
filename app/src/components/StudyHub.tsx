import { useEffect, useState } from 'preact/hooks';
import type { Graph } from '../lib/graph-model';
import { isDue, isKnown, isWeak, loadLearner, recommendNext, type Learner } from '../lib/learner';
import type { Scope } from '../lib/quiz';
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

/** Progress, what to learn next, and a quiz session — all from local learner state. */
export default function StudyHub({
  lang,
  graphUrl,
  termBase,
  ui,
  clusterLabels,
  domainLabels,
}: Props) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [learner, setLearner] = useState<Learner>({ terms: {} });
  const [scope, setScope] = useState<Scope>('all');
  const [round, setRound] = useState(0);

  useEffect(() => {
    fetch(graphUrl)
      .then((r) => r.json())
      .then(setGraph);
    const refresh = () => setLearner(loadLearner());
    refresh();
    window.addEventListener('atlas:learner', refresh);
    return () => window.removeEventListener('atlas:learner', refresh);
  }, [graphUrl]);

  const states = Object.values(learner.terms);
  const practised = states.filter((s) => s.right + s.wrong > 0).length;
  const known = states.filter(isKnown).length;
  const due = states.filter((s) => isDue(s)).length;
  const weak = states.filter(isWeak).length;
  const next = graph ? recommendNext(graph, learner) : [];
  const total = graph?.nodes.length ?? 0;

  return (
    <div class="space-y-10">
      <section>
        <h2 class="mb-3 text-xs tracking-widest text-subtle uppercase">{ui.progress}</h2>
        <dl class="grid grid-cols-3 gap-4">
          {[
            [ui.practised, practised],
            [ui.known, known],
            [ui.dueNow, due],
          ].map(([label, value]) => (
            <div class="rounded border border-border p-3">
              <dt class="text-xs text-subtle">{label}</dt>
              <dd class="text-2xl font-semibold">
                {value}
                {label === ui.known && total ? (
                  <span class="text-sm text-subtle"> / {total}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        <p class="mt-2 text-xs text-subtle">{ui.localNote}</p>
      </section>

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

      <section>
        <h2 class="mb-3 text-xs tracking-widest text-subtle uppercase">{ui.practise}</h2>
        <label class="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted">
          {ui.quizMeOn}
          <select
            class="min-h-11 rounded border border-border-strong bg-surface px-2 py-1 text-base text-fg sm:min-h-0 sm:text-sm"
            value={scope}
            onChange={(e) => {
              setScope((e.target as HTMLSelectElement).value as Scope);
              setRound(round + 1);
            }}
          >
            <option value="all">{ui.everything}</option>
            <option value="weak">{ui.weakTerms.replace('{n}', String(weak))}</option>
            <optgroup label={ui.domains}>
              {Object.entries(domainLabels).map(([d, label]) => (
                <option value={`domain:${d}`}>{label}</option>
              ))}
            </optgroup>
            <optgroup label={ui.clusters}>
              {Object.entries(clusterLabels).map(([c, label]) => (
                <option value={`cluster:${c}`}>{label}</option>
              ))}
            </optgroup>
          </select>
        </label>
        <Quiz
          key={`${scope}-${round}`}
          lang={lang}
          graphUrl={graphUrl}
          termBase={termBase}
          ui={ui}
          scope={scope}
        />
      </section>
    </div>
  );
}
