import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { toneValues, type Lab2D, type Lab3D } from '../../lib/explorer-lab';
import { Note, PickList, Section, Slider, Toggle, binder } from './controls';
import { EMPHASIS, labelled } from './options';
import type { Text } from './text';

export type ControlProps<S extends Lab2D | Lab3D> = { s: S; set: (s: S) => void; t: Text };

const shared = <S extends Lab2D | Lab3D>(s: S, set: (s: S) => void) =>
  binder<Lab2D | Lab3D>(s, set as (s: Lab2D | Lab3D) => void);

export function EmphasisControls<S extends Lab2D | Lab3D>({ s, set, t }: ControlProps<S>) {
  const b = shared(s, set);
  return (
    <>
      <PickList label={t.emph} {...b('emph')} options={labelled(t, EMPHASIS)} />
      <Slider label={t.spread} {...b('spread')} min={0} max={4} step={0.1} />
      <Note text={t.emphNote} when={s.emph !== 'off'} />
    </>
  );
}

export function LayoutControls<S extends Lab2D | Lab3D>({ s, set, t }: ControlProps<S>) {
  const b = shared(s, set);
  return (
    <Section title={t.layout}>
      <Slider label={t.mindist} {...b('mindist')} min={0.8} max={1.4} step={0.05} />
      <Toggle label={t.sub} {...b('sub')} />
    </Section>
  );
}

export function ToneControls<S extends Lab2D | Lab3D>(
  p: ControlProps<S> & { children?: ComponentChildren },
) {
  const { s, set, t } = p;
  const b = shared(s, set);
  return (
    <Section title={t.toneTitle}>
      <Note text={t.toneNote} />
      <Slider label={t.nodeSat} {...b('nodeSat')} min={0.4} max={1.8} step={0.05} />
      <Slider label={t.nodeLight} {...b('nodeLight')} min={-0.3} max={0.3} step={0.01} />
      <Slider label={t.edgeDark} {...b('edgeDark')} min={0} max={0.4} step={0.01} />
      <Slider label={t.edgeAlpha} {...b('edgeAlpha')} min={0.4} max={3} step={0.05} />
      <Slider label={t.shadow} {...b('shadow')} min={0} max={4} step={0.1} />
      {p.children}
      <CopyValues s={s} t={t} />
    </Section>
  );
}

function CopyValues({ s, t }: { s: Lab2D | Lab3D; t: Text }) {
  const { copied, copy } = useCopy(s);
  return (
    <>
      <button
        type="button"
        class="rounded-full border border-border-strong px-2.5 py-1 text-fg hover:border-border-hover"
        onClick={copy}
        data-lab-copy
      >
        {copied ? t.copied : t.copy}
      </button>
      {copied && <Copied text={copied} />}
    </>
  );
}

function Copied(p: { text: string }) {
  return (
    <pre class="overflow-x-auto rounded bg-surface p-2 font-mono text-[11px] select-all">
      {p.text}
    </pre>
  );
}

function useCopy(s: Lab2D | Lab3D) {
  const [copied, setCopied] = useState('');
  const copy = () => {
    const text = JSON.stringify(toneValues(s), null, 2);
    setCopied(text);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };
  return { copied, copy };
}
