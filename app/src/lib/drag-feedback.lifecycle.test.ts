import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXPLORER } from './explorer-config';
import { createDragFeedback } from './drag-feedback';

type Listener = (e: unknown) => void;

function fakeElement() {
  const children: unknown[] = [];
  return {
    style: {} as Record<string, string>,
    dataset: {} as Record<string, string>,
    children,
    setAttribute: vi.fn(),
    appendChild: (c: unknown) => void children.push(c),
    remove: vi.fn(),
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
  };
}

let listeners: Map<string, Set<Listener>>;

beforeEach(() => {
  listeners = new Map();
  vi.stubGlobal('document', { createElement: () => fakeElement() });
  vi.stubGlobal('getComputedStyle', () => ({ position: 'static' }));
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false }),
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => void listeners.get(type)?.delete(fn),
  });
});

afterEach(() => vi.unstubAllGlobals());

const fire = (type: string, e: unknown = {}) => {
  for (const fn of [...(listeners.get(type) ?? [])]) fn(e);
};
const count = (type: string) => listeners.get(type)?.size ?? 0;

function setup() {
  const host = fakeElement();
  const drag = createDragFeedback(host as unknown as HTMLElement);
  const ring = host.children[0] as ReturnType<typeof fakeElement>;
  return { host, ring, drag };
}

describe('createDragFeedback', () => {
  it('puts a hidden ring in the host, positioning a static host', () => {
    const { host, ring } = setup();
    expect(host.style.position).toBe('relative');
    expect(ring.style.visibility).toBe('hidden');
    expect(ring.dataset.dragRing).toBe('');
  });
  it('marks the drag and shows the ring once the pointer passes the slop', () => {
    const { host, ring, drag } = setup();
    drag.start('orbit', { clientX: 100, clientY: 100 });
    expect(host.dataset.drag).toBe('orbit');
    expect(ring.style.transform).toBe('translate(90px, 80px)');
    fire('pointermove', { clientX: 101, clientY: 100 });
    expect(ring.style.visibility).toBe('hidden');
    fire('pointermove', { clientX: 100 + EXPLORER.drag.slopPx + 1, clientY: 100 });
    expect(ring.style.visibility).toBe('visible');
  });
  it('ends on pointerup: clears the mark, hides the ring and stops listening', () => {
    const { host, ring, drag } = setup();
    drag.start('pan', { clientX: 0, clientY: 0 });
    fire('pointermove', { clientX: 50, clientY: 50 });
    fire('pointerup');
    expect(host.dataset.drag).toBeUndefined();
    expect(ring.style.visibility).toBe('hidden');
    for (const type of ['pointerup', 'pointercancel', 'blur', 'pointermove'])
      expect(count(type)).toBe(0);
  });
  it('gives touch no ring and does not follow the finger', () => {
    const { host, ring, drag } = setup();
    drag.start('pan', { clientX: 0, clientY: 0, pointerType: 'touch' });
    expect(host.dataset.drag).toBe('pan');
    expect(count('pointermove')).toBe(0);
    expect(count('pointerup')).toBe(1);
    expect(ring.style.transform).toBeUndefined();
  });
  it('restarting a drag ends the previous one first', () => {
    const { drag } = setup();
    drag.start('pan', { clientX: 0, clientY: 0 });
    drag.start('orbit', { clientX: 0, clientY: 0 });
    expect(count('pointerup')).toBe(1);
    expect(count('pointermove')).toBe(1);
  });
  it('destroy ends the drag and removes the ring', () => {
    const { host, ring, drag } = setup();
    drag.start('pan', { clientX: 0, clientY: 0 });
    drag.destroy();
    expect(host.dataset.drag).toBeUndefined();
    expect(ring.remove).toHaveBeenCalled();
    expect(count('pointerup')).toBe(0);
  });
});
