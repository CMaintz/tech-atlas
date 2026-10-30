import { getOrThrow } from './map-get';

type Frame = { id: string; edges: string[]; i: number };

export function stronglyConnected(nodes: string[], next: (id: string) => string[]): string[][] {
  const search = new TarjanSearch(next);
  for (const root of nodes) if (!search.visited(root)) search.run(root);
  return search.components;
}

class TarjanSearch {
  readonly components: string[][] = [];
  private index = new Map<string, number>();
  private low = new Map<string, number>();
  private stack: string[] = [];
  private onStack = new Set<string>();
  private work: Frame[] = [];
  private counter = 0;

  constructor(private next: (id: string) => string[]) {}

  visited(id: string) {
    return this.index.has(id);
  }

  run(root: string) {
    this.open(root);
    for (let frame = this.work.at(-1); frame; frame = this.work.at(-1)) {
      if (frame.i < frame.edges.length) {
        this.follow(frame, frame.edges[frame.i++]);
      } else {
        this.work.pop();
        this.close(frame);
      }
    }
  }

  private open(id: string) {
    this.index.set(id, this.counter);
    this.low.set(id, this.counter);
    this.counter++;
    this.stack.push(id);
    this.onStack.add(id);
    this.work.push({ id, edges: this.next(id), i: 0 });
  }

  private follow(frame: Frame, w: string) {
    if (!this.index.has(w)) this.open(w);
    else if (this.onStack.has(w)) this.lower(frame.id, getOrThrow(this.index, w, 'Tarjan index'));
  }

  private close(frame: Frame) {
    const parent = this.work[this.work.length - 1];
    if (parent) this.lower(parent.id, getOrThrow(this.low, frame.id, 'Tarjan low-link'));
    if (this.low.get(frame.id) === this.index.get(frame.id)) {
      this.components.push(this.popComponent(frame.id));
    }
  }

  private lower(id: string, value: number) {
    this.low.set(id, Math.min(getOrThrow(this.low, id, 'Tarjan low-link'), value));
  }

  private popComponent(root: string): string[] {
    const component: string[] = [];
    for (;;) {
      const w = this.stack.pop();
      if (w === undefined) throw new Error(`component root ${root} is not on the stack`);
      this.onStack.delete(w);
      component.push(w);
      if (w === root) return component;
    }
  }
}
