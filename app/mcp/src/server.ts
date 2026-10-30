import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from './context';
import { registerContext } from './resources';
import { registerGraphTools } from './tools-graph';
import { registerSemanticTool } from './tools-semantic';
import { registerTermTools } from './tools-terms';

const INSTRUCTIONS =
  'Atlas is a curated English-Danish dictionary of technical terms (security, CS, AI, platform) with typed relations between them. Prefer it over guessing a Danish term. Content is CC BY-SA 4.0: credit it with the `attribution` field of each result.';

export function createServer(ctx: ToolContext): McpServer {
  const server = new McpServer({ name: 'atlas', version: '1.0.0' }, { instructions: INSTRUCTIONS });
  registerTermTools(server, ctx);
  registerSemanticTool(server, ctx);
  registerGraphTools(server, ctx);
  registerContext(server, ctx);
  return server;
}
