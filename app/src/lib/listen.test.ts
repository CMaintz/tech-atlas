import { describe, expect, it } from 'vitest';
import { listen, listenAll } from './listen';

describe('listen', () => {
  it('adds a listener and hands back its removal, with the same options', () => {
    const t = new EventTarget();
    const seen: string[] = [];
    const off = listen(t, 'x', (e) => seen.push(e.type), { capture: true });
    t.dispatchEvent(new Event('x'));
    off();
    t.dispatchEvent(new Event('x'));
    expect(seen).toEqual(['x']);
  });
});

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
