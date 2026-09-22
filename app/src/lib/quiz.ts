/**
 * Quiz questions generated from the graph (SPEC §9: learning falls out of the
 * relationships). Pure — the caller supplies the random source.
 */
import { prerequisitesOf, type Graph, type GraphNode } from './graph-model';

export type Lang = 'en' | 'da';
export type QuestionKind = 'definition' | 'contrast' | 'prerequisite' | 'relation';
export type Question = {
  termId: string;
  kind: QuestionKind;
  prompt: string;
  options: { id: string; label: string }[];
  answer: string;
};
type Rng = () => number;

const T = {
  definition: {
    en: (s: string) => `Which term matches this definition? “${s}”`,
    da: (s: string) => `Hvilket begreb passer til denne definition? “${s}”`,
  },
  contrast: {
    en: (x: string) => `Which of these is easily confused with ${x}?`,
    da: (x: string) => `Hvilket af disse forveksles let med ${x}?`,
  },
  prerequisite: {
    en: (x: string) => `What should you understand before ${x}?`,
    da: (x: string) => `Hvad bør du forstå før ${x}?`,
  },
  mitigates: {
    en: (x: string) => `What does ${x} help protect against?`,
    da: (x: string) => `Hvad hjælper ${x} med at beskytte mod?`,
  },
  mandates: {
    en: (x: string) => `Which of these does ${x} require?`,
    da: (x: string) => `Hvilket af disse kræver ${x}?`,
  },
  exploits: {
    en: (x: string) => `What does ${x} take advantage of?`,
    da: (x: string) => `Hvad udnytter ${x}?`,
  },
} as const;

const shuffle = <T>(xs: T[], rng: Rng) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = <T>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)];

export function makeQuizzer(graph: Graph, lang: Lang, rng: Rng = Math.random) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const out = (id: string, type: string) =>
    graph.links.filter((l) => l.source === id && l.type === type).map((l) => l.target);
  const both = (id: string, type: string) =>
    graph.links
      .filter((l) => l.type === type && (l.source === id || l.target === id))
      .map((l) => (l.source === id ? l.target : l.source));
  const dependants = (id: string) =>
    graph.nodes.filter((n) => prerequisitesOf(graph, n.id).some((p) => p.id === id));

  /**
   * Three wrong answers: same cluster first, then same domain. Never anything
   * taxonomically joined to the answer or an alternative to it — those would make
   * the question ambiguous (the Atlas demo's distractor rule).
   */
  const distractors = (answer: GraphNode, exclude: Set<string>) => {
    const joined = new Set([
      answer.id,
      ...exclude,
      ...graph.links
        .filter(
          (l) =>
            (l.family === 'structure' || l.type === 'alternative-to') &&
            (l.source === answer.id || l.target === answer.id),
        )
        .flatMap((l) => [l.source, l.target]),
    ]);
    const pool = (f: (n: GraphNode) => boolean) =>
      shuffle(
        graph.nodes.filter((n) => !joined.has(n.id) && f(n)),
        rng,
      );
    return [
      ...pool((n) => n.cluster === answer.cluster),
      ...pool(
        (n) => n.cluster !== answer.cluster && n.domain.some((d) => answer.domain.includes(d)),
      ),
    ].slice(0, 3);
  };

  const build = (
    term: GraphNode,
    kind: QuestionKind,
    prompt: string,
    answer: GraphNode,
    exclude: Set<string>,
  ): Question | null => {
    const wrong = distractors(answer, exclude);
    if (wrong.length < 3) return null;
    return {
      termId: term.id,
      kind,
      prompt,
      answer: answer.id,
      options: shuffle([answer, ...wrong], rng).map((n) => ({ id: n.id, label: n.term[lang] })),
    };
  };

  /** Every question this term supports (at most one per kind). */
  const questionsFor = (id: string): Question[] => {
    const term = byId.get(id);
    if (!term) return [];
    const name = term.term[lang];
    const qs: (Question | null)[] = [];

    if (term.summary) {
      qs.push(build(term, 'definition', T.definition[lang](term.summary[lang]), term, new Set()));
    }
    const contrasts = both(id, 'contrasts-with');
    if (contrasts.length) {
      qs.push(
        build(
          term,
          'contrast',
          T.contrast[lang](name),
          byId.get(pick(contrasts, rng))!,
          new Set([id, ...contrasts]),
        ),
      );
    }
    if (term.requires.length) {
      const blocked = new Set([
        id,
        ...prerequisitesOf(graph, id).map((n) => n.id),
        ...dependants(id).map((n) => n.id),
      ]);
      qs.push(
        build(
          term,
          'prerequisite',
          T.prerequisite[lang](name),
          byId.get(pick(term.requires, rng))!,
          blocked,
        ),
      );
    }
    for (const type of ['mitigates', 'mandates', 'exploits'] as const) {
      const targets = out(id, type);
      if (!targets.length) continue;
      qs.push(
        build(
          term,
          'relation',
          T[type][lang](name),
          byId.get(pick(targets, rng))!,
          new Set([id, ...targets]),
        ),
      );
      break; // one relation question per term is enough
    }
    return qs.filter((q): q is Question => q !== null);
  };

  return {
    questionsFor,
    shuffle: <T>(xs: T[]) => shuffle(xs, rng),
    pick: <T>(xs: T[]) => pick(xs, rng),
  };
}
