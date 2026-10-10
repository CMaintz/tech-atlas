import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { QuestionFile, TermData } from './schema';

const termSchema = TermData as unknown as z.ZodType<TermData>;
const questionSchema = QuestionFile as unknown as z.ZodType<QuestionFile>;

const terms = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/terms' }),
  schema: termSchema,
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    term: z.string(),
    lang: z.enum(['en', 'da']),
  }),
});

const questions = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/questions' }),
  schema: questionSchema,
});

export const collections = { terms, articles, questions };
