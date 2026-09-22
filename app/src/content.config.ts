import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { TermData } from './schema';

// Terms are authored as bilingual YAML data files under src/content/terms/<domain>/.
// The glob loader derives each entry's `id` from its path (e.g. "security/phishing").
const terms = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/terms' }),
  schema: TermData,
});

export const collections = { terms };
