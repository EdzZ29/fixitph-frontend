"use client";

import type { ReactNode } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { cn } from "cn";

import type { BookingStatus, RequestStatus } from "@/lib/api/client";

/**
 * The customer-facing lifecycle of a job, as one animated track.
 *
 * The six stages below are the journey a customer actually experiences, which
 * is not the same as any single enum in the database. The first four come off
 * RequestStatus; the last two only exist on the booking that accepting a
 * quote creates. That is why this takes both, and why a caller holding only a
 * request (the requests list does) legitimately stops at "Scheduled" — the
 * row it renders has no booking to read. Nothing is invented to fill the gap:
 * a stage is shown as reached only when something says it was.
 */
const STAGES = [
  {
    key: "PENDING",
    label: "Posted",
    detail: "Providers near you can see it and send quotes.",
  },
  {
    key: "QUOTED",
    label: "Quoted",
    detail: "Compare what came back and pick the one you want.",
  },
  {
    key: "ACCEPTED",
    label: "Accepted",
    detail: "You picked a quote. The provider confirms next.",
  },
  {
    key: "SCHEDULED",
    label: "Scheduled",
    detail: "Confirmed, with a date in the diary.",
  },
  {
    key: "IN_PROGRESS",
    label: "In progress",
    detail: "The provider is on the job.",
  },
  {
    key: "COMPLETED",
    label: "Completed",
    detail: "Finished. Leave a review whenever you are ready.",
  },
] as const;

export interface FlowHalt {
  label: string;
  detail: string;
  /** Muted for the ordinary endings, critical for the ones worth chasing. */
  tone: "muted" | "critical";
}

/**
 * The endings that stop the flow rather than advance it.
 *
 * DECLINED from the lifecycle sketch is not here, because nothing declines a
 * *request*: a provider declines a quote (QuoteStatus.REJECTED) and the
 * request carries on collecting others. A screen showing a single declined
 * quote can pass that meaning in through the `halt` prop.
 */
const BOOKING_HALTS: Partial<Record<BookingStatus, FlowHalt>> = {
  DISPUTED: {
    label: "Disputed",
    detail: "Raised for review. Support will come back to you.",
    tone: "critical",
  },
  NO_SHOW_CUSTOMER: {
    label: "Marked as a no-show",
    detail: "The provider recorded that nobody was there.",
    tone: "critical",
  },
  NO_SHOW_PROVIDER: {
    label: "Provider did not arrive",
    detail: "Recorded as a no-show. You can rebook or raise a dispute.",
    tone: "critical",
  },
  CANCELLED_BY_CUSTOMER: {
    label: "Cancelled by you",
    detail: "This job is not going ahead.",
    tone: "muted",
  },
  CANCELLED_BY_PROVIDER: {
    label: "Cancelled by the provider",
    detail: "You can post it again and get fresh quotes.",
    tone: "muted",
  },
};

const REQUEST_HALTS: Partial<Record<RequestStatus, FlowHalt>> = {
  CANCELLED: {
    label: "Cancelled",
    detail: "This request is closed and no longer taking quotes.",
    tone: "muted",
  },
  EXPIRED: {
    label: "Expired",
    detail: "It ran past its date. Post it again to get fresh quotes.",
    tone: "muted",
  },
};

export interface RequestFlow {
  /** Index into STAGES of the furthest stage reached. */
  index: number;
  halt: FlowHalt | null;
}

/**
 * Where a job has got to. Exported because it is the interesting half: the
 * markup below is just a drawing of whatever this returns.
 */
export function resolveRequestFlow(
  status: RequestStatus,
  bookingStatus: BookingStatus | null = null,
  override: FlowHalt | null = null,
): RequestFlow {
  // The request tells us how far it got before a booking existed. DRAFT and
  // OPEN are both "posted" as far as the customer's eye is concerned; CLOSED
  // is only ever set deliberately, and means the job is done with.
  let index = 0;
  if (status === "QUOTED") index = 1;
  else if (status === "ACCEPTED") index = 2;
  else if (status === "BOOKED") index = 3;
  else if (status === "CLOSED") index = 5;

  // A booking is the only thing that knows about the last three stages, so it
  // wins wherever it has an opinion.
  if (bookingStatus === "PENDING_CONFIRMATION") index = Math.max(index, 2);
  else if (bookingStatus === "CONFIRMED") index = Math.max(index, 3);
  else if (bookingStatus === "IN_PROGRESS") index = Math.max(index, 4);
  else if (bookingStatus === "COMPLETED") index = 5;

  const halt =
    override ??
    (bookingStatus ? (BOOKING_HALTS[bookingStatus] ?? null) : null) ??
    REQUEST_HALTS[status] ??
    null;

  return { index, halt };
}

type StepState = "done" | "current" | "todo";

export function RequestProgress({
  status,
  bookingStatus = null,
  halt: override = null,
  footer,
  className,
}: {
  status: RequestStatus;
  bookingStatus?: BookingStatus | null;
  halt?: FlowHalt | null;
  /**
   * Anything the caller wants to hang under the track, ruled off from it.
   * A slot rather than a payment prop: what belongs beside the progress of a
   * job differs by screen, and this component's business is the status.
   */
  footer?: ReactNode;
  className?: string;
}) {
  const { index, halt } = resolveRequestFlow(status, bookingStatus, override);
  const stopped = !!halt;
  const last = STAGES.length - 1;

  const heading = stopped ? halt.label : STAGES[index].label;
  const detail = stopped ? halt.detail : STAGES[index].detail;

  return (
    <section
      className={cn("ring-foreground/10 rounded-xl px-4 py-3.5 ring-1", className)}
      aria-label="Request progress"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p
          className={cn(
            "font-heading text-sm font-medium",
            stopped && halt.tone === "critical" && "text-destructive",
            stopped && halt.tone === "muted" && "text-muted-foreground",
          )}
        >
          {heading}
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {stopped ? "Stopped" : `Step ${index + 1} of ${STAGES.length}`}
        </p>
      </div>
      <p className="text-muted-foreground mt-0.5 text-xs">{detail}</p>

      <ol className="mt-4 flex items-start">
        {STAGES.map((stage, i) => {
          // Once stopped, nothing is "current" — a halted flow is not waiting
          // on this stage, it has left it.
          const state: StepState = stopped
            ? i <= index
              ? "done"
              : "todo"
            : i < index
              ? "done"
              : i === index
                ? "current"
                : "todo";

          // The stage the flow died in wears the halt, so the eye lands on
          // where it stopped rather than on the last green tick.
          const isHaltMarker = stopped && i === index;

          return (
            <li
              key={stage.key}
              className="relative flex flex-1 flex-col items-center text-center"
              aria-current={state === "current" ? "step" : undefined}
            >
              {i > 0 ? (
                <Segment side="left" filled={i <= index} active={false} />
              ) : null}
              {i < last ? (
                <Segment
                  side="right"
                  filled={i < index}
                  // The segment being worked along right now: the one leaving
                  // the stage the job is sitting in.
                  active={!stopped && i === index}
                />
              ) : null}

              <Dot
                state={state}
                halt={isHaltMarker ? halt : null}
                index={i}
                label={stage.label}
              />

              <span
                className={cn(
                  "mt-1.5 hidden text-[11px] leading-tight sm:block",
                  state === "todo"
                    ? "text-muted-foreground"
                    : "text-foreground font-medium",
                )}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      {footer ? (
        <div className="border-foreground/10 mt-3.5 border-t pt-3">{footer}</div>
      ) : null}
    </section>
  );
}

/**
 * Half a connector, drawn from a dot's centre outwards, so every step can be
 * an equal-width column and the labels line up under the dots without any
 * arithmetic. `top-3` is the centre of a `size-6` dot.
 */
function Segment({
  side,
  filled,
  active,
}: {
  side: "left" | "right";
  filled: boolean;
  active: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-border absolute top-3 h-0.5 -translate-y-1/2 overflow-hidden rounded-full",
        side === "left" ? "left-0 right-1/2" : "left-1/2 right-0",
      )}
    >
      <span
        className={cn("bg-accent flow-fill block h-full", filled ? "w-full" : "w-0")}
      />
      {active ? (
        <span className="flow-shimmer via-accent absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent to-transparent" />
      ) : null}
    </span>
  );
}

function Dot({
  state,
  halt,
  index,
  label,
}: {
  state: StepState;
  halt: FlowHalt | null;
  index: number;
  label: string;
}) {
  const critical = halt?.tone === "critical";

  return (
    <span
      className={cn(
        "relative flex size-6 shrink-0 items-center justify-center rounded-full",
        halt
          ? critical
            ? "bg-destructive/10 text-destructive ring-destructive/30 ring-1"
            : "bg-secondary text-muted-foreground ring-border ring-1"
          : state === "todo"
            ? "bg-background text-muted-foreground ring-border ring-1"
            : "bg-accent text-accent-foreground",
        state === "current" && !halt && "ring-accent/25 ring-4",
      )}
    >
      {/* The breathing ripple under the stage the job is sitting in. */}
      {state === "current" && !halt ? (
        <span className="flow-halo bg-accent absolute inset-0 rounded-full" aria-hidden />
      ) : null}

      <span className="relative z-10 flex items-center justify-center">
        {halt ? (
          critical ? (
            <TriangleAlert className="size-3.5" aria-hidden />
          ) : (
            <X className="size-3.5" aria-hidden />
          )
        ) : state === "done" ? (
          <Check
            className="flow-pop size-3.5"
            style={{ animationDelay: `${index * 70}ms` }}
            aria-hidden
          />
        ) : (
          <span
            className={cn(
              "size-1.5 rounded-full",
              state === "current" ? "bg-accent-foreground" : "bg-muted-foreground/50",
            )}
            aria-hidden
          />
        )}
      </span>

      <span className="sr-only">
        {label}
        {halt
          ? ` — ${halt.label}`
          : state === "done"
            ? " — done"
            : state === "current"
              ? " — in progress"
              : " — not started"}
      </span>
    </span>
  );
}
