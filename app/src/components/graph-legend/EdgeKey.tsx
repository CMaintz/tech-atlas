import type { ComponentChildren } from 'preact';
import { domainColour, type MapTheme } from '../../lib/graph-style';

type Dict = Record<string, string>;

type Props = {
  families: string[];
  familyColours: Dict;
  familyLabels: Dict;
  text: Dict;
  /** Explorer only: the overview/all-relationships toggle (A86). */
  showAll?: boolean;
  onShowAll?: (on: boolean) => void;
  theme: MapTheme;
};

/** The legend's edges: the show-all toggle (when offered), each family, the line kinds. */
export function EdgeKey({ families, familyColours, familyLabels, text, theme, ...all }: Props) {
  return (
    <>
      <p class="mt-3 mb-1 text-subtle">{text.edges}</p>
      {all.onShowAll && <ShowAll text={text} showAll={all.showAll} onShowAll={all.onShowAll} />}
      <ul class="space-y-1">
        {families.map((f) => (
          <li class="flex items-center gap-2">
            <span
              class="inline-block h-0.5 w-5 shrink-0 rounded"
              style={{ background: familyColours[f] }}
            />
            {familyLabels[f] ?? f}
          </li>
        ))}
      </ul>
      <LineKinds text={text} theme={theme} />
    </>
  );
}

type ShowAllProps = { text: Dict; showAll?: boolean; onShowAll: (on: boolean) => void };

function ShowAll({ text, showAll, onShowAll }: ShowAllProps) {
  return (
    <>
      <label class="mb-1.5 flex items-center gap-2 text-fg-soft">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => onShowAll((e.target as HTMLInputElement).checked)}
        />
        {text.showAll}
      </label>
      {!showAll && <p class="mb-1.5 text-subtle">{text.overview}</p>}
    </>
  );
}

/** One-way (dashed, arrowed), two-way (solid) and cross-domain (gradient) links. */
function LineKinds({ text, theme }: { text: Dict; theme: MapTheme }) {
  return (
    <ul class="mt-3 space-y-1.5 text-muted">
      <KeyRow sample={<OneWayIcon />} label={text.oneWay} />
      <KeyRow sample={<TwoWayIcon />} label={text.twoWay} />
      <KeyRow sample={<CrossDomainLine theme={theme} />} label={text.crossDomain} />
    </ul>
  );
}

function KeyRow({ sample, label }: { sample: ComponentChildren; label: string }) {
  return (
    <li class="flex items-start gap-2">
      {sample}
      {label}
    </li>
  );
}

function OneWayIcon() {
  return (
    <LineIcon>
      <line
        x1="1"
        y1="5"
        x2="15"
        y2="5"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-dasharray="3 3"
      />
      <path d="M14 1 L21 5 L14 9 Z" fill="currentColor" />
    </LineIcon>
  );
}

function TwoWayIcon() {
  return (
    <LineIcon>
      <line x1="1" y1="5" x2="21" y2="5" stroke="currentColor" stroke-width="1.5" />
    </LineIcon>
  );
}

/** A link between domains fades from one domain's colour to the other's. */
function CrossDomainLine({ theme }: { theme: MapTheme }) {
  const gradient = `linear-gradient(90deg, ${domainColour('security', theme)}, ${domainColour('cs', theme)})`;
  return (
    <span class="mt-1 inline-block h-0.5 w-5 shrink-0 rounded" style={{ background: gradient }} />
  );
}

/** A small line sample in the legend's key. */
function LineIcon({ children }: { children: ComponentChildren }) {
  return (
    <svg
      width="22"
      height="10"
      viewBox="0 0 22 10"
      class="mt-0.5 shrink-0 text-fg-soft"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
