import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ATTRIBUTION, LICENCE_NOTE } from './attribution';

export const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

export const langSchema = z.enum(['en', 'da']);

export const withLicence = (description: string) => `${description} ${LICENCE_NOTE}`;

export const ATTRIBUTED = { attribution: z.string().describe('Credit line for quoting Atlas') };

export function reply(data: Record<string, unknown>): CallToolResult {
  const structuredContent = { ...data, attribution: ATTRIBUTION };
  return {
    structuredContent,
    content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
  };
}

export function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}
