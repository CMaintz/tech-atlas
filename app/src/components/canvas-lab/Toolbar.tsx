import { domainColour } from '../../lib/graph-style';
import { toggled } from '../../lib/explorer-view';
import { frostedPanel, switchSegment, togglePill } from './styles';
import type { Mode } from './state';
import type { CanvasLab } from './use-canvas-lab';
import SearchBox from './SearchBox';

type P = { lab: CanvasLab };

export default function Toolbar({ lab }: P) {
  const { t } = lab.chrome;
  return (
    <div
      class={`absolute top-3 right-14 left-3 z-10 ${lab.sel ? 'lg:right-[calc(26rem+3.5rem)]' : ''} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 text-sm ${frostedPanel}`}
      data-lab-toolbar
    >
      <span class="text-xs font-semibold tracking-widest text-subtle uppercase">{t.title}</span>
      <ModeControls lab={lab} />
      <EdgeSwitch lab={lab} />
      <DomainPills lab={lab} />
      <FamilyMenu lab={lab} />
      <SearchBox lab={lab} />
      <ToolbarEnd lab={lab} />
    </div>
  );
}

function ToolbarEnd({ lab }: P) {
  const { t, site } = lab.chrome;
  return (
    <>
      <button class={togglePill(false)} onClick={lab.actions.resetView}>
        {t.fit}
      </button>
      <a class="text-xs text-accent hover:underline" href={site.explorerUrl}>
        {t.compare}
      </a>
    </>
  );
}

function SegmentedSwitch<T>(p: { value: T; options: [T, string][]; on: (v: T) => void }) {
  return (
    <div class="flex overflow-hidden rounded-full border border-border-strong">
      {p.options.map(([v, label]) => (
        <button
          class={switchSegment(p.value === v)}
          aria-pressed={p.value === v}
          onClick={() => p.on(v)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ModeControls({ lab }: P) {
  const { t } = lab.chrome;
  const { mode, setMode } = lab.ui;
  const modes: [Mode, string][] = [
    ['flat', t.flat],
    ['depth', t.depth],
  ];
  return (
    <>
      <SegmentedSwitch value={mode} options={modes} on={setMode} />
      {mode === 'depth' && <SpinToggle lab={lab} />}
    </>
  );
}

function SpinToggle({ lab }: P) {
  const { spin, setSpin } = lab.ui;
  return (
    <label class="flex items-center gap-1.5 text-xs text-fg-soft">
      <input type="checkbox" checked={spin} onChange={() => setSpin(!spin)} />
      {lab.chrome.t.spin}
    </label>
  );
}

function EdgeSwitch({ lab }: P) {
  const { t } = lab.chrome;
  const edges: [boolean, string][] = [
    [false, t.backbone],
    [true, t.all],
  ];
  return (
    <div class="flex items-center gap-1.5">
      <span class="text-xs text-subtle">{t.edges}</span>
      <SegmentedSwitch value={lab.filters.showAll} options={edges} on={lab.filters.setShowAll} />
    </div>
  );
}

function DomainPills({ lab }: P) {
  const { allDomains, site } = lab.chrome;
  return (
    <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label={site.ui.domains}>
      {allDomains.map((d) => (
        <DomainPill lab={lab} domain={d} />
      ))}
    </div>
  );
}

function DomainPill({ lab, domain: d }: P & { domain: string }) {
  const { theme, site } = lab.chrome;
  const { domains, setDomains } = lab.filters;
  return (
    <button
      class={togglePill(domains.has(d))}
      aria-pressed={domains.has(d)}
      onClick={() => setDomains(toggled(domains, d))}
    >
      <DomainDot colour={domainColour(d, theme)} on={domains.has(d)} />
      {site.domainLabels[d] ?? d}
    </button>
  );
}

function DomainDot({ colour, on }: { colour: string; on: boolean }) {
  return (
    <span
      class="inline-block h-2 w-2 rounded-full"
      style={{ background: on ? colour : 'transparent', boxShadow: `inset 0 0 0 1px ${colour}` }}
    />
  );
}

function FamilyMenu({ lab }: P) {
  const { familyKeys, site } = lab.chrome;
  const { families } = lab.filters;
  return (
    <details class="relative">
      <summary
        class={`${togglePill(families.size === familyKeys.length)} cursor-pointer list-none`}
      >
        {site.ui.relationshipTypes} ▾
      </summary>
      <div class={`absolute top-full left-0 mt-2 w-64 space-y-1 p-3 ${frostedPanel}`}>
        {familyKeys.map((f) => (
          <FamilyCheck lab={lab} family={f} />
        ))}
      </div>
    </details>
  );
}

function FamilyCheck({ lab, family: f }: P & { family: string }) {
  const { famColours, site } = lab.chrome;
  const { families, setFamilies } = lab.filters;
  return (
    <label class="flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={families.has(f)}
        onChange={() => setFamilies(toggled(families, f))}
      />
      <span class="inline-block h-0.5 w-4" style={{ background: famColours[f] }} />
      {site.familyLabels[f] ?? f}
    </label>
  );
}
