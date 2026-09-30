/**
 * Strongly connected components of a directed graph (Tarjan), iterative so a deep
 * chain cannot overflow the call stack. Pure; used by the E5 circular-definition rule.
 */

type Frame = { id: string; edges: string[]; i: number };

/** Every component, in the order Tarjan completes them (members in pop order). */
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
    while (this.work.length) {
      const frame = this.work[this.work.length - 1];
      if (frame.i < frame.edges.length) this.follow(frame, frame.edges[frame.i++]);
      else this.close(this.work.pop()!);
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
    else if (this.onStack.has(w)) this.lower(frame.id, this.index.get(w)!);
  }

  private close(frame: Frame) {
    const parent = this.work[this.work.length - 1];
    if (parent) this.lower(parent.id, this.low.get(frame.id)!);
    if (this.low.get(frame.id) === this.index.get(frame.id)) {
      this.components.push(this.popComponent(frame.id));
    }
  }

  private lower(id: string, value: number) {
    this.low.set(id, Math.min(this.low.get(id)!, value));
  }

  private popComponent(root: string): string[] {
    const component: string[] = [];
    let w: string;
    do {
      w = this.stack.pop()!;
      this.onStack.delete(w);
      component.push(w);
    } while (w !== root);
    return component;
  }
}
