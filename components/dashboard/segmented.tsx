"use client";

import { cn } from "cn";

/**
 * The filter row used at the top of every dashboard list.
 *
 * Not the shared Tabs component: these do not swap panels, they change the
 * query behind a single list. Radix's tab semantics (a tablist owning
 * tabpanels) would promise a relationship that is not there, so this is a
 * plain group of buttons with `aria-pressed`, which is what it actually is.
 */
export interface Segment<T> {
  label: string;
  value: T;
  /** Shown after the label, for a count like "Drafts 3". */
  count?: number;
}

export function Segmented<T>({
  label,
  segments,
  value,
  onChange,
  className,
}: {
  /** Names the group for a screen reader, e.g. "Filter by status". */
  label: string;
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <button
            key={segment.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(segment.value)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-brand-panel text-brand-panel-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {segment.label}
            {segment.count !== undefined ? (
              <span className="tabular-nums opacity-70">{segment.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
