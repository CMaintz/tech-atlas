/**
 * When each Term was added, from git history (A71). Build-time only (Node).
 *
 * Needs full history: in a shallow clone every file would date to the clone's
 * boundary commit, so a shallow repo (or no git at all) yields no dates, a warning,
 * and a feed without items rather than a wrong one. CI checks out with fetch-depth 0.
 * `--no-renames` keeps the log to real adds: a moved file shows as delete + add, and
 * the oldest add of the current path wins.
 */
import { execFileSync } from 'node:child_process';
import { parseAddLog } from './feed';

let cache: Map<string, string> | undefined;

const git = (args: string[]) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

export function termAddedDates(): Map<string, string> {
  if (cache) return cache;
  try {
    if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
      console.warn('[feed] shallow clone: term dates unknown, feeds left empty (fetch-depth 0)');
      return (cache = new Map());
    }
    cache = parseAddLog(
      git([
        'log',
        '--no-renames',
        '--diff-filter=A',
        '--name-only',
        '--format=@%aI',
        '--',
        'src/content/terms',
      ]),
    );
  } catch {
    console.warn('[feed] git history unavailable: feeds left empty');
    cache = new Map();
  }
  return cache;
}
