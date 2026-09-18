import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";
import type { Tone } from "@/lib/format";

/**
 * A single figure with its label, and optionally a link to the thing it
 * counts. A stat that cannot be acted on is trivia, so most of these are
 * links to the queue they summarise.
 *
 * `tone` is for figures that mean something is wrong — an open dispute count
 * reads differently from a completed booking count. Everything else stays
 * neutral, so the coloured ones are the ones your eye lands on.
 */
const TONE_VALUE: Record<Tone, string> = {
  neutral: "",
  positive: "",
  muted: "text-muted-foreground",
  warning: "text-amber-700 dark:text-amber-300",
  critical: "text-destructive",
};

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "neutral",
  loading = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: Tone;
  loading?: boolean;
}) {
  const body = (
    <>
      <p className="text-muted-foreground flex items-center gap-1 text-sm">
        {label}
        {href ? (
          <ArrowUpRight
            className="size-3.5 opacity-0 transition-opacity group-hover/stat:opacity-100"
            aria-hidden
          />
        ) : null}
      </p>
      {loading ? (
        <Skeleton className="mt-1.5 h-8 w-16" />
      ) : (
        <p
          className={cn(
            "font-heading mt-0.5 text-3xl leading-none font-semibold tabular-nums",
            TONE_VALUE[tone],
          )}
        >
          {value}
        </p>
      )}
      {hint ? (
        <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>
      ) : null}
    </>
  );

  const shell =
    "group/stat ring-foreground/10 block rounded-xl px-4 py-3.5 ring-1";

  if (!href) return <div className={shell}>{body}</div>;

  return (
    <Link
      href={href}
      className={cn(shell, "hover:bg-secondary/50 transition-colors")}
    >
      {body}
    </Link>
  );
}

/** A responsive row of stats. Four across on desktop, two on a phone. */
export function StatGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A count broken down by status, as a labelled bar. Used on the admin
 * overview, where the shape of the booking mix says more than the total.
 *
 * Deliberately not a chart library: it is one dimension over at most nine
 * categories, and a labelled bar can be read without hovering anything.
 */
export function StatusBars({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; value: number; tone?: Tone }[];
  total: number;
}) {
  const shown = rows.filter((row) => row.value > 0);

  return (
    <div className="ring-foreground/10 rounded-xl px-4 py-3.5 ring-1">
      <p className="font-heading text-sm font-medium">{title}</p>
      {!shown.length ? (
        <p className="text-muted-foreground mt-2 text-sm">Nothing yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((row) => {
            const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted-foreground truncate">
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {row.value.toLocaleString("en-PH")}
                    <span className="text-muted-foreground ml-1.5 text-xs">
                      {share}%
                    </span>
                  </span>
                </div>
                <div
                  className="bg-secondary mt-1 h-1.5 overflow-hidden rounded-full"
                  role="presentation"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      row.tone === "critical"
                        ? "bg-destructive"
                        : row.tone === "warning"
                          ? "bg-amber-500"
                          : row.tone === "muted"
                            ? "bg-muted-foreground/40"
                            : "bg-accent",
                    )}
                    style={{ width: `${Math.max(share, 2)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
