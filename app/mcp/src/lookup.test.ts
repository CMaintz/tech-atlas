import { describe, expect, it } from 'vitest';
import { call, connect, ok } from '../test/client';

describe('lookup_term', () => {
  it('finds a term by its Danish name', async () => {
    const client = await connect();
    const out = await ok(client, 'lookup_term', { term: 'kryptering' });
    expect((out.term as { id: string }).id).toBe('security/encryption');
  });

  it('finds a Danish name written with an English gloss in parentheses', async () => {
    const client = await connect();
    const out = await ok(client, 'lookup_term', { term: 'Nøjagtighed' });
    expect((out.term as { id: string }).id).toBe('ai/accuracy');
  });

  it('resolves a bare id and keeps the both-language names, body and sources', async () => {
    const client = await connect();
    const out = await ok(client, 'lookup_term', { term: 'tls' });
    expect(out.term).toMatchObject({
      id: 'cs/tls',
      name: { en: 'TLS', da: 'TLS' },
      body: { plain: { en: 'TLS in plain words.' } },
      sources: [{ title: 'TLS source' }],
      url: { en: 'https://atlas.maintz.dev/en/terms/cs/tls/' },
    });
  });

  it('prefers a whole name over one split from a parenthesis, and lists the other', async () => {
    const client = await connect();
    const en = await ok(client, 'lookup_term', { term: 'model' });
    expect((en.term as { id: string }).id).toBe('ai/model');
    expect(en.alsoMatches).toContain('cs/model');
  });

  it('reports an unknown term as a tool error with suggestions, not a crash', async () => {
    const client = await connect();
    const result = await call(client, 'lookup_term', { term: 'encryptoin' });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain('security/encryption');
  });
});

describe('translate_term', () => {
  it('gives the other language and its near alternatives', async () => {
    const client = await connect();
    const out = await ok(client, 'translate_term', { term: 'Encryption', from: 'en' });
    expect(out).toMatchObject({ id: 'security/encryption', translation: 'Kryptering' });
    expect(out.alternatives).toEqual(['kryptografering']);
  });

  it('accepts an Atlas id as well as a name', async () => {
    const client = await connect();
    const out = await ok(client, 'translate_term', { term: 'security/encryption', from: 'en' });
    expect(out).toMatchObject({ translation: 'Kryptering' });
  });

  it('translates Danish to English', async () => {
    const client = await connect();
    const out = await ok(client, 'translate_term', { term: 'træfsikkerhed', from: 'da' });
    expect(out).toMatchObject({ id: 'ai/accuracy', translation: 'Accuracy' });
  });
});
