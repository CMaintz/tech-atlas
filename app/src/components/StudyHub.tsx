import { useEffect, useState } from 'preact/hooks';
import type { Graph } from '../lib/graph-model';
import { isDue, isKnown, loadLearner, recommendNext, type Learner } from '../lib/learner';
import Quiz from './Quiz';

type Lang = 'en' | 'da';
type Dict = Record<string, string>;

interface Props {
  lang: Lang;
  graphUrl: string;
  termBase: string;
  ui: Dict;
  clusterLabels: Dict;
}

/** Progress, what to learn next, and a quiz session — all from local learner state. */
export default function StudyHub({ lang, graphUrl, termBase, ui, clusterLabels }: Props) {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [learner, setLearner] = useState<Learner>({ terms: {} });
  const [scope, setScope] = useState('all');
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
  const next = graph ? recommendNext(graph, learner) : [];
  const total = graph?.nodes.length ?? 0;

  return (
    <div class="space-y-10">
      <section>
        <h2 class="mb-3 text-xs tracking-widest text-neutral-500 uppercase">{ui.progress}</h2>
        <dl class="grid grid-cols-3 gap-4">
          {[
            [ui.practised, practised],
            [ui.known, known],
            [ui.dueNow, due],
          ].map(([label, value]) => (
            <div class="rounded border border-neutral-800 p-3">
              <dt class="text-xs text-neutral-500">{label}</dt>
              <dd class="text-2xl font-semibold">
                {value}
                {label === ui.known && total ? (
                  <span class="text-sm text-neutral-500"> / {total}</span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
        <p class="mt-2 text-xs text-neutral-500">{ui.localNote}</p>
      </section>

      <section>
        <h2 class="mb-1 text-xs tracking-widest text-neutral-500 uppercase">{ui.recommended}</h2>
        <p class="mb-3 text-sm text-neutral-500">{ui.recommendedIntro}</p>
        <ul class="flex flex-wrap gap-2">
          {next.map((n) => (
            <li>
              <a
                class="rounded border border-neutral-700 px-2 py-1 text-sm hover:border-neutral-400"
                href={`${termBase}${n.id}/`}
              >
                {n.term[lang]}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 class="mb-3 text-xs tracking-widest text-neutral-500 uppercase">{ui.practise}</h2>
        <select
          class="mb-4 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
          value={scope}
          onChange={(e) => {
            setScope((e.target as HTMLSelectElement).value);
            setRound(round + 1);
          }}
        >
          <option value="all">{ui.allTerms}</option>
          {Object.entries(clusterLabels).map(([c, label]) => (
            <option value={c}>{label}</option>
          ))}
        </select>
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
