/** Controls the visual lab's (A96) 2D and 3D panels share: emphasis, layout and tone. */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { toneValues, type Lab2D, type Lab3D } from '../../lib/explorer-lab';
import { Note, Pick, Section, Slide, Toggle, binder } from './controls';
import { EMPHASIS, labelled } from './options';
import type { Text } from './text';

export type ControlProps<S extends Lab2D | Lab3D> = { s: S; set: (s: S) => void; t: Text };

/** A binder over the keys 2D and 3D share (each change keeps the view's own state type). */
const shared = <S extends Lab2D | Lab3D>(s: S, set: (s: S) => void) =>
  binder<Lab2D | Lab3D>(s, set as (s: Lab2D | Lab3D) => void);

/** Emphasis by importance: the mode and the spread. */
export function Emph<S extends Lab2D | Lab3D>({ s, set, t }: ControlProps<S>) {
  const b = shared(s, set);
  return (
    <>
      <Pick label={t.emph} {...b('emph')} options={labelled(t, EMPHASIS)} />
      <Slide label={t.spread} {...b('spread')} min={0} max={4} step={0.1} />
      <Note text={t.emphNote} when={s.emph !== 'off'} />
    </>
  );
}

/** Relayout: minimum distance and sub-domain clustering. */
export function LayoutControls<S extends Lab2D | Lab3D>({ s, set, t }: ControlProps<S>) {
  const b = shared(s, set);
  return (
    <Section title={t.layout}>
      <Slide label={t.mindist} {...b('mindist')} min={0.8} max={1.4} step={0.05} />
      <Toggle label={t.sub} {...b('sub')} />
    </Section>
  );
}

/** Cream-map contrast sliders (plus any the view adds) and "copy values". */
export function ToneControls<S extends Lab2D | Lab3D>(
  p: ControlProps<S> & { children?: ComponentChildren },
) {
  const { s, set, t } = p;
  const b = shared(s, set);
  return (
    <Section title={t.toneTitle}>
      <Note text={t.toneNote} />
      <Slide label={t.nodeSat} {...b('nodeSat')} min={0.4} max={1.8} step={0.05} />
      <Slide label={t.nodeLight} {...b('nodeLight')} min={-0.3} max={0.3} step={0.01} />
      <Slide label={t.edgeDark} {...b('edgeDark')} min={0} max={0.4} step={0.01} />
      <Slide label={t.edgeAlpha} {...b('edgeAlpha')} min={0.4} max={3} step={0.05} />
      <Slide label={t.shadow} {...b('shadow')} min={0} max={4} step={0.1} />
      {p.children}
      <CopyValues s={s} t={t} />
    </Section>
  );
}

/** Copy the chosen tone values (as the numbers to adopt) and show them. */
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

/** The last copied values (shown under the button), and the copy itself. */
function useCopy(s: Lab2D | Lab3D) {
  const [copied, setCopied] = useState('');
  const copy = () => {
    const text = JSON.stringify(toneValues(s), null, 2);
    setCopied(text);
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };
  return { copied, copy };
}
