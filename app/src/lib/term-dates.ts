import { execFileSync } from 'node:child_process';
import { parseAddLog } from './feed';

let cache: Map<string, string> | undefined;

const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const ADD_LOG = [
  'log',
  '--no-renames',
  '--diff-filter=A',
  '--name-only',
  '--format=@%aI',
  '--',
  'src/content/terms',
];

export function termAddedDates(): Map<string, string> {
  if (cache) return cache;
  try {
    if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
      console.warn('[feed] shallow clone: term dates unknown, feeds left empty (fetch-depth 0)');
      return (cache = new Map());
    }
    cache = parseAddLog(git(ADD_LOG));
  } catch {
    console.warn('[feed] git history unavailable: feeds left empty');
    cache = new Map();
  }
  return cache;
}
