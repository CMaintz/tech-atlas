import { describe, expect, it } from 'vitest';
import { listenAll } from './listen';

describe('listenAll', () => {
  it('adds every listener and removes them all at once', () => {
    const a = new EventTarget();
    const b = new EventTarget();
    const seen: string[] = [];
    const off = listenAll([
      [a, 'x', (e: Event) => seen.push(`a:${e.type}`)],
      [a, 'y', () => seen.push('a:y')],
      [b, 'x', () => seen.push('b:x')],
    ]);
    a.dispatchEvent(new Event('x'));
    a.dispatchEvent(new Event('y'));
    b.dispatchEvent(new Event('x'));
    expect(seen).toEqual(['a:x', 'a:y', 'b:x']);
    off();
    a.dispatchEvent(new Event('x'));
    b.dispatchEvent(new Event('x'));
    expect(seen).toHaveLength(3);
  });
});
