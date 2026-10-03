import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { QuestionFile, TermData } from './schema';

// schema.ts is authored against zod 3; Astro 7 types collections with its bundled zod 4.
// Same runtime schema, typed at the boundary so entries keep their inferred data type.
const termSchema = TermData as unknown as z.ZodType<TermData>;
const questionSchema = QuestionFile as unknown as z.ZodType<QuestionFile>;

// Terms are authored as bilingual YAML data files under src/content/terms/<domain>/.
// The glob loader derives each entry's `id` from its path (e.g. "security/phishing").
const terms = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/terms' }),
  schema: termSchema,
});

// Optional long-form Articles (ADR-0004: exempt from Closed Vocabulary).
// One Markdown file per term and language: src/content/articles/<domain>/<id>.<lang>.md
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    term: z.string(),
    lang: z.enum(['en', 'da']),
  }),
});

// The hand-written question bank (A90): src/content/questions/<domain>/<cluster>.yaml,
// each file a `questions:` list. Entry id = "<domain>/<cluster>".
const questions = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/questions' }),
  schema: questionSchema,
});

export const collections = { terms, articles, questions };
