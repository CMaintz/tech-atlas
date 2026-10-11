import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { domainColour } from '../../lib/graph-style';
import { frostedPanel } from './styles';
import type { Mode } from './state';
import type { Chrome } from './use-canvas-lab';

type LegendProps = { chrome: Chrome; mode: Mode };

export default function Legend(p: LegendProps) {
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  return (
    <div
      class={`absolute bottom-3 left-3 z-10 sm:left-28 max-w-xs text-xs ${frostedPanel}`}
      data-lab-legend
    >
      <LegendToggle
        label={p.chrome.site.graphUi.legend}
        open={open}
        toggle={() => setOpen(!open)}
      />
      {open && <LegendBody {...p} />}
    </div>
  );
}

function LegendToggle(p: { label: string; open: boolean; toggle: () => void }) {
  return (
    <button
      class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-fg-soft"
      aria-expanded={p.open}
      onClick={p.toggle}
    >
      {p.label}
      <span aria-hidden="true">{p.open ? '▾' : '▸'}</span>
    </button>
  );
}

function LegendBody({ chrome, mode }: LegendProps) {
  const { t } = chrome;
  return (
    <div class="space-y-2 border-t border-border px-3 py-2 text-muted">
      <DomainKeys chrome={chrome} />
      <SplitKey chrome={chrome} />
      <FamilyKeys chrome={chrome} />
      <p>{t.pulses}</p>
      <p class="text-subtle">{mode === 'flat' ? t.hintFlat : t.hintDepth}</p>
    </div>
  );
}

function DomainKeys({ chrome }: { chrome: Chrome }) {
  const { theme, allDomains, site } = chrome;
  return (
    <div class="flex flex-wrap gap-x-3 gap-y-1">
      {allDomains.map((d) => (
        <SwatchKey label={site.domainLabels[d] ?? d}>
          <span
            class="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: domainColour(d, theme) }}
          />
        </SwatchKey>
      ))}
    </div>
  );
}

function FamilyKeys({ chrome }: { chrome: Chrome }) {
  const { familyKeys, famColours, site } = chrome;
  return (
    <div class="flex flex-wrap gap-x-3 gap-y-1">
      {familyKeys.map((f) => (
        <SwatchKey label={site.familyLabels[f] ?? f}>
          <span class="inline-block h-0.5 w-3" style={{ background: famColours[f] }} />
        </SwatchKey>
      ))}
    </div>
  );
}

function SwatchKey(p: { label: string; children: ComponentChildren }) {
  return (
    <span class="inline-flex items-center gap-1">
      {p.children}
      {p.label}
    </span>
  );
}

function SplitKey({ chrome }: { chrome: Chrome }) {
  const splitSample = chrome.allDomains
    .slice(0, 2)
    .map((d, i) => `${domainColour(d, chrome.theme)} ${i * 50}% ${(i + 1) * 50}%`)
    .join(', ');
  return (
    <div class="flex items-center gap-2">
      <span
        class="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-fg-soft"
        style={{ background: `linear-gradient(90deg, ${splitSample})` }}
      />
      {chrome.site.graphUi.ring}
    </div>
  );
}
