import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  astroSegments,
  codeLines,
  fileLines,
  measureCode,
  measureText,
  oversized,
} from './size-rules';

const sizes = (code: string, file = 'x.ts') =>
  Object.fromEntries(measureCode(code, file).map((f) => [f.name, f.lines]));

const parse = (code: string, file = 'x.tsx') =>
  ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

describe('codeLines', () => {
  it('skips blank and comment-only lines', () => {
    const code = ['// a comment', 'const a = 1;', '', '/* block', '   still */', 'a;'].join('\n');
    expect([...codeLines(parse(code))]).toEqual([1, 5]);
  });

  it('counts every line a multi-line string spans', () => {
    expect(codeLines(parse('const s = `one\n\ntwo`;')).size).toBe(3);
  });

  it('reads the code after a template substitution as code, not string', () => {
    const code = ['const s = `a${b}c`;', '', '// note', 'f();'].join('\n');
    expect([...codeLines(parse(code))]).toEqual([0, 3]);
  });

  it('counts JSX text only on lines with visible text', () => {
    const code = ['<div>', '  hello', '', '  <b />', '</div>;'].join('\n');
    expect([...codeLines(parse(code))].sort()).toEqual([0, 1, 3, 4]);
  });
});

describe('measureCode', () => {
  it('counts a function from signature to closing brace, without comments', () => {
    const code = ['function f() {', '  // why', '  const a = 1;', '', '  return a;', '}'].join(
      '\n',
    );
    expect(sizes(code)).toEqual({ f: 4 });
  });

  it('gives a nested function its own lines, and the parent only the opening line', () => {
    const code = [
      'const outer = () => {',
      '  const inner = () => {',
      '    one();',
      '    two();',
      '  };',
      '  return inner;',
      '};',
    ].join('\n');
    expect(sizes(code)).toEqual({ outer: 5, inner: 4 });
  });

  it('names methods, object properties and callbacks', () => {
    const code = 'class A { m() { return 1; } }\nconst o = { p: () => 2 };\nlist.map((x) => x);';
    expect(Object.keys(sizes(code))).toEqual(['m', 'p', '<callback of list.map>']);
  });

  it('measures JSX components', () => {
    const code = 'export function C() {\n  return (\n    <div>\n      hi\n    </div>\n  );\n}';
    expect(sizes(code, 'c.tsx')).toEqual({ C: 7 });
  });

  it('does not measure test blocks, but does measure functions inside them', () => {
    const code = "describe('d', () => {\n  it('i', () => {\n    const h = () => 1;\n  });\n});";
    expect(Object.keys(sizes(code))).toEqual(['h']);
  });
});

describe('astroSegments', () => {
  it('finds the frontmatter and inline scripts, with their line offsets', () => {
    const text = [
      '---',
      'const a = 1;',
      '---',
      '<p>{a}</p>',
      '<script>',
      'go();',
      '</script>',
      '<script type="application/ld+json">{}</script>',
    ].join('\n');
    expect(astroSegments(text)).toEqual([
      { code: 'const a = 1;', lineOffset: 1 },
      { code: '\ngo();\n', lineOffset: 4 },
    ]);
  });

  it('reports astro functions at their line in the file', () => {
    const text = '---\nconst f = () => {\n  return 1;\n};\n---\n<p />';
    expect(measureText(text, 'p.astro')).toEqual([
      { file: 'p.astro', name: 'f', line: 2, lines: 3 },
    ]);
  });
});

describe('fileLines and oversized', () => {
  it('does not count a trailing newline as a line', () => {
    expect(fileLines('a\nb\n')).toBe(2);
    expect(fileLines('a\nb')).toBe(2);
  });

  it('keeps only items over the limit, largest first', () => {
    const items = [{ lines: 5 }, { lines: 30 }, { lines: 19 }, { lines: 18 }];
    expect(oversized(items, 18)).toEqual([{ lines: 30 }, { lines: 19 }]);
  });
});
