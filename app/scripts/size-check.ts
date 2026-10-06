/**
 * The size gate (`npm run lint:size`): fails when any function is over
 * MAX_FUNCTION_LINES logical lines or any code file over MAX_FILE_LINES lines.
 * How lines are counted: size-rules.ts.
 *
 * Usage: tsx scripts/size-check.ts [--top N] [--byfile]
 *   --top N    list only the N largest offenders of each kind
 *   --byfile   also print how many long functions each file has
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'tinyglobby';
import {
  fileLines,
  MAX_FILE_LINES,
  MAX_FUNCTION_LINES,
  measureText,
  oversized,
  type FileSize,
  type FunctionSize,
} from './size-rules';

const REPO = resolve(import.meta.dirname, '..', '..');

/**
 * What is scanned: the code that ships or gates the site. Not scanned: content
 * (YAML/Markdown), JSON data, lockfiles, generated output, and the archival design
 * sketches `design/schema.ts` and `techlexicon/schema.ts`.
 */
const INCLUDE = [
  'app/src/**/*.{ts,tsx,astro,mjs}',
  'app/scripts/**/*.{ts,mjs}',
  'app/integrations/**/*.{ts,mjs}',
  'app/astro.config.mjs',
  'supabase/functions/**/*.ts',
];
const EXCLUDE = ['**/node_modules/**', '**/*.d.ts'];

interface Scan {
  functions: FunctionSize[];
  files: FileSize[];
}

function scan(): Scan {
  const result: Scan = { functions: [], files: [] };
  for (const file of globSync(INCLUDE, { cwd: REPO, ignore: EXCLUDE }).sort()) {
    const text = readFileSync(resolve(REPO, file), 'utf8');
    result.functions.push(...measureText(text, file));
    result.files.push({ file, lines: fileLines(text) });
  }
  return result;
}

function printByFile(longFns: FunctionSize[]): void {
  const counts = new Map<string, number>();
  for (const f of longFns) counts.set(f.file, (counts.get(f.file) ?? 0) + 1);
  for (const [file, n] of [...counts].sort((a, b) => b[1] - a[1]))
    console.log(`${String(n).padStart(4)} ${file}`);
}

function main(args: string[]): void {
  const topAt = args.indexOf('--top');
  const top = topAt >= 0 ? Number(args[topAt + 1]) : Infinity;
  const { functions, files } = scan();
  const longFns = oversized(functions, MAX_FUNCTION_LINES);
  const bigFiles = oversized(files, MAX_FILE_LINES);
  for (const f of bigFiles.slice(0, top))
    console.log(`${f.file}: ${f.lines} lines (max ${MAX_FILE_LINES})`);
  for (const f of longFns.slice(0, top))
    console.log(`${f.file}:${f.line} ${f.name}: ${f.lines} lines (max ${MAX_FUNCTION_LINES})`);
  console.log(
    `size-check: ${functions.length} functions in ${files.length} files; ` +
      `${longFns.length} functions > ${MAX_FUNCTION_LINES} lines, ${bigFiles.length} files > ${MAX_FILE_LINES} lines`,
  );
  if (args.includes('--byfile')) printByFile(longFns);
  if (longFns.length || bigFiles.length) process.exitCode = 1;
}

main(process.argv.slice(2));
