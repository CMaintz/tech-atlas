import { describe, expect, it } from 'vitest';
import { fileLines, measureText, oversized } from './size-rules';

const sizes = (code: string, file = 'x.ts') =>
  Object.fromEntries(measureText(code, file).map((f) => [f.name, f.lines]));

const lines = (...l: string[]) => l.join('\n');

describe('which lines count as code', () => {
  it('skips blank and comment-only lines', () => {
    const code = lines(
      'function f() {',
      '  // a comment',
      '  const a = 1;',
      '',
      '  /* block',
      '     still */',
      '  a;',
      '}',
    );
    expect(sizes(code)).toEqual({ f: 4 });
  });

  it('counts every line a multi-line string spans', () => {
    expect(sizes(lines('function f() {', '  const s = `one', '', 'two`;', '}'))).toEqual({ f: 5 });
  });

  it('reads the code after a template substitution as code, not string', () => {
    const code = lines('function f() {', '  const s = `a${b}c`;', '', '  // note', '  g();', '}');
    expect(sizes(code)).toEqual({ f: 4 });
  });

  it('skips doc comments the parser attaches to the tree', () => {
    const code = lines(
      'function f() {',
      '  const o = {',
      '    /** doc */',
      '    a: 1,',
      '  };',
      '}',
    );
    expect(sizes(code)).toEqual({ f: 5 });
  });

  it('counts JSX text only on lines with visible text', () => {
    const code = lines(
      'function C() {',
      '  return <div>',
      '    hello',
      '',
      '    <b />',
      '  </div>;',
      '}',
    );
    expect(sizes(code, 'c.tsx')).toEqual({ C: 6 });
  });
});

describe('measuring functions', () => {
  it('counts a function from signature to closing brace, without comments', () => {
    const code = lines('function f() {', '  // why', '  const a = 1;', '', '  return a;', '}');
    expect(sizes(code)).toEqual({ f: 4 });
  });

  it('gives a nested function its own lines, and the parent only the opening line', () => {
    const code = lines(
      'const outer = () => {',
      '  const inner = () => {',
      '    one();',
      '    two();',
      '  };',
      '  return inner;',
      '};',
    );
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

describe('astro files', () => {
  it('reports frontmatter functions at their line in the file', () => {
    const text = '---\nconst f = () => {\n  return 1;\n};\n---\n<p />';
    expect(measureText(text, 'p.astro')).toEqual([
      { file: 'p.astro', name: 'f', line: 2, lines: 3 },
    ]);
  });

  it('measures inline scripts at their line, skipping JSON-LD', () => {
    const text = lines(
      '---',
      'const a = 1;',
      '---',
      '<p />',
      '<script>',
      'const g = () => {',
      '  go();',
      '};',
      '</script>',
      '<script type="application/ld+json">',
      'const h = () => {',
      '  no();',
      '};',
      '</script>',
    );
    expect(measureText(text, 'p.astro')).toEqual([
      { file: 'p.astro', name: 'g', line: 6, lines: 3 },
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
