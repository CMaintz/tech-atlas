/**
 * Size rules (pure; `size-check.ts` walks the files): every function stays at or
 * under MAX_FUNCTION_LINES logical lines and every code file at or under
 * MAX_FILE_LINES lines.
 *
 * "Logical lines" = non-blank, non-comment lines of the whole function, signature
 * to closing brace. A nested function's interior counts toward the nested function,
 * not its parent (the parent keeps the lines that open and close it). Test-framework blocks
 * (`describe`, `it`, `beforeEach`…) are grouping, not functions, and are not
 * measured themselves; functions inside them are. Astro files contribute their
 * frontmatter and inline <script> blocks as TypeScript; the whole .astro file
 * counts toward the file limit.
 */
import ts from 'typescript';

export const MAX_FUNCTION_LINES = 18;
export const MAX_FILE_LINES = 300;

export interface FunctionSize {
  file: string;
  name: string;
  line: number;
  lines: number;
}

export interface FileSize {
  file: string;
  lines: number;
}

interface Segment {
  code: string;
  lineOffset: number;
}

const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

/** Test-framework blocks are grouping, not functions — `describe(..., () => {})`. */
const TEST_BLOCKS = new Set([
  'describe',
  'it',
  'test',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
]);

/** Line numbers (0-based) that hold code, not just whitespace or comments. */
export function codeLines(code: string): Set<number> {
  const lines = new Set<number>();
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, code);
  const lineOf = lineIndex(code);
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (isTrivia(kind)) continue;
    const start = lineOf(scanner.getTokenStart());
    const end = lineOf(scanner.getTokenEnd() - 1);
    for (let l = start; l <= end; l++) lines.add(l);
  }
  return lines;
}

function isTrivia(kind: ts.SyntaxKind): boolean {
  return (
    kind === ts.SyntaxKind.WhitespaceTrivia ||
    kind === ts.SyntaxKind.NewLineTrivia ||
    kind === ts.SyntaxKind.SingleLineCommentTrivia ||
    kind === ts.SyntaxKind.MultiLineCommentTrivia
  );
}

function lineIndex(code: string): (pos: number) => number {
  const starts = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') starts.push(i + 1);
  return (pos) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
}

function functionName(node: ts.Node): string {
  const named = node as ts.Node & { name?: ts.Node };
  if (named.name && ts.isIdentifier(named.name)) return named.name.text;
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  const parent = node.parent;
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (ts.isPropertyAssignment(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (ts.isCallExpression(parent))
    return `<callback of ${parent.expression.getText().slice(0, 40)}>`;
  return '<anonymous>';
}

function isTestBlock(node: ts.Node): boolean {
  const parent = node.parent;
  if (!ts.isCallExpression(parent)) return false;
  const callee = parent.expression;
  const base = ts.isPropertyAccessExpression(callee) ? callee.expression : callee;
  return ts.isIdentifier(base) && TEST_BLOCKS.has(base.text);
}

/** Measure every function in one TypeScript segment. */
export function measureCode(code: string, file: string, lineOffset = 0): FunctionSize[] {
  const kind =
    file.endsWith('.tsx') || file.endsWith('.astro') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
  const lines = codeLines(code);
  const out: FunctionSize[] = [];
  const visit = (node: ts.Node): void => {
    if (FUNCTION_KINDS.has(node.kind) && !isTestBlock(node))
      out.push(measureOne(node, source, lines, file, lineOffset));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

function span(node: ts.Node, source: ts.SourceFile): [number, number] {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
  const end = source.getLineAndCharacterOfPosition(node.getEnd()).line;
  return [start, end];
}

function measureOne(
  node: ts.Node,
  source: ts.SourceFile,
  lines: Set<number>,
  file: string,
  lineOffset: number,
): FunctionSize {
  const [start, end] = span(node, source);
  const owned = new Set<number>();
  for (let l = start; l <= end; l++) if (lines.has(l)) owned.add(l);
  for (const inner of nestedFunctions(node)) {
    const [s, e] = span(inner, source);
    for (let l = s + 1; l < e; l++) owned.delete(l);
  }
  return { file, name: functionName(node), line: start + 1 + lineOffset, lines: owned.size };
}

function nestedFunctions(node: ts.Node): ts.Node[] {
  const found: ts.Node[] = [];
  const visit = (child: ts.Node): void => {
    if (FUNCTION_KINDS.has(child.kind)) found.push(child);
    else ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

/** The TypeScript inside an .astro file: frontmatter plus inline <script> blocks. */
export function astroSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (front) segments.push({ code: front[1], lineOffset: 1 });
  const script = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
  for (let m = script.exec(text); m; m = script.exec(text)) {
    if (/type=["']application\/(ld\+)?json["']/.test(m[0])) continue;
    const bodyStart = m.index + m[0].indexOf('>') + 1;
    segments.push({ code: m[1], lineOffset: text.slice(0, bodyStart).split('\n').length - 1 });
  }
  return segments;
}

/** Line count of a file's text (a trailing newline does not start another line). */
export const fileLines = (text: string): number =>
  text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

/** Every function in one file's text (an .astro file by its TypeScript segments). */
export function measureText(text: string, file: string): FunctionSize[] {
  const segments = file.endsWith('.astro') ? astroSegments(text) : [{ code: text, lineOffset: 0 }];
  return segments.flatMap((s) => measureCode(s.code, file, s.lineOffset));
}

/** The items over `max` lines, largest first. */
export const oversized = <T extends { lines: number }>(items: T[], max: number): T[] =>
  items.filter((i) => i.lines > max).sort((a, b) => b.lines - a.lines);
