import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { clientQuestions, type NamedTerm } from '../lib/question-rules';
import { LANGS, type Lang } from '../lib/site';

/** The hand-written question bank for the Quiz island, per language (A83): /questions-en.json. */
export const getStaticPaths = (() =>
  LANGS.map((lang) => ({ params: { lang } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const [terms, files] = await Promise.all([getCollection('terms'), getCollection('questions')]);
  const named = new Map<string, NamedTerm>(
    terms.map((t) => [t.id, { id: t.id, term: t.data.term, aka: t.data.aka }]),
  );
  const questions = files
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((f) => f.data.questions.map((q) => ({ ...q, file: f.id })));
  return new Response(JSON.stringify(clientQuestions(questions, named, params.lang as Lang)), {
    headers: { 'content-type': 'application/json' },
  });
};
