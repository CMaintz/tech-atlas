import type { ComponentChildren } from 'preact';

export function binder<S extends object>(s: S, set: (s: S) => void) {
  return <K extends keyof S>(k: K) => ({ value: s[k], on: (v: S[K]) => set({ ...s, [k]: v }) });
}

function Row(p: { label: string; children: ComponentChildren }) {
  return (
    <label class="flex items-center justify-between gap-2">
      <span>{p.label}</span>
      {p.children}
    </label>
  );
}

type PickListProps<T extends string> = {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  on: (v: T) => void;
};

export function PickList<T extends string>(p: PickListProps<T>) {
  const onChange = (e: Event) => p.on((e.target as HTMLSelectElement).value as T);
  return (
    <Row label={p.label}>
      <select
        class="max-w-40 rounded border border-border-strong bg-surface px-1 py-0.5 text-fg"
        value={p.value}
        onChange={onChange}
      >
        {p.options.map(([v, l]) => (
          <option value={v}>{l}</option>
        ))}
      </select>
    </Row>
  );
}

export function Toggle(p: { label: string; value: boolean; on: (v: boolean) => void }) {
  return (
    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        checked={p.value}
        onChange={(e) => p.on((e.target as HTMLInputElement).checked)}
      />
      {p.label}
    </label>
  );
}

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  on: (v: number) => void;
};

export function Slider(p: SliderProps) {
  const onInput = (e: Event) => p.on(Number((e.target as HTMLInputElement).value));
  return (
    <Row label={`${p.label} ${p.value.toFixed(2)}`}>
      <input
        type="range"
        class="w-28"
        min={p.min}
        max={p.max}
        step={p.step}
        value={p.value}
        onInput={onInput}
      />
    </Row>
  );
}

export function Section(p: { title: string; children: ComponentChildren }) {
  return (
    <section class="space-y-2 border-t border-border pt-2">
      <h3 class="text-[11px] tracking-widest text-muted uppercase">{p.title}</h3>
      {p.children}
    </section>
  );
}

export function Note(p: { text: string; when?: boolean }) {
  return p.when === false ? null : <p class="text-muted">{p.text}</p>;
}
