import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO } from './site';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
  version: string;
};

export const VERSION = `v${pkg.version}`;

export const CHANGELOG_URL = `${REPO}/blob/main/CHANGELOG.md`;
