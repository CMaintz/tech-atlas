import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Ink } from './ink';
import type { TimelineEntry } from './types';
import type { ItemHandlers } from './use-selection';

export type TimelineCtx = {
  ink: (domain: string | undefined) => Ink;
  ringOf: (it: TimelineEntry, lane: string) => Ink | null;
  label: (domain: string) => string;
  text: Record<string, string>;
  eraLabels: Record<string, string>;
  item: (it: TimelineEntry) => ItemHandlers;
  selId: string | undefined;
};

export const TimelineContext = createContext<TimelineCtx | null>(null);

export function useTimelineCtx(): TimelineCtx {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error('Timeline parts must render inside <Timeline>');
  return ctx;
}
