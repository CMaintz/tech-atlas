import { describe, expect, it } from 'vitest';
import { call, connect, ok } from '../test/client';

type Neighbour = { id: string; relation: string; direction: string; hop: number; via: string };
const neighbours = (out: Record<string, unknown>) => out.neighbours as Neighbour[];

describe('related_terms', () => {
  it('includes inverse edges, named from the asked term', async () => {
    const client = await connect();
    const out = await ok(client, 'related_terms', { term: 'security/encryption' });
    expect(neighbours(out)).toContainEqual(
      expect.objectContaining({ id: 'cs/tls', relation: 'unlocks', direction: 'in' }),
    );
  });

  it('names an outgoing edge by its authored type', async () => {
    const client = await connect();
    const out = await ok(client, 'related_terms', { term: 'cs/tls' });
    expect(neighbours(out)).toContainEqual(
      expect.objectContaining({
        id: 'security/encryption',
        relation: 'requires',
        direction: 'out',
      }),
    );
  });

  it('walks a second hop only when asked', async () => {
    const client = await connect();
    const one = neighbours(await ok(client, 'related_terms', { term: 'cs/tls' }));
    const two = neighbours(await ok(client, 'related_terms', { term: 'cs/tls', depth: 2 }));
    expect(one.map((n) => n.id)).not.toContain('security/pki');
    expect(two).toContainEqual(
      expect.objectContaining({ id: 'security/pki', hop: 2, via: 'security/digital-certificate' }),
    );
    expect(two.filter((n) => n.id === 'cs/tls')).toEqual([]);
  });

  it('filters by edge type, matching inverse names too', async () => {
    const client = await connect();
    const out = await ok(client, 'related_terms', {
      term: 'security/pki',
      edge_types: ['has-part'],
    });
    expect(neighbours(out).map((n) => n.id)).toEqual(['security/digital-certificate']);
  });

  it('refuses a depth over 2', async () => {
    const client = await connect();
    const result = await call(client, 'related_terms', { term: 'cs/tls', depth: 3 });
    expect(result.isError).toBe(true);
  });
});

describe('quiz_question', () => {
  it('honours the kind and keeps the answer out of the question', async () => {
    const client = await connect({ options: { random: () => 0 } });
    const out = await ok(client, 'quiz_question', { kind: 'concept' });
    const question = out.question as Record<string, unknown>;
    expect(question).toMatchObject({ id: 'q-accuracy-concept', kind: 'concept' });
    expect(question).not.toHaveProperty('answer');
    expect(question).not.toHaveProperty('explanation');
    expect(out.answer).toMatchObject({ index: 1, option: 'Accuracy' });
  });

  it('filters by the domain of the terms a question tests', async () => {
    const client = await connect({ options: { random: () => 0 } });
    const out = await ok(client, 'quiz_question', { domain: 'cs', lang: 'da' });
    expect(out.question).toMatchObject({ id: 'q-tls-order', stem: expect.stringContaining('TLS') });
  });

  it('says so when no question matches', async () => {
    const client = await connect();
    const result = await call(client, 'quiz_question', { domain: 'platform' });
    expect(result.isError).toBe(true);
  });
});
