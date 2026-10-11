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

interface Measuring {
  source: ts.SourceFile;
  lines: Set<number>;
  file: string;
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

const TEST_BLOCKS = new Set([
  'describe',
  'it',
  'test',
  'beforeEach',
  'afterEach',
  'beforeAll',
  'afterAll',
]);

export function codeLines(source: ts.SourceFile): Set<number> {
  const lines = new Set<number>();
  const lineOf = (pos: number) => source.getLineAndCharacterOfPosition(pos).line;
  const visit = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.EndOfFileToken || isJSDoc(node)) return;
    const children = node.getChildren(source);
    if (children.length) return children.forEach(visit);
    if (ts.isJsxText(node)) return markJsxText(node, source, lines);
    const start = node.getStart(source);
    if (node.end > start) for (let l = lineOf(start); l <= lineOf(node.end - 1); l++) lines.add(l);
  };
  visit(source);
  return lines;
}

const isJSDoc = (node: ts.Node): boolean =>
  node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode;

function markJsxText(node: ts.JsxText, source: ts.SourceFile, lines: Set<number>): void {
  const first = source.getLineAndCharacterOfPosition(node.pos).line;
  node.text.split('\n').forEach((line, i) => {
    if (line.trim()) lines.add(first + i);
  });
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

export function measureCode(code: string, file: string, lineOffset = 0): FunctionSize[] {
  const kind =
    file.endsWith('.tsx') || file.endsWith('.astro') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
  const measuring: Measuring = { source, lines: codeLines(source), file, lineOffset };
  const out: FunctionSize[] = [];
  const visit = (node: ts.Node): void => {
    if (FUNCTION_KINDS.has(node.kind) && !isTestBlock(node)) out.push(measureOne(node, measuring));
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

function measureOne(node: ts.Node, measuring: Measuring): FunctionSize {
  const { source, lines, file, lineOffset } = measuring;
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

export const fileLines = (text: string): number =>
  text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

export function measureText(text: string, file: string): FunctionSize[] {
  const segments = file.endsWith('.astro') ? astroSegments(text) : [{ code: text, lineOffset: 0 }];
  return segments.flatMap((s) => measureCode(s.code, file, s.lineOffset));
}

export const oversized = <T extends { lines: number }>(items: T[], max: number): T[] =>
  items.filter((i) => i.lines > max).sort((a, b) => b.lines - a.lines);
