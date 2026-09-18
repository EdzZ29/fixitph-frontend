"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarClock,
  CalendarSync,
  CircleCheck,
  Gavel,
  MapPin,
  Play,
  Star,
  Wrench,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ReviewDialog } from "@/components/dashboard/review-dialog";
import {
  bookings,
  disputes,
  type BookingStatus,
  type BookingSummary,
} from "@/lib/api/client";
import {
  formatDateTime,
  money,
  relativeTime,
  statusMeta,
  toDateTimeInputValue,
} from "@/lib/format";

/**
 * One booking, from whichever side is looking at it.
 *
 * The available actions are not a matter of taste: the API enforces a
 * transition table (bookings.service.ts) that says which status can move
 * where and which party may move it. This mirrors that table exactly, so a
 * button is only ever offered when the request behind it would succeed. Where
 * the two disagree the API wins, and the failure shows up in the dialog.
 */
export type Perspective = "customer" | "provider" | "admin";

/** Statuses from which the actor may cancel. */
const CANCELLABLE: BookingStatus[] = ["PENDING_CONFIRMATION", "CONFIRMED"];

/**
 * A short reason to file alongside the full details of a dispute. The API
 * wants 5 to 200 characters, so a terse first line falls back to the body
 * rather than being rejected after the fact.
 */
function summarise(details: string): string {
  const firstLine = details.split("\n")[0].trim();
  const source = firstLine.length >= 5 ? firstLine : details.trim();
  return source.slice(0, 200);
}

export function BookingCard({
  booking,
  perspective,
  onChanged,
}: {
  booking: BookingSummary;
  perspective: Perspective;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<
    | "cancel"
    | "confirm"
    | "start"
    | "complete"
    | "dispute"
    | "review"
    | "reschedule"
    | null
  >(null);
  const [finalAmount, setFinalAmount] = useState("");
  const [newStart, setNewStart] = useState("");
  const [scheduleProblem, setScheduleProblem] = useState<string | null>(null);

  const status = booking.status;
  const isProvider = perspective === "provider";
  const isCustomer = perspective === "customer";
  const isAdmin = perspective === "admin";

  // The provider drives the job forward; the customer accepts or disputes it.
  const canConfirm = isProvider && status === "PENDING_CONFIRMATION";
  const canStart = isProvider && status === "CONFIRMED";
  const canComplete = isProvider && status === "IN_PROGRESS";
  const canCancel = !isAdmin && CANCELLABLE.includes(status);
  const canReschedule = !isAdmin && CANCELLABLE.includes(status);
  const canDispute =
    (isCustomer && (status === "IN_PROGRESS" || status === "COMPLETED")) ||
    (isProvider && status === "IN_PROGRESS");
  // Only once: reviews.booking_id is unique, so a second attempt is a 409.
  // The list select carries the review's presence for exactly this check.
  const canReview = isCustomer && status === "COMPLETED" && !booking.review;

  // Both sides now have a real detail page. The provider's used to point back
  // at the list it was already on, which meant the thread on that booking was
  // unreachable from the provider's side.
  const detailHref = isCustomer
    ? `/dashboard/bookings/${booking.id}`
    : isProvider
      ? `/provider/jobs/${booking.id}`
      : null;

  const counterparty = isProvider
    ? (booking.serviceRequest?.title ?? "Direct booking")
    : booking.provider.businessName;

  const upcoming =
    status === "CONFIRMED" || status === "PENDING_CONFIRMATION";

  return (
    <article className="ring-foreground/10 rounded-xl px-4 py-4 ring-1">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-heading truncate text-base font-medium">
              {booking.service?.title ?? counterparty}
            </h3>
            <StatusBadge meta={statusMeta.booking(status)} />
          </div>

          <p className="text-muted-foreground mt-1 text-sm">
            {isProvider ? (
              <>Job for a customer in {booking.serviceRequest?.city ?? "—"}</>
            ) : (
              <>
                with{" "}
                <Link
                  href={`/providers/${booking.provider.slug}`}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {booking.provider.businessName}
                </Link>
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <p className="font-heading text-lg leading-none font-semibold tabular-nums">
            {money(booking.totalAmount, booking.currency)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {statusMeta.payment(booking.paymentStatus).label} ·{" "}
            {booking.paymentMethod.replace(/_/g, " ").toLowerCase()}
          </p>
        </div>
      </div>

      <dl className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden />
          <dt className="sr-only">Scheduled</dt>
          <dd>
            {formatDateTime(booking.scheduledStart)}
            {upcoming ? (
              <span className="text-foreground">
                {" "}
                · {relativeTime(booking.scheduledStart)}
              </span>
            ) : null}
          </dd>
        </div>

        {booking.serviceRequest ? (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Location</dt>
            <dd>
              {[booking.serviceRequest.barangay, booking.serviceRequest.city]
                .filter(Boolean)
                .join(", ")}
            </dd>
          </div>
        ) : null}

        {booking.service ? (
          <div className="flex items-center gap-1.5">
            <Wrench className="size-3.5 shrink-0" aria-hidden />
            <dt className="sr-only">Service</dt>
            <dd>{booking.service.title}</dd>
          </div>
        ) : null}
      </dl>

      {booking.cancellationReason ? (
        <p className="bg-secondary text-muted-foreground mt-3 rounded-md px-3 py-2 text-sm">
          <span className="text-foreground font-medium">Cancelled:</span>{" "}
          {booking.cancellationReason}
        </p>
      ) : null}

      {(canConfirm ||
        canStart ||
        canComplete ||
        canCancel ||
        canDispute ||
        canReview ||
        detailHref) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {canConfirm ? (
            <Button variant="accent" size="sm" onClick={() => setDialog("confirm")}>
              <CircleCheck aria-hidden />
              Accept job
            </Button>
          ) : null}

          {canStart ? (
            <Button variant="accent" size="sm" onClick={() => setDialog("start")}>
              <Play aria-hidden />
              Start work
            </Button>
          ) : null}

          {canComplete ? (
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                setFinalAmount("");
                setDialog("complete");
              }}
            >
              <CircleCheck aria-hidden />
              Mark complete
            </Button>
          ) : null}

          {canReview ? (
            <Button variant="outline" size="sm" onClick={() => setDialog("review")}>
              <Star aria-hidden />
              Leave a review
            </Button>
          ) : null}

          {detailHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={detailHref}>Details</Link>
            </Button>
          ) : null}

          {canReschedule ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStart(toDateTimeInputValue(booking.scheduledStart));
                setScheduleProblem(null);
                setDialog("reschedule");
              }}
            >
              <CalendarSync aria-hidden />
              Reschedule
            </Button>
          ) : null}

          {canDispute ? (
            <Button variant="ghost" size="sm" onClick={() => setDialog("dispute")}>
              <Gavel aria-hidden />
              Raise a dispute
            </Button>
          ) : null}

          {canCancel ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setDialog("cancel")}
            >
              <X aria-hidden />
              Cancel
            </Button>
          ) : null}
        </div>
      )}

      {/* -- dialogs ------------------------------------------------------- */}

      <ConfirmDialog
        open={dialog === "confirm"}
        onOpenChange={(open) => setDialog(open ? "confirm" : null)}
        title="Accept this job?"
        description={
          <>
            The customer is told straight away, and their exact address is
            released to you. Scheduled for{" "}
            {formatDateTime(booking.scheduledStart)}.
          </>
        }
        confirmLabel="Accept job"
        onConfirm={() => bookings.confirm(booking.id)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "start"}
        onOpenChange={(open) => setDialog(open ? "start" : null)}
        title="Start this job?"
        description="Marks the job as underway. Do this when you are on site."
        confirmLabel="Start work"
        onConfirm={() => bookings.start(booking.id)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "complete"}
        onOpenChange={(open) => setDialog(open ? "complete" : null)}
        title="Mark this job complete?"
        description="The customer can then review it, or dispute it if something is wrong."
        confirmLabel="Mark complete"
        reason={{
          label: "Notes for the customer",
          placeholder: "What you did, parts replaced, anything to watch.",
          optional: true,
        }}
        onConfirm={(notes) =>
          bookings.complete(booking.id, {
            ...(notes ? { notes } : {}),
            // Only sent when it differs, so the quoted figure stands by default.
            // Rounded to centavos: the API rejects more than two decimal
            // places, and a number input does not enforce its own step
            // outside a submitting form.
            ...(finalAmount.trim()
              ? { finalAmount: Math.round(Number(finalAmount) * 100) / 100 }
              : {}),
          })
        }
        onDone={onChanged}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`final-${booking.id}`}>
            Final amount{" "}
            <span className="text-muted-foreground font-normal">
              (leave blank to charge the quoted{" "}
              {money(booking.totalAmount, booking.currency)})
            </span>
          </Label>
          <Input
            id={`final-${booking.id}`}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={finalAmount}
            onChange={(event) => setFinalAmount(event.target.value)}
            placeholder={booking.totalAmount}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "reschedule"}
        onOpenChange={(open) => setDialog(open ? "reschedule" : null)}
        title="Move this booking?"
        description={
          <>
            Currently {formatDateTime(booking.scheduledStart)}. The other party
            is notified of the new time.
          </>
        }
        confirmLabel="Save new time"
        onConfirm={async () => {
          // datetime-local yields "" when cleared, and new Date("") is an
          // Invalid Date whose toISOString() throws.
          const when = new Date(newStart);
          if (!newStart || Number.isNaN(when.getTime())) {
            setScheduleProblem("Pick a date and time.");
            throw new Error("Pick a date and time.");
          }
          if (when.getTime() < Date.now()) {
            setScheduleProblem("That time has already passed.");
            throw new Error("That time has already passed.");
          }
          setScheduleProblem(null);
          return bookings.update(booking.id, {
            scheduledStart: when.toISOString(),
          });
        }}
        onDone={onChanged}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`reschedule-${booking.id}`}>New date and time</Label>
          <Input
            id={`reschedule-${booking.id}`}
            type="datetime-local"
            value={newStart}
            min={toDateTimeInputValue(new Date())}
            onChange={(event) => {
              setNewStart(event.target.value);
              setScheduleProblem(null);
            }}
            aria-invalid={!!scheduleProblem || undefined}
            aria-describedby={`reschedule-hint-${booking.id}`}
          />
          {scheduleProblem ? (
            <p
              id={`reschedule-hint-${booking.id}`}
              className="text-destructive text-sm"
            >
              {scheduleProblem}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
        title="Cancel this booking?"
        description="The other party is notified, and the reason you give is shown to them. This cannot be undone."
        confirmLabel="Cancel booking"
        destructive
        reason={{
          label: "Why are you cancelling?",
          placeholder: "Be specific. The other party sees this.",
          minLength: 5,
        }}
        onConfirm={(reason) => bookings.cancel(booking.id, reason)}
        onDone={onChanged}
      />

      <ConfirmDialog
        open={dialog === "dispute"}
        onOpenChange={(open) => setDialog(open ? "dispute" : null)}
        title="Raise a dispute"
        description="An administrator reviews the booking and decides. The booking is marked disputed while they do."
        confirmLabel="Raise dispute"
        destructive
        reason={{
          label: "What went wrong?",
          placeholder:
            "What was agreed, what happened instead, and what you want done about it.",
          minLength: 20,
        }}
        onConfirm={(details) =>
          disputes.create({
            bookingId: booking.id,
            // The API wants a short reason as well as the full details. The
            // first line is the most honest summary, but it has to clear the
            // API's own 5-character minimum, which "Bad." would not.
            reason: summarise(details),
            details,
          })
        }
        onDone={onChanged}
      />

      <ReviewDialog
        open={dialog === "review"}
        onOpenChange={(open) => setDialog(open ? "review" : null)}
        bookingId={booking.id}
        providerName={booking.provider.businessName}
        onDone={onChanged}
      />
    </article>
  );
}
