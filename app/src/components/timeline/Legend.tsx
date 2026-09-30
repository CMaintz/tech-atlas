import { useTimelineCtx } from './context';
import { Dot } from './Dot';

/** The key under the controls: a milestone, a term in a second domain, a "+N" chip. */
export function Legend({ domains }: { domains: string[] }) {
  const { ink, text } = useTimelineCtx();
  return (
    <p class="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted">
      <span class="flex items-center gap-2">
        <Dot colour={ink(domains[0])} ring={null} hub /> {text.milestone}
      </span>
      <OtherDomainKey domains={domains} />
      <MoreKey />
    </p>
  );
}

/** A dot ringed in a second domain's colour. */
function OtherDomainKey({ domains }: { domains: string[] }) {
  const { ink, text } = useTimelineCtx();
  return (
    <span class="flex items-center gap-2.5">
      <span class="px-1">
        <Dot colour={ink(domains[0])} ring={ink(domains[2] ?? domains[1])} hub={false} />
      </span>
      {text.otherDomain}
    </span>
  );
}

/** A sample "+N" chip (desktop only: phones show every term). */
function MoreKey() {
  const { text } = useTimelineCtx();
  return (
    <span class="hidden items-center gap-2 sm:flex">
      <span class="rounded-full border border-border-strong bg-surface-2 px-1.5 text-[10px] leading-4 text-fg-soft">
        +3
      </span>
      {text.moreHint}
    </span>
  );
}
