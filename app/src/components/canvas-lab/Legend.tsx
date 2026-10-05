/** The canvas lab's compact legend, bottom-left, collapsible. */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { domainColour } from '../../lib/graph-style';
import { bar } from './styles';
import type { Mode } from './state';
import type { Chrome } from './use-canvas-lab';

type LegendProps = { chrome: Chrome; mode: Mode };

export default function Legend(p: LegendProps) {
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024,
  );
  return (
    <div class={`absolute bottom-3 left-3 z-10 sm:left-28 max-w-xs text-xs ${bar}`} data-lab-legend>
      <button
        class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-fg-soft"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {p.chrome.site.graphUi.legend}
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && <LegendBody {...p} />}
    </div>
  );
}

/** Domain colours, a split (multi-domain) term, relationship families and hints. */
function LegendBody({ chrome, mode }: LegendProps) {
  const { t, theme, allDomains, familyKeys, famColours, site } = chrome;
  return (
    <div class="space-y-2 border-t border-border px-3 py-2 text-muted">
      <div class="flex flex-wrap gap-x-3 gap-y-1">
        {allDomains.map((d) => (
          <Key label={site.domainLabels[d] ?? d}>
            <span
              class="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: domainColour(d, theme) }}
            />
          </Key>
        ))}
      </div>
      <SplitKey chrome={chrome} />
      <div class="flex flex-wrap gap-x-3 gap-y-1">
        {familyKeys.map((f) => (
          <Key label={site.familyLabels[f] ?? f}>
            <span class="inline-block h-0.5 w-3" style={{ background: famColours[f] }} />
          </Key>
        ))}
      </div>
      <p>{t.pulses}</p>
      <p class="text-subtle">{mode === 'flat' ? t.hintFlat : t.hintDepth}</p>
    </div>
  );
}

/** A swatch and its label. */
function Key(p: { label: string; children: ComponentChildren }) {
  return (
    <span class="inline-flex items-center gap-1">
      {p.children}
      {p.label}
    </span>
  );
}

/** A term in two domains: the first two domain colours as halves of one disc. */
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
