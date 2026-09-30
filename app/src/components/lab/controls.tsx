/**
 * The visual lab's (A96) typed controls: a labelled row, a pick list, a toggle, a
 * slider, a titled section and a note. `binder` ties a control to one key of a state.
 */
import type { ComponentChildren } from 'preact';

/** A control's value and change handler for key `k` of state `s` (a new state per change). */
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

type PickProps<T extends string> = {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  on: (v: T) => void;
};

export function Pick<T extends string>(p: PickProps<T>) {
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

type SlideProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  on: (v: number) => void;
};

/** A slider; its label shows the value to two decimals. */
export function Slide(p: SlideProps) {
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

/** A titled group of controls below a rule. */
export function Section(p: { title: string; children: ComponentChildren }) {
  return (
    <section class="space-y-2 border-t border-border pt-2">
      <h3 class="text-[11px] tracking-widest text-muted uppercase">{p.title}</h3>
      {p.children}
    </section>
  );
}

/** A muted line of explanation (shown only when `when` holds, if given). */
export function Note(p: { text: string; when?: boolean }) {
  return p.when === false ? null : <p class="text-muted">{p.text}</p>;
}
