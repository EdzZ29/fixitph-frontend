import { cn } from "cn";

import type { StatusMeta, Tone } from "@/lib/format";

/**
 * A status pill.
 *
 * Deliberately not the shared Badge component. Badge's variants are about
 * emphasis (default, secondary, outline); a status needs *meaning* — the same
 * five tones used identically on every screen, so "warning" always looks like
 * waiting and "critical" always looks like a problem. Lime carries positive,
 * because on this palette lime is the brand's yes.
 */
const TONE_CLASS: Record<Tone, string> = {
  positive:
    "bg-accent text-accent-foreground ring-transparent dark:bg-accent dark:text-accent-foreground",
  warning:
    "bg-amber-100 text-amber-900 ring-amber-600/20 dark:bg-amber-400/15 dark:text-amber-200 dark:ring-amber-300/25",
  critical:
    "bg-destructive/10 text-destructive ring-destructive/25 dark:bg-destructive/20",
  neutral:
    "bg-brand-panel text-brand-panel-foreground ring-transparent dark:bg-secondary dark:text-secondary-foreground",
  muted: "bg-secondary text-muted-foreground ring-border",
};

export function StatusBadge({
  meta,
  className,
}: {
  meta: StatusMeta;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-4xl px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASS[meta.tone],
        className,
      )}
    >
      {meta.label}
    </span>
  );
}

/** A small count pill, for "3 open" next to a nav item or tab. */
export function CountPill({
  count,
  tone = "muted",
  className,
}: {
  count: number;
  tone?: Tone;
  className?: string;
}) {
  if (!count) return null;
  return (
    <span
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-4xl px-1.5 text-xs font-medium tabular-nums ring-1 ring-inset",
        TONE_CLASS[tone],
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
