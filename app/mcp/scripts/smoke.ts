import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ATTRIBUTION } from '../src/attribution';

function check(ok: boolean, what: string): void {
  if (!ok) throw new Error(`smoke: ${what}`);
  console.log(`smoke: ok - ${what}`);
}

async function main(url: string): Promise<void> {
  const client = new Client({ name: 'atlas-smoke', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  const { tools } = await client.listTools();
  check(tools.length === 6, `${tools.length} tools listed`);
  const result = await client.callTool({ name: 'lookup_term', arguments: { term: 'kryptering' } });
  const out = result.structuredContent as { term?: { id: string }; attribution?: string };
  check(out.term?.id === 'cs/encryption', 'lookup_term resolves a Danish name');
  check(out.attribution === ATTRIBUTION, 'the result carries the licence attribution');
  await client.close();
}

const url = process.argv[2];
if (!url) throw new Error('usage: smoke.ts <mcp endpoint url>');
await main(url);
