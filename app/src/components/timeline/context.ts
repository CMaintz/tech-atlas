import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Ink } from './ink';
import type { TimelineEntry } from './types';
import type { ItemHandlers } from './use-selection';

/** What every part of the chart paints with: colours, labels, strings and term handlers. */
export type TimelineCtx = {
  /** A domain's colour on both maps. */
  ink: (domain: string | undefined) => Ink;
  /** The ring colour for a term in a second domain (besides `lane`), or null. */
  ringOf: (it: TimelineEntry, lane: string) => Ink | null;
  /** A domain's display name. */
  label: (domain: string) => string;
  text: Record<string, string>;
  eraLabels: Record<string, string>;
  /** Hover/focus/click handlers for a term link. */
  item: (it: TimelineEntry) => ItemHandlers;
  /** The term whose summary is up, if any. */
  selId: string | undefined;
};

export const TimelineContext = createContext<TimelineCtx | null>(null);

export function useTimelineCtx(): TimelineCtx {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error('Timeline parts must render inside <Timeline>');
  return ctx;
}
