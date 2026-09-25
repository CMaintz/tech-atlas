/**
 * Quiz questions generated from the graph (SPEC §9: learning falls out of the
 * relationships). Pure — the caller supplies the random source.
 *
 * Two families of question (A79):
 *  - **about** a term X — its relationships, where the answer is always ANOTHER term
 *    (or true/false): what X requires, what builds on X, what X is a kind of, what
 *    protects against X, which term is not connected to X, …
 *  - **answered by** X — "which term matches this definition?" and "what does X
 *    mean?". These give X away on X's own page, so a term page shows them only for
 *    X's neighbours; domain and overall sessions use both families.
 */
import { prerequisitesOf, type Graph, type GraphNode } from './graph-model';
import { isDue, isWeak, type Learner } from './learner';
import type { EdgeType } from '../schema';

export type Lang = 'en' | 'da';
export type QuestionKind = 'definition' | 'meaning' | 'relation' | 'odd-one-out' | 'true-false';
export type Question = {
  /** The term whose spaced-repetition record this answer updates. */
  termId: string;
  kind: QuestionKind;
  prompt: string;
  options: { id: string; label: string }[];
  /** Id of the correct option (a term id, or 'true' / 'false'). */
  answer: string;
  /** The term to read when the answer was wrong. */
  link: string;
};
type Rng = () => number;
type Dir = 'out' | 'in';
type Bi = Record<Lang, (x: string) => string>;

/** Relation questions: one template per edge type and direction. `x` is the question's term. */
const ASK: Partial<Record<EdgeType, Partial<Record<Dir, Bi>>>> = {
  requires: {
    out: {
      en: (x) => `What should you understand before ${x}?`,
      da: (x) => `Hvad bør du forstå før ${x}?`,
    },
    in: {
      en: (x) => `Which of these builds on ${x}?`,
      da: (x) => `Hvilket af disse bygger videre på ${x}?`,
    },
  },
  'kind-of': {
    out: { en: (x) => `What is ${x} a kind of?`, da: (x) => `Hvad er ${x} en slags?` },
    in: {
      en: (x) => `Which of these is a kind of ${x}?`,
      da: (x) => `Hvilket af disse er en slags ${x}?`,
    },
  },
  'part-of': {
    out: { en: (x) => `What is ${x} part of?`, da: (x) => `Hvad er ${x} en del af?` },
    in: {
      en: (x) => `Which of these is part of ${x}?`,
      da: (x) => `Hvilket af disse er en del af ${x}?`,
    },
  },
  implements: {
    out: {
      en: (x) => `What does ${x} put into practice?`,
      da: (x) => `Hvad omsætter ${x} til praksis?`,
    },
    in: {
      en: (x) => `Which of these puts ${x} into practice?`,
      da: (x) => `Hvilket af disse omsætter ${x} til praksis?`,
    },
  },
  mitigates: {
    out: {
      en: (x) => `What does ${x} help protect against?`,
      da: (x) => `Hvad hjælper ${x} med at beskytte mod?`,
    },
    in: {
      en: (x) => `What helps protect against ${x}?`,
      da: (x) => `Hvad hjælper med at beskytte mod ${x}?`,
    },
  },
  exploits: {
    out: {
      en: (x) => `What does ${x} take advantage of?`,
      da: (x) => `Hvad er det, ${x} udnytter?`,
    },
    in: {
      en: (x) => `What takes advantage of ${x}?`,
      da: (x) => `Hvad er det, der udnytter ${x}?`,
    },
  },
  causes: {
    out: { en: (x) => `What can ${x} lead to?`, da: (x) => `Hvad kan ${x} føre til?` },
    in: { en: (x) => `What can lead to ${x}?`, da: (x) => `Hvad kan føre til ${x}?` },
  },
  mandates: {
    out: {
      en: (x) => `Which of these does ${x} make mandatory?`,
      da: (x) => `Hvilket af disse kræves af ${x}?`,
    },
    in: {
      en: (x) => `Which rule makes ${x} mandatory?`,
      da: (x) => `Hvilken regel gør ${x} obligatorisk?`,
    },
  },
  supersedes: {
    out: { en: (x) => `What did ${x} replace?`, da: (x) => `Hvad blev afløst af ${x}?` },
    in: { en: (x) => `What replaced ${x}?`, da: (x) => `Hvad har afløst ${x}?` },
  },
  'contrasts-with': {
    out: {
      en: (x) => `Which of these is easily confused with ${x}?`,
      da: (x) => `Hvilket af disse forveksles let med ${x}?`,
    },
  },
  'alternative-to': {
    out: {
      en: (x) => `Which of these is an alternative to ${x}?`,
      da: (x) => `Hvilket af disse er et alternativ til ${x}?`,
    },
  },
  'used-with': {
    out: {
      en: (x) => `Which of these is often used together with ${x}?`,
      da: (x) => `Hvilket af disse bruges ofte sammen med ${x}?`,
    },
  },
};
const SYMMETRIC = new Set<EdgeType>(['contrasts-with', 'alternative-to', 'used-with']);
/** Types whose chains are also right answers (a prerequisite's prerequisite is one too). */
const TRANSITIVE = new Set<EdgeType>(['requires', 'kind-of', 'part-of', 'supersedes']);

/**
 * True/false statements, only for edge types whose reverse is certainly false in
 * the map (a `requires` cycle is a lint error; nothing is a kind of its own kind),
 * so the false version is never true by accident.
 */
const STATE: Partial<Record<EdgeType, Record<Lang, (a: string, b: string) => string>>> = {
  requires: {
    en: (a, b) => `You need to understand ${b} before ${a}.`,
    da: (a, b) => `Man skal forstå ${b} før ${a}.`,
  },
  'kind-of': { en: (a, b) => `${a} is a kind of ${b}.`, da: (a, b) => `${a} er en slags ${b}.` },
  'part-of': { en: (a, b) => `${a} is part of ${b}.`, da: (a, b) => `${a} er en del af ${b}.` },
  implements: {
    en: (a, b) => `${a} puts ${b} into practice.`,
    da: (a, b) => `${a} omsætter ${b} til praksis.`,
  },
  supersedes: { en: (a, b) => `${a} replaced ${b}.`, da: (a, b) => `${a} afløste ${b}.` },
};

const T = {
  definition: {
    en: (s: string) => `Which term matches this definition? “${s}”`,
    da: (s: string) => `Hvilket begreb passer til denne definition? “${s}”`,
  },
  meaning: {
    en: (x: string) => `What does ${x} mean?`,
    da: (x: string) => `Hvad betyder ${x}?`,
  },
  odd: {
    en: (x: string) => `Which of these is NOT related to ${x}?`,
    da: (x: string) => `Hvilket af disse hænger IKKE sammen med ${x}?`,
  },
  trueFalse: {
    en: (s: string) => `True or false? ${s}`,
    da: (s: string) => `Sandt eller falsk? ${s}`,
  },
  true: { en: 'True', da: 'Sandt' },
  false: { en: 'False', da: 'Falsk' },
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

/** Round-robin over kinds so a short session mixes question types. */
function varied(qs: Question[], n: number, rng: Rng): Question[] {
  const byKind = new Map<QuestionKind, Question[]>();
  for (const q of shuffle(qs, rng)) byKind.set(q.kind, [...(byKind.get(q.kind) ?? []), q]);
  const queues = shuffle([...byKind.values()], rng);
  const out: Question[] = [];
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && out.length < n) out.push(q.shift()!);
  }
  return out;
}

export function makeQuizzer(graph: Graph, lang: Lang, rng: Rng = Math.random) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const edges = new Map<string, { type: EdgeType; dir: Dir; other: string }[]>();
  const add = (id: string, e: { type: EdgeType; dir: Dir; other: string }) =>
    edges.set(id, [...(edges.get(id) ?? []), e]);
  for (const l of graph.links) {
    if (l.source === l.target) continue;
    add(l.source, { type: l.type, dir: 'out', other: l.target });
    add(l.target, { type: l.type, dir: 'in', other: l.source });
  }
  const edgesOf = (id: string) => edges.get(id) ?? [];
  /** Endpoints of `type` edges from `id` in `dir` (both directions for symmetric types). */
  const ends = (id: string, type: EdgeType, dir: Dir) => [
    ...new Set(
      edgesOf(id)
        .filter((e) => e.type === type && (SYMMETRIC.has(type) || e.dir === dir))
        .map((e) => e.other),
    ),
  ];
  const neighbours = (id: string) => new Set(edgesOf(id).map((e) => e.other));
  /** Everything reachable through `type` edges in `dir` — every term that is also a right answer. */
  const closure = (id: string, type: EdgeType, dir: Dir) => {
    const seen = new Set<string>();
    const walk = (x: string) => {
      for (const y of ends(x, type, dir)) {
        if (seen.has(y) || y === id) continue;
        seen.add(y);
        walk(y);
      }
    };
    walk(id);
    return seen;
  };
  /** Structural relatives (kind of / part of / implements) and alternatives, either direction. */
  const relatives = (id: string) =>
    edgesOf(id)
      .filter((e) => ['kind-of', 'part-of', 'implements', 'alternative-to'].includes(e.type))
      .map((e) => e.other);
  /** Relatives plus terms it is easily confused with: close enough to also seem right. */
  const kin = (id: string) => [
    ...relatives(id),
    ...edgesOf(id)
      .filter((e) => e.type === 'contrasts-with')
      .map((e) => e.other),
  ];
  /** Named in each other's prose: a learner would fairly call these related. */
  const mentioned = (id: string) => {
    const own = byId.get(id)?.mentions ?? [];
    return [...own, ...graph.nodes.filter((n) => n.mentions.includes(id)).map((n) => n.id)];
  };
  const name = (n: GraphNode) => n.term[lang];

  /**
   * Three wrong answers, most plausible first: terms playing the same role elsewhere
   * in the map (e.g. other things something protects against), then the answer's
   * cluster, then its domain. Never anything in `exclude`, nor a structural relative
   * or alternative of the answer — each would make the question ambiguous.
   */
  const distractors = (
    answer: GraphNode,
    exclude: Set<string>,
    role?: { type: EdgeType; dir: Dir },
    filter: (n: GraphNode) => boolean = () => true,
  ) => {
    const blocked = new Set([answer.id, ...exclude, ...relatives(answer.id)]);
    const fits = (n: GraphNode) =>
      role
        ? edgesOf(n.id).some(
            (e) => e.type === role.type && (SYMMETRIC.has(role.type) || e.dir !== role.dir),
          )
        : false;
    const scored = shuffle(
      graph.nodes.filter((n) => !blocked.has(n.id) && filter(n)),
      rng,
    )
      .map((n) => ({
        n,
        score:
          (fits(n) ? 2 : 0) +
          (n.cluster === answer.cluster ? 2 : 0) +
          (n.domain.some((d) => answer.domain.includes(d)) ? 1 : 0),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((s) => s.n);
  };

  const multiple = (
    termId: string,
    kind: QuestionKind,
    prompt: string,
    answer: GraphNode,
    wrong: GraphNode[],
    label: (n: GraphNode) => string = name,
    link = answer.id,
  ): Question | null =>
    wrong.length < 3
      ? null
      : {
          termId,
          kind,
          prompt,
          answer: answer.id,
          link,
          options: shuffle([answer, ...wrong], rng).map((n) => ({ id: n.id, label: label(n) })),
        };

  // ---- Questions answered BY a term (they name it) --------------------------------

  /** Definition → term: the stem is `id`'s summary, the answer is `id`. */
  const definitionOf = (id: string, avoid: Set<string> = new Set()): Question | null => {
    const t = byId.get(id);
    if (!t?.summary) return null;
    const wrong = distractors(t, avoid);
    return multiple(id, 'definition', T.definition[lang](t.summary[lang]), t, wrong);
  };

  /** Term → definition: the stem names `id`, the options are summaries. */
  const meaningOf = (id: string, avoid: Set<string> = new Set()): Question | null => {
    const t = byId.get(id);
    if (!t?.summary) return null;
    const wrong = distractors(t, avoid, undefined, (n) => !!n.summary);
    return multiple(id, 'meaning', T.meaning[lang](name(t)), t, wrong, (n) => n.summary![lang]);
  };

  // ---- Questions ABOUT a term (never answered by it) ------------------------------

  /** One question per (edge type, direction) the term has; the answer is the other end. */
  const relationsOf = (id: string): Question[] => {
    const t = byId.get(id)!;
    // Every neighbour, its close kin (a kind of a right answer is half right) and
    // every prose mention is off the table as a wrong answer.
    const near = [...neighbours(id)];
    const around = [...near, ...near.flatMap(kin), ...mentioned(id)];
    const seen = new Set<string>();
    const qs: (Question | null)[] = [];
    for (const e of shuffle(edgesOf(id), rng)) {
      const dir: Dir = SYMMETRIC.has(e.type) ? 'out' : e.dir;
      const key = `${e.type}:${dir}`;
      const ask = ASK[e.type]?.[dir];
      if (!ask || seen.has(key)) continue;
      seen.add(key);
      const valid = ends(id, e.type, dir);
      const answer = byId.get(pick(valid, rng))!;
      // Every right answer, and anything transitively also right, is off the table,
      // as is every other neighbour or prose mention of the term.
      const exclude = new Set([id, ...around, ...valid]);
      if (TRANSITIVE.has(e.type)) for (const c of closure(id, e.type, dir)) exclude.add(c);
      if (e.type === 'requires') {
        for (const p of prerequisitesOf(graph, id)) exclude.add(p.id);
        for (const d of closure(id, 'requires', 'in')) exclude.add(d);
      }
      const wrong = distractors(answer, exclude, { type: e.type, dir });
      qs.push(multiple(id, 'relation', ask[lang](name(t)), answer, wrong));
    }
    return qs.filter((q): q is Question => q !== null);
  };

  /** Three neighbours and one term from the same area with no connection to `id`. */
  const oddOneOut = (id: string): Question | null => {
    const t = byId.get(id)!;
    const near = [...neighbours(id)];
    if (near.length < 3) return null;
    const shown = shuffle(near, rng).slice(0, 3);
    // Two steps away still reads as "related"; so does a term named in the other's prose.
    const twoSteps = near.flatMap((n) => [...neighbours(n)]);
    const exclude = new Set([id, ...near, ...twoSteps, ...mentioned(id)]);
    const [odd] = distractors(t, exclude).filter((n) => !mentioned(n.id).includes(id));
    if (!odd) return null;
    return {
      termId: id,
      kind: 'odd-one-out',
      prompt: T.odd[lang](name(t)),
      answer: odd.id,
      link: odd.id,
      options: shuffle([odd.id, ...shown], rng).map((x) => ({ id: x, label: name(byId.get(x)!) })),
    };
  };

  /** A relationship statement, true as authored or false by reversing its direction. */
  const trueFalse = (id: string): Question | null => {
    // Skip a pair joined both ways by the same type: its reverse would not be false.
    const usable = edgesOf(id).filter(
      (e) =>
        STATE[e.type] &&
        !edgesOf(id).some((f) => f.type === e.type && f.other === e.other && f.dir !== e.dir),
    );
    if (!usable.length) return null;
    const e = pick(usable, rng);
    const [from, to] = e.dir === 'out' ? [id, e.other] : [e.other, id];
    const truth = rng() < 0.5;
    const [a, b] = truth ? [from, to] : [to, from];
    const statement = STATE[e.type]![lang](name(byId.get(a)!), name(byId.get(b)!));
    return {
      termId: id,
      kind: 'true-false',
      prompt: T.trueFalse[lang](statement),
      answer: truth ? 'true' : 'false',
      link: id,
      options: [
        { id: 'true', label: T.true[lang] },
        { id: 'false', label: T.false[lang] },
      ],
    };
  };

  /** Every question about `id` whose answer is some other term (or true/false). */
  const questionsAbout = (id: string): Question[] => {
    if (!byId.has(id)) return [];
    return [...relationsOf(id), oddOneOut(id), trueFalse(id)].filter(
      (q): q is Question => q !== null,
    );
  };

  /** Every question a session may ask to practise `id` — both families. */
  const questionsFor = (id: string): Question[] => {
    if (!byId.has(id)) return [];
    return [definitionOf(id), meaningOf(id), ...questionsAbout(id)].filter(
      (q): q is Question => q !== null,
    );
  };

  /**
   * "Check yourself" on the page of `id`: questions about it, plus definition
   * questions whose answers are its neighbours. Never one answered by `id` itself,
   * never `id` among the options, and never its own summary as a stem or option.
   */
  const pageQuestions = (id: string, count = 3): Question[] => {
    const t = byId.get(id);
    if (!t) return [];
    const self = new Set([id]);
    const near = shuffle([...neighbours(id)], rng).slice(0, 6);
    const theirs = near.flatMap((n) => [definitionOf(n, self), meaningOf(n, self)]);
    const all = [...questionsAbout(id), ...theirs].filter(
      (q): q is Question =>
        q !== null &&
        q.answer !== id &&
        q.options.every((o) => o.id !== id && (!t.summary || o.label !== t.summary[lang])) &&
        (!t.summary || !q.prompt.includes(t.summary[lang])),
    );
    return varied(all, count, rng);
  };

  return {
    questionsAbout,
    questionsFor,
    pageQuestions,
    shuffle: <T>(xs: T[]) => shuffle(xs, rng),
    pick: <T>(xs: T[]) => pick(xs, rng),
  };
}

export type Quizzer = ReturnType<typeof makeQuizzer>;

/** What a study session draws from: everything, one domain, one cluster, or weak terms. */
export type Scope = 'all' | 'weak' | `domain:${string}` | `cluster:${string}`;

export function inScope(n: GraphNode, scope: Scope, learner: Learner): boolean {
  if (scope === 'all') return true;
  if (scope === 'weak') return isWeak(learner.terms[n.id]);
  if (scope.startsWith('domain:')) return n.domain.includes(scope.slice(7));
  if (scope.startsWith('cluster:')) return n.cluster === scope.slice(8);
  return false;
}

/**
 * A study session: due reviews first, then terms never practised, then the rest;
 * one question per term, rotating question kinds so the session mixes
 * definition → term, term → definition, relationships, odd-one-out and true/false.
 */
export function buildSession(
  graph: Graph,
  learner: Learner,
  scope: Scope,
  quizzer: Quizzer,
  count = 10,
  now = Date.now(),
): Question[] {
  const pool = graph.nodes.filter((n) => inScope(n, scope, learner));
  const due = pool.filter((n) => isDue(learner.terms[n.id], now));
  const fresh = pool.filter((n) => !learner.terms[n.id]?.box);
  const rest = pool.filter((n) => !due.includes(n) && !fresh.includes(n));
  const order = [...quizzer.shuffle(due), ...quizzer.shuffle(fresh), ...quizzer.shuffle(rest)];
  const used = new Map<QuestionKind, number>();
  const qs: Question[] = [];
  for (const n of order) {
    const options = quizzer.questionsFor(n.id);
    if (!options.length) continue;
    const least = Math.min(...options.map((q) => used.get(q.kind) ?? 0));
    const q = quizzer.pick(options.filter((o) => (used.get(o.kind) ?? 0) === least));
    used.set(q.kind, (used.get(q.kind) ?? 0) + 1);
    qs.push(q);
    if (qs.length >= count) break;
  }
  return qs;
}
