import Link from "next/link";
import type { ReactNode } from "react";
import { CircleAlert, Inbox, LoaderCircle, RotateCw } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The three states every dashboard list can be in besides "has rows".
 *
 * They live together because they have to agree on height: a list that is
 * 400px tall while loading and 120px tall when empty makes the page jump
 * under the reader's cursor.
 */

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-heading text-2xl leading-tight font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 gap-2">{action}</div> : null}
    </div>
  );
}

/** Skeleton rows, sized to the table they stand in for. */
export function LoadingRows({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-busy>
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="ring-foreground/10 flex items-center gap-4 rounded-xl px-4 py-3.5 ring-1"
        >
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="ml-auto h-5 w-20 rounded-4xl" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: typeof Inbox;
}) {
  return (
    <div className="ring-foreground/10 flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center ring-1">
      <span className="bg-secondary text-muted-foreground flex size-10 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-heading text-base font-medium">{title}</p>
        {description ? (
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * A failed load.
 *
 * Deliberately the same calm, centred shape as the empty state rather than a
 * red panel. Most of what lands here is not a fault the reader caused or can
 * do anything about — a dropped connection, a slow API, a page they are not
 * signed in for — and alarming them adds nothing to "try again". The one
 * useful action gets a button; the machine-readable code stays available for
 * a bug report without shouting.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: { message: string; code: string; status: number };
  onRetry?: () => void;
}) {
  const forbidden = error.status === 403;

  return (
    <div
      role="alert"
      className="ring-foreground/10 flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center ring-1"
    >
      <span className="bg-secondary text-muted-foreground flex size-10 items-center justify-center rounded-full">
        <CircleAlert className="size-5" aria-hidden />
      </span>

      <div>
        <p className="font-heading text-base font-medium">
          {forbidden ? "You do not have access to this" : "Could not load this"}
        </p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          {error.message}
        </p>
      </div>

      {!forbidden && onRetry ? (
        <Button variant="outline" size="lg" onClick={onRetry}>
          <RotateCw aria-hidden />
          Try again
        </Button>
      ) : null}

      {error.code && error.code !== "UNKNOWN_ERROR" ? (
        <p className="text-muted-foreground font-mono text-xs">{error.code}</p>
      ) : null}
    </div>
  );
}

/**
 * Feedback on an action that did not go through, shown where the action was.
 *
 * Centred and quiet, matching the block states above: the icon and the words
 * carry the meaning, so it does not need a colour to be understood. It still
 * announces itself to a screen reader, which is the part that actually
 * matters for something the reader has to notice.
 */
export function ActionError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="text-muted-foreground mt-2 flex items-center justify-center gap-1.5 text-center text-sm"
    >
      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      className={cn("size-4 animate-spin", className)}
      aria-hidden
    />
  );
}

/**
 * A card that says the account cannot use this screen yet, with the one link
 * that fixes it. Used for a provider who has not been verified and a customer
 * account that has no provider profile.
 */
export function GateCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="ring-foreground/10 flex flex-col items-center gap-3 rounded-xl px-6 py-10 text-center ring-1">
      <div>
        <p className="font-heading text-base font-medium">{title}</p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          {description}
        </p>
      </div>
      {href && cta ? (
        <Button asChild variant="accent" size="lg">
          <Link href={href}>{cta}</Link>
        </Button>
      ) : null}
    </div>
  );
}
