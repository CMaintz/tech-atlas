import { describe, expect, it } from 'vitest';
import {
  parseLearner,
  recordAnswer,
  setStatus,
  type Learner,
  type Status,
  type TermState,
} from './learner';
import { mergeLearner, sameLearner } from './sync';

const DAY = 24 * 60 * 60 * 1000;
const empty: Learner = { terms: {} };

describe('parseLearner', () => {
  it('drops malformed input instead of trusting it', () => {
    expect(parseLearner(null)).toEqual(empty);
    expect(parseLearner({ terms: 'x' })).toEqual(empty);
    expect(parseLearner({ terms: { t: { box: 'x', status: 'nope' }, u: null } })).toEqual({
      terms: { t: { box: 0, due: 0, right: 0, wrong: 0 } },
    });
  });
});

describe('timestamps', () => {
  it('records when a term was answered and when its status changed', () => {
    const l = setStatus(
      recordAnswer(empty, { id: 't', correct: true }, 10),
      { id: 't', status: 'know' },
      20,
    );
    expect(l.terms.t.reviewed).toBe(10);
    expect(l.terms.t.statusAt).toBe(20);
  });

  it('records clearing a status', () => {
    const l = setStatus(
      setStatus(empty, { id: 't', status: 'know' }, 1),
      { id: 't', status: undefined },
      2,
    );
    expect(l.terms.t.status).toBeUndefined();
    expect(l.terms.t.statusAt).toBe(2);
  });
});

describe('mergeLearner', () => {
  const laptop = setStatus(
    recordAnswer(empty, { id: 'a', correct: true }, 0),
    { id: 'b', status: 'learning' },
    5,
  );
  const phone = recordAnswer(
    recordAnswer(empty, { id: 'a', correct: true }, 0),
    { id: 'a', correct: true },
    DAY,
  );

  it('keeps terms from both sides', () => {
    const other: Learner = { terms: { c: phone.terms.a } };
    expect(Object.keys(mergeLearner(laptop, other).terms)).toEqual(['a', 'b', 'c']);
  });

  it('takes the schedule from the most recent answer, even when it demotes', () => {
    expect(mergeLearner(laptop, phone).terms.a.box).toBe(2);
    const wrongLater = recordAnswer(phone, { id: 'a', correct: false }, 2 * DAY);
    const m = mergeLearner(wrongLater, phone);
    expect(m.terms.a.box).toBe(1);
    expect(m.terms.a.due).toBe(3 * DAY);
    expect(m.terms.a.wrong).toBe(1);
  });

  it('prefers the higher box when answers carry no timestamps', () => {
    const a = parseLearner({ terms: { t: { box: 3, due: 9, right: 3, wrong: 0 } } });
    const b = parseLearner({ terms: { t: { box: 1, due: 1, right: 1, wrong: 2 } } });
    expect(mergeLearner(a, b).terms.t).toEqual({ box: 3, due: 9, right: 3, wrong: 2 });
  });

  it('takes the most recent status change, including a clear', () => {
    const set = setStatus(empty, { id: 't', status: 'know' }, 1);
    const cleared = setStatus(set, { id: 't', status: undefined }, 2);
    expect(mergeLearner(set, cleared).terms.t.status).toBeUndefined();
    const relearn = setStatus(cleared, { id: 't', status: 'learning' }, 3);
    expect(mergeLearner(cleared, relearn).terms.t.status).toBe('learning');
  });

  it('lets any timestamped status change beat an untimestamped one', () => {
    const old = parseLearner({
      terms: { t: { box: 0, due: 0, right: 0, wrong: 0, status: 'know' } },
    });
    const now = setStatus(empty, { id: 't', status: 'unknown' }, 1);
    expect(mergeLearner(old, now).terms.t.status).toBe('unknown');
  });

  it('is commutative and idempotent', () => {
    const tie: Learner = { terms: { a: { ...phone.terms.a, reviewed: laptop.terms.a.reviewed } } };
    const pairs: [Learner, Learner][] = [
      [laptop, phone],
      [laptop, tie],
      [
        setStatus(empty, { id: 't', status: 'know' }, 1),
        setStatus(empty, { id: 't', status: 'unknown' }, 1),
      ],
    ];
    for (const [x, y] of pairs) {
      const m = mergeLearner(x, y);
      expect(mergeLearner(y, x)).toEqual(m);
      expect(mergeLearner(m, m)).toEqual(m);
      expect(mergeLearner(m, x)).toEqual(m);
    }
  });

  it('lets a local change after merging a future-stamped remote win', () => {
    const now = 1_000_000;
    // The other device's clock runs an hour fast.
    const remote = parseLearner(
      setStatus(empty, { id: 't', status: 'know' }, now + 3_600_000),
      now,
    );
    const local = setStatus(mergeLearner(empty, remote), { id: 't', status: 'learning' }, now);
    expect(mergeLearner(local, remote).terms.t.status).toBe('learning');
    const answeredAhead = parseLearner(
      recordAnswer(empty, { id: 't', correct: false }, now + 3_600_000),
      now,
    );
    const answered = recordAnswer(
      mergeLearner(empty, answeredAhead),
      { id: 't', correct: true },
      now,
    );
    expect(mergeLearner(answered, answeredAhead).terms.t.right).toBe(1);
    expect(mergeLearner(answered, answeredAhead).terms.t.reviewed).toBe(now + 3_600_001);
  });

  it('pulls timestamps more than a day ahead back to now', () => {
    const now = 1_000_000;
    const broken = setStatus(
      recordAnswer(empty, { id: 't', correct: true }, now + 10 * DAY),
      { id: 't', status: 'know' },
      now + 10 * DAY,
    );
    const parsed = parseLearner(broken, now);
    expect(parsed.terms.t.reviewed).toBe(now);
    expect(parsed.terms.t.statusAt).toBe(now);
    const later = setStatus(mergeLearner(empty, parsed), { id: 't', status: 'unknown' }, now + 1);
    expect(mergeLearner(later, parsed).terms.t.status).toBe('unknown');
  });

  it('compares states regardless of key order', () => {
    const ab = mergeLearner(laptop, phone);
    const reversed: Learner = { terms: Object.fromEntries(Object.entries(ab.terms).reverse()) };
    expect(sameLearner(ab, reversed)).toBe(true);
    expect(sameLearner(ab, laptop)).toBe(false);
  });
});

/** One term, merged from two devices. */
const mergedTerm = (a: TermState, b: TermState) =>
  mergeLearner({ terms: { t: a } }, { terms: { t: b } }).terms.t;

describe('merging the review schedule', () => {
  const t = (box: number, due: number, reviewed?: number): TermState => ({
    box,
    due,
    right: 0,
    wrong: 0,
    reviewed,
  });

  it('takes the most recent answer, even with a lower box', () => {
    expect(mergedTerm(t(4, 9, 10), t(0, 1, 20))).toMatchObject({ box: 0, due: 1 });
  });

  it('breaks a timestamp tie on the higher box, then the later due date', () => {
    expect(mergedTerm(t(2, 9), t(3, 1))).toMatchObject({ box: 3, due: 1 });
    expect(mergedTerm(t(2, 5), t(2, 9))).toMatchObject({ box: 2, due: 9 });
  });
});

describe('merging the status', () => {
  const t = (status?: Status, statusAt?: number): TermState => ({
    box: 0,
    due: 0,
    right: 0,
    wrong: 0,
    status,
    statusAt,
  });

  it('takes the most recent change, including a clear', () => {
    expect(mergedTerm(t('know', 10), t(undefined, 20)).status).toBeUndefined();
  });

  it('lets any status beat none on a timestamp tie', () => {
    expect(mergedTerm(t(), t('learning')).status).toBe('learning');
  });
});
