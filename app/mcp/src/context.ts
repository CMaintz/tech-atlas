import type { Atlas } from './atlas';

interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type Env = {
  MCP_LIMITER: RateLimit;
  SEMANTIC_LIMITER: RateLimit;
  SEMANTIC_GLOBAL_LIMITER: RateLimit;
  SEMANTIC_SEARCH_URL?: string;
};

export type ToolContext = {
  atlas: Atlas;
  env: Env;
  ip: string;
  fetch: typeof fetch;
  random: () => number;
};
