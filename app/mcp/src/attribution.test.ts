import { describe, expect, it } from 'vitest';
import { connect, ok } from '../test/client';

const LINE = 'Atlas, a bilingual technical dictionary, https://atlas.maintz.dev/ (CC BY-SA 4.0)';

const CALLS: [string, Record<string, unknown>][] = [
  ['lookup_term', { term: 'tls' }],
  ['search_terms', { query: 'tls' }],
  ['semantic_search', { query: 'secret data' }],
  ['translate_term', { term: 'Encryption', from: 'en' }],
  ['related_terms', { term: 'cs/tls' }],
  ['quiz_question', {}],
];

describe('licence attribution', () => {
  it('covers every tool the server lists', async () => {
    const client = await connect();
    const listed = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(listed).toEqual(CALLS.map(([name]) => name).sort());
  });

  it.each(CALLS)('%s carries the CC BY-SA attribution line', async (name, args) => {
    const client = await connect({
      options: { fetch: async () => Response.json({ hits: [{ id: 'cs/tls', score: 0.5 }] }) },
    });
    expect((await ok(client, name, args)).attribution).toBe(LINE);
  });

  it('says the content is CC BY-SA 4.0 in every tool description', async () => {
    const client = await connect();
    for (const tool of (await client.listTools()).tools)
      expect(tool.description, tool.name).toContain('CC BY-SA 4.0');
  });

  it('marks every tool read-only and closed-world', async () => {
    const client = await connect();
    for (const tool of (await client.listTools()).tools)
      expect(tool.annotations, tool.name).toMatchObject({
        readOnlyHint: true,
        openWorldHint: false,
      });
  });

  it('puts the attribution in a term resource', async () => {
    const client = await connect();
    const read = await client.readResource({ uri: 'atlas://terms/security/encryption' });
    const json = JSON.parse((read.contents[0] as { text: string }).text);
    expect(json).toMatchObject({ id: 'security/encryption', attribution: LINE });
  });
});

describe('resources and prompts', () => {
  it('lists every term as a resource under the template', async () => {
    const client = await connect();
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain('atlas://terms/ai/accuracy');
    expect(resources).toHaveLength(8);
  });

  it('builds the explain-like-atlas prompt around the resolved term', async () => {
    const client = await connect();
    const prompt = await client.getPrompt({
      name: 'explain-like-atlas',
      arguments: { term: 'kryptering', level: 'beginner' },
    });
    const text = JSON.stringify(prompt.messages);
    expect(text).toContain('security/encryption');
    expect(text).toContain('related_terms');
  });
});
